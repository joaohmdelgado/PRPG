import fs from 'fs/promises';
import request from 'supertest';
import { describe, it, expect, beforeEach, afterEach, afterAll } from 'vitest';
import { pool } from '../db/pool.js';
import { app } from '../app.js';
import { resetDb, seedAdmin, seedUserComPessoa, loginAdmin } from './helpers.js';

// B.11: as migrações rodam como no migrateRunner — uma transação por arquivo.
const ler = (nome) => fs.readFile(new URL(`../db/migrations/${nome}`, import.meta.url), 'utf8');
const rodar = async (nome) => {
  const sql = await ler(nome);
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    await c.query(sql);
    await c.query('COMMIT');
  } catch (e) {
    await c.query('ROLLBACK');
    throw e;
  } finally {
    c.release();
  }
};

beforeEach(async () => { await resetDb(); await seedAdmin(); });
afterAll(async () => { await pool.end(); });

// B.13 / G1: os testes da migração A (b11a) saíram com a Task 10 — ela lê
// users.perfil_*/acad_*, que não existem mais no schema.sql final; o banco novo a
// adota pelo baseline do migrateRunner (migrateRunner.test.js).

const MIG_B = '2026-09-30_b11b_fk_vinculos_pessoa.sql';
const semFks = () => pool.query(`
  ALTER TABLE vinculos DROP CONSTRAINT IF EXISTS vinculos_pessoa_id_fkey;
  ALTER TABLE camara_relatorias DROP CONSTRAINT IF EXISTS camara_relatorias_relator_id_fkey`);
// Os outros arquivos de teste contam com as FKs: devolve-as sempre.
const MIG_C = '2026-09-30_b12_inscricoes_aluno_pessoa.sql';
afterEach(async () => { await resetDb(); await rodar(MIG_B); await rodar(MIG_C); });

describe('B.11 migração B — pessoas.id e FKs', () => {
  it('troca users.id por pessoas.id e cria as FKs com RESTRICT', async () => {
    await semFks();
    const ana = await seedUserComPessoa({ id: 'u-ana', email: 'ana@t.br', nome: 'Ana' });
    await pool.query(`INSERT INTO pessoas (id, nome) VALUES ('pes-sem', 'Sem Login')`);
    await pool.query(`INSERT INTO vinculos (id, pessoa_id, papel) VALUES ('v-u', 'u-ana', 'DOCENTE_PERMANENTE'), ('v-p', 'pes-sem', 'SECRETARIO')`);
    const token = await loginAdmin();
    const proc = await request(app).post('/api/camara/processos').set('Authorization', `Bearer ${token}`)
      .send({ numero: '23082.000012/2026-11', assunto: 'B.11' });
    await pool.query(`INSERT INTO camara_relatorias (id, processo_id, relator_id, relator_nome, ativa) VALUES ('rel-1', $1, 'u-ana', 'Ana', TRUE)`, [proc.body.id]);

    await rodar(MIG_B);

    expect((await pool.query('SELECT id, pessoa_id FROM vinculos ORDER BY id')).rows).toEqual([
      { id: 'v-p', pessoa_id: 'pes-sem' }, { id: 'v-u', pessoa_id: ana.pessoaId },
    ]);
    expect((await pool.query('SELECT relator_id FROM camara_relatorias')).rows).toEqual([{ relator_id: ana.pessoaId }]);
    const { rows: fks } = await pool.query(`SELECT conname, confdeltype FROM pg_constraint
      WHERE conname IN ('vinculos_pessoa_id_fkey', 'camara_relatorias_relator_id_fkey') ORDER BY conname`);
    expect(fks).toEqual([
      { conname: 'camara_relatorias_relator_id_fkey', confdeltype: 'r' },
      { conname: 'vinculos_pessoa_id_fkey', confdeltype: 'r' },
    ]);
    await expect(pool.query(`DELETE FROM pessoas WHERE id = 'pes-sem'`)).rejects.toThrow(/vinculos_pessoa_id_fkey/);
  });

  it('aborta inteira, sem mudar nada, se sobrar id que não é de ninguém', async () => {
    await semFks();
    await seedUserComPessoa({ id: 'u-ana', email: 'ana@t.br', nome: 'Ana' });
    await pool.query(`INSERT INTO vinculos (id, pessoa_id, papel) VALUES ('v-u', 'u-ana', 'DOCENTE_PERMANENTE'), ('v-x', 'fantasma', 'SECRETARIO')`);
    await expect(rodar(MIG_B)).rejects.toThrow(/vinculos v-x -> fantasma/);
    expect((await pool.query('SELECT id, pessoa_id FROM vinculos ORDER BY id')).rows).toEqual([
      { id: 'v-u', pessoa_id: 'u-ana' }, { id: 'v-x', pessoa_id: 'fantasma' },
    ]);
  });
});

describe('B.12 migração — inscricoes_proficiencia.aluno_pessoa_id', () => {
  // Volta a tabela ao estado de antes da B.12: coluna aluno_id, sem FK.
  const estadoAntigo = () => pool.query(`
    ALTER TABLE inscricoes_proficiencia DROP CONSTRAINT IF EXISTS inscricoes_proficiencia_aluno_pessoa_id_fkey;
    ALTER TABLE inscricoes_proficiencia RENAME COLUMN aluno_pessoa_id TO aluno_id`);
  const inscricao = (id, alunoId) => pool.query(
    `INSERT INTO inscricoes_proficiencia (id, aluno_id, nome, status) VALUES ($1, $2, 'Nome', 'INSCRITO')`, [id, alunoId]
  );

  it('troca o users.id pelo pessoas.id, zera o aluno que sumiu e cria a FK com SET NULL', async () => {
    await estadoAntigo();
    const ana = await seedUserComPessoa({ id: 'u-ana', email: 'ana@t.br', nome: 'Ana', roles: ['Aluno'] });
    await inscricao('i-login', 'u-ana');
    await inscricao('i-anonima', null);
    await inscricao('i-sumiu', 'usuario-excluido-antes');

    await rodar(MIG_C);

    expect((await pool.query('SELECT id, aluno_pessoa_id FROM inscricoes_proficiencia ORDER BY id')).rows).toEqual([
      { id: 'i-anonima', aluno_pessoa_id: null },
      { id: 'i-login', aluno_pessoa_id: ana.pessoaId },
      { id: 'i-sumiu', aluno_pessoa_id: null },
    ]);
    const { rows: fk } = await pool.query(
      "SELECT confdeltype FROM pg_constraint WHERE conname = 'inscricoes_proficiencia_aluno_pessoa_id_fkey'"
    );
    expect(fk).toEqual([{ confdeltype: 'n' }]);
  });

  it('é idempotente', async () => {
    await rodar(MIG_C);
    await rodar(MIG_C);
    const { rows } = await pool.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'inscricoes_proficiencia' AND column_name LIKE 'aluno%'"
    );
    expect(rows).toEqual([{ column_name: 'aluno_pessoa_id' }]);
  });
});
