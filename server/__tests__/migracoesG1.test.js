import { describe, it, expect, beforeEach, afterEach, afterAll } from 'vitest';
import fs from 'fs/promises';
import { pool } from '../db/pool.js';
import { resetDb, seedAdmin, seedUserComPessoa, rodarMigracao } from './helpers.js';

beforeEach(async () => { await resetDb(); await seedAdmin(); });
afterAll(async () => { await pool.end(); });

// B.13 / G1: os testes da g1a saíram com a Task 10 — ela lê users.perfil_*/acad_*/priv_*,
// que não existem mais no schema.sql final; o banco novo a adota pelo baseline do
// migrateRunner (migrateRunner.test.js); um banco existente a roda antes da g1c.

// ---------------------------------------------------------------------
// g1b: user_linhas_pesquisa passa de user_id (login) para pessoa_id (pessoa).
// O banco de teste nasce do schema.sql já no formato novo; para provar a
// conversão, o teste recria a tabela no formato ANTIGO e, no fim (afterEach),
// a devolve ao formato do schema.sql (o bloco é lido do próprio arquivo), para
// não afetar os outros arquivos que compartilham o prpg_test.
// ---------------------------------------------------------------------
const MIG_B = '2026-09-30_g1b_linhas_pesquisa_pessoa.sql';

const blocoDoSchema = async () => {
  const sql = await fs.readFile(new URL('../db/schema.sql', import.meta.url), 'utf8');
  const m = sql.match(/CREATE TABLE IF NOT EXISTS user_linhas_pesquisa \([\s\S]*?\n\);/);
  if (!m) throw new Error('bloco de user_linhas_pesquisa não encontrado no schema.sql');
  return m[0];
};

// Colunas (por nome), PK (na ordem) e FKs (alvo + ON DELETE) da tabela.
const estrutura = async () => {
  const { rows: colunas } = await pool.query(`
    SELECT column_name, data_type, is_nullable FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'user_linhas_pesquisa' ORDER BY column_name`);
  const { rows: [pk] } = await pool.query(`
    SELECT c.conname, array_agg(a.attname::text ORDER BY k.ord) AS colunas
      FROM pg_constraint c
      CROSS JOIN LATERAL unnest(c.conkey) WITH ORDINALITY AS k(attnum, ord)
      JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = k.attnum
     WHERE c.conrelid = 'user_linhas_pesquisa'::regclass AND c.contype = 'p'
     GROUP BY c.conname`);
  const { rows: fks } = await pool.query(`
    SELECT conname, confrelid::regclass::text AS alvo, confdeltype AS ao_apagar
      FROM pg_constraint WHERE conrelid = 'user_linhas_pesquisa'::regclass AND contype = 'f' ORDER BY conname`);
  return { colunas, pk, fks };
};

