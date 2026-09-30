import fs from 'fs/promises';
import request from 'supertest';
import { describe, it, expect, beforeEach, afterEach, afterAll } from 'vitest';
import { pool } from '../db/pool.js';
import { app } from '../app.js';
import { resetDb, seedAdmin, seedUser, seedUserComPessoa, loginAdmin } from './helpers.js';

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
const MIG_A = '2026-09-30_b11a_pessoas_de_usuarios.sql';

beforeEach(async () => { await resetDb(); await seedAdmin(); });
afterAll(async () => { await pool.end(); });

describe('B.11 migração A — pessoa para todo usuário e reconciliação', () => {
  it('cria pessoa para quem não tem; o usuário vence, menos na foto', async () => {
    await seedUser({ id: 'u-sem', email: 'sem@t.br', perfil_geral: { nome: 'Sem Pessoa' } });
    await pool.query(`UPDATE users SET pessoa_id = NULL WHERE id = 'u-sem'`);
    await seedUser({ id: 'u-com', email: 'com@t.br', perfil_geral: { nome: 'Nome Novo', foto_url: '/uploads/painel.jpg' } });
    // Simula a deriva de antes da Task 2: edições que ficaram só em `users`.
    await pool.query(`UPDATE users SET acad_lattes = 'http://lattes/novo' WHERE id = 'u-com'`);
    await pool.query(`UPDATE pessoas SET nome = 'Nome Antigo', foto_url = '/uploads/estrutura.jpg', lattes = 'http://lattes/velho'
                       WHERE id = (SELECT pessoa_id FROM users WHERE id = 'u-com')`);

    await rodar(MIG_A);

    const { rows } = await pool.query(
      `SELECT u.id, p.nome, p.foto_url, p.lattes FROM users u JOIN pessoas p ON p.id = u.pessoa_id
        WHERE u.id IN ('u-com', 'u-sem') ORDER BY u.id`
    );
    expect(rows).toEqual([
      { id: 'u-com', nome: 'Nome Novo', foto_url: '/uploads/estrutura.jpg', lattes: 'http://lattes/novo' },
      { id: 'u-sem', nome: 'Sem Pessoa', foto_url: null, lattes: null },
    ]);
  });

  it('é idempotente', async () => {
    await seedUser({ id: 'u-sem', email: 'sem@t.br', perfil_geral: { nome: 'Sem Pessoa' } });
    await pool.query(`UPDATE users SET pessoa_id = NULL WHERE id = 'u-sem'`);
    await rodar(MIG_A);
    const antes = (await pool.query('SELECT count(*)::int AS n FROM pessoas')).rows[0].n;
    await rodar(MIG_A);
    expect((await pool.query('SELECT count(*)::int AS n FROM pessoas')).rows[0].n).toBe(antes);
  });
});

const MIG_B = '2026-09-30_b11b_fk_vinculos_pessoa.sql';
const semFks = () => pool.query(`
  ALTER TABLE vinculos DROP CONSTRAINT IF EXISTS vinculos_pessoa_id_fkey;
  ALTER TABLE camara_relatorias DROP CONSTRAINT IF EXISTS camara_relatorias_relator_id_fkey`);
// Os outros arquivos de teste contam com as FKs: devolve-as sempre.
afterEach(async () => { await resetDb(); await rodar(MIG_B); });

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