describe('G1 migração g1b — user_linhas_pesquisa por pessoa', () => {
  afterEach(async () => {
    await pool.query(`DROP TABLE IF EXISTS user_linhas_pesquisa; ${await blocoDoSchema()}`);
    // O login sem pessoa do 2º teste só existe com users.pessoa_id anulável (antes da g1c).
    await pool.query('DELETE FROM users WHERE pessoa_id IS NULL; ALTER TABLE users ALTER COLUMN pessoa_id SET NOT NULL');
  });

  it('o schema.sql já está no formato novo e a migração não faz nada nele (idempotente)', async () => {
    const antes = await estrutura();
    expect(antes.colunas.map((c) => c.column_name)).toEqual(['linha_id', 'pessoa_id']);
    expect(antes.pk.colunas).toEqual(['pessoa_id', 'linha_id']);
    expect(antes.fks).toEqual([
      { conname: 'user_linhas_pesquisa_linha_id_fkey', alvo: 'linhas_pesquisa', ao_apagar: 'c' },
      { conname: 'user_linhas_pesquisa_pessoa_id_fkey', alvo: 'pessoas', ao_apagar: 'c' },
    ]);
    const { pessoaId } = await seedUserComPessoa({ id: 'u-n', email: 'n@t.br', nome: 'Nova' });
    const { rows: [l] } = await pool.query(`INSERT INTO linhas_pesquisa (nome) VALUES ('L') RETURNING id`);
    await pool.query('INSERT INTO user_linhas_pesquisa (pessoa_id, linha_id) VALUES ($1, $2)', [pessoaId, l.id]);
    await rodarMigracao(MIG_B);
    await rodarMigracao(MIG_B);
    expect(await estrutura()).toEqual(antes);
    expect((await pool.query('SELECT pessoa_id, linha_id FROM user_linhas_pesquisa')).rows)
      .toEqual([{ pessoa_id: pessoaId, linha_id: l.id }]);
  });

  it('converte a tabela antiga (user_id): dados por pessoa, PK e FK para pessoas com CASCADE', async () => {
    const formatoNovo = await estrutura();
    await pool.query(`DROP TABLE user_linhas_pesquisa;
      CREATE TABLE user_linhas_pesquisa (
        user_id  TEXT    REFERENCES users(id)           ON DELETE CASCADE,
        linha_id INTEGER REFERENCES linhas_pesquisa(id) ON DELETE CASCADE,
        PRIMARY KEY (user_id, linha_id))`);
    const ana = await seedUserComPessoa({ id: 'u-ana', email: 'ana@t.br', nome: 'Ana' });
    const beto = await seedUserComPessoa({ id: 'u-beto', email: 'beto@t.br', nome: 'Beto' });
    // Login sem pessoa (não existe depois da B.11, mas a migração não pode falhar com ele).
    // A g1b roda antes da g1c, quando users.pessoa_id ainda aceita NULL.
    await pool.query('ALTER TABLE users ALTER COLUMN pessoa_id DROP NOT NULL');
    await pool.query(`INSERT INTO users (id, email, password_hash, pessoa_id) VALUES ('u-sem', 'sem@t.br', 'x', NULL)`);
    const { rows: ls } = await pool.query(
      `INSERT INTO linhas_pesquisa (nome) VALUES ('L1'), ('L2'), ('L3') RETURNING id`);
    const [l1, l2, l3] = ls.map((r) => r.id);
    await pool.query(`INSERT INTO user_linhas_pesquisa (user_id, linha_id) VALUES
      ('u-ana', $1), ('u-ana', $2), ('u-beto', $2), ('u-beto', $3), ('u-sem', $1)`, [l1, l2, l3]);

    await rodarMigracao(MIG_B);

    expect(await estrutura()).toEqual(formatoNovo);
    const { rows } = await pool.query('SELECT pessoa_id, linha_id FROM user_linhas_pesquisa ORDER BY linha_id, pessoa_id');
    const esperado = [
      { pessoa_id: ana.pessoaId, linha_id: l1 }, { pessoa_id: ana.pessoaId, linha_id: l2 },
      { pessoa_id: beto.pessoaId, linha_id: l2 }, { pessoa_id: beto.pessoaId, linha_id: l3 },
    ].sort((a, b) => a.linha_id - b.linha_id || a.pessoa_id.localeCompare(b.pessoa_id));
    expect(rows).toEqual(esperado); // a linha do login sem pessoa foi descartada

    // Rodar de novo (já no formato novo) não muda nada.
    await rodarMigracao(MIG_B);
    expect((await pool.query('SELECT count(*)::int AS n FROM user_linhas_pesquisa')).rows[0].n).toBe(4);

    // Apagar a pessoa apaga as linhas dela (e só as dela).
    await pool.query('DELETE FROM pessoas WHERE id = $1', [beto.pessoaId]);
    expect((await pool.query('SELECT DISTINCT pessoa_id FROM user_linhas_pesquisa')).rows)
      .toEqual([{ pessoa_id: ana.pessoaId }]);
  });
});

// ---------------------------------------------------------------------
// g1c (FORWARD-ONLY): remove de users a cópia legada do dado da pessoa e torna
// users.pessoa_id NOT NULL. O prpg_test nasce do schema.sql final (sem as colunas);
// para provar a remoção, o teste as recria e preenche, e o afterEach devolve users
// ao formato final (sem as colunas, pessoa_id NOT NULL) para os outros arquivos.
// ---------------------------------------------------------------------
const MIG_C = '2026-09-30_g1c_remove_colunas_users.sql';
const COLUNAS_LEGADAS = [
  ['priv_mostrar_email', 'BOOLEAN DEFAULT FALSE'], ['priv_mostrar_telefone', 'BOOLEAN DEFAULT FALSE'],
  ['perfil_nome', 'TEXT'], ['perfil_cpf', 'TEXT'], ['perfil_siape', 'TEXT'], ['perfil_foto_url', 'TEXT'],
  ['perfil_telefones', "TEXT[] DEFAULT '{}'"], ['acad_lattes', 'TEXT'], ['acad_orcid', 'TEXT'],
  ['acad_google_scholar', 'TEXT'], ['acad_publons', 'TEXT'], ['perfil_aluno', 'JSONB'], ['perfil_professor', 'JSONB'],
];
const CREDENCIAL = ['atualizado_em', 'atualizado_por', 'criado_em', 'criado_por', 'email', 'id', 'password_hash',
  'pessoa_id', 'programa_id', 'roles', 'senha_temporaria'];

const colunasDeUsers = async () => (await pool.query(`
  SELECT column_name, is_nullable FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'users' ORDER BY column_name`)).rows;

// users como estava antes da g1c: as 13 colunas de volta e pessoa_id anulável.
const formatoAntigo = () => pool.query(`
  ALTER TABLE users ${COLUNAS_LEGADAS.map(([c, t]) => `ADD COLUMN IF NOT EXISTS ${c} ${t}`).join(', ')};
  ALTER TABLE users ALTER COLUMN pessoa_id DROP NOT NULL`);

describe('G1 migração g1c — users só credencial', () => {
  afterEach(async () => {
    await pool.query(`
      DELETE FROM users WHERE pessoa_id IS NULL;
      ALTER TABLE users ${COLUNAS_LEGADAS.map(([c]) => `DROP COLUMN IF EXISTS ${c}`).join(', ')};
      ALTER TABLE users ALTER COLUMN pessoa_id SET NOT NULL`);
  });

  it('o schema.sql já está no formato final e a migração não faz nada nele (idempotente)', async () => {
    const antes = await colunasDeUsers();
    expect(antes.map((c) => c.column_name)).toEqual(CREDENCIAL);
    expect(antes.find((c) => c.column_name === 'pessoa_id').is_nullable).toBe('NO');
    await rodarMigracao(MIG_C);
    await rodarMigracao(MIG_C);
    expect(await colunasDeUsers()).toEqual(antes);
  });

  it('remove as 13 colunas e torna pessoa_id NOT NULL, sem tocar na pessoa nem na credencial', async () => {
    const formatoFinal = await colunasDeUsers();
    await formatoAntigo();
    const { usuarioId, pessoaId } = await seedUserComPessoa({ id: 'u-c', email: 'c@t.br', nome: 'Carla', roles: ['Aluno'] });
    await pool.query(`UPDATE users SET perfil_nome = 'Carla', perfil_cpf = '52998224725', acad_lattes = 'http://l',
        perfil_telefones = '{81 9}', priv_mostrar_email = TRUE, perfil_aluno = '{"sexo":"Feminino"}' WHERE id = $1`, [usuarioId]);
    expect((await colunasDeUsers()).length).toBe(CREDENCIAL.length + COLUNAS_LEGADAS.length);
    const credencialAntes = (await pool.query('SELECT id, email, password_hash, roles, pessoa_id FROM users ORDER BY id')).rows;

    await rodarMigracao(MIG_C);

    expect(await colunasDeUsers()).toEqual(formatoFinal);
    expect((await pool.query('SELECT id, email, password_hash, roles, pessoa_id FROM users ORDER BY id')).rows)
      .toEqual(credencialAntes);
    expect((await pool.query('SELECT nome FROM pessoas WHERE id = $1', [pessoaId])).rows).toEqual([{ nome: 'Carla' }]);
    await expect(pool.query(`INSERT INTO users (id, email, password_hash) VALUES ('u-x', 'x@t.br', 'x')`))
      .rejects.toThrow(/pessoa_id/);
  });

  it('aborta inteira, sem mudar nada, se houver login sem pessoa', async () => {
    await formatoAntigo();
    await seedUserComPessoa({ id: 'u-c', email: 'c@t.br', nome: 'Carla' });
    await pool.query(`UPDATE users SET perfil_nome = 'Carla' WHERE id = 'u-c'`);
    await pool.query(`INSERT INTO users (id, email, password_hash, pessoa_id) VALUES ('u-sem', 'sem@t.br', 'x', NULL)`);
    const antes = await colunasDeUsers();

    await expect(rodarMigracao(MIG_C)).rejects.toThrow(/1 usuário\(s\) sem pessoa_id/);

    expect(await colunasDeUsers()).toEqual(antes);
    expect(antes.find((c) => c.column_name === 'pessoa_id').is_nullable).toBe('YES');
    expect((await pool.query(`SELECT perfil_nome FROM users WHERE id = 'u-c'`)).rows).toEqual([{ perfil_nome: 'Carla' }]);
  });
});
