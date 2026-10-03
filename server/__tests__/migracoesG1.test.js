import { describe, it, expect, beforeEach, afterEach, afterAll } from 'vitest';
import fs from 'fs/promises';
import { pool } from '../db/pool.js';
import { resetDb, seedAdmin, seedUserComPessoa, rodarMigracao } from './helpers.js';

const MIG = '2026-09-30_g1a_pessoa_e_vinculo_dados.sql';

beforeEach(async () => { await resetDb(); await seedAdmin(); });
afterAll(async () => { await pool.end(); });

const dadosDoVinculo = async (id) => (await pool.query('SELECT dados FROM vinculos WHERE id = $1', [id])).rows[0].dados;

describe('G1 migração g1a', () => {
  it('copia privacidade, sexo, nacionalidade e estrangeiro de users para pessoas (o usuário vence)', async () => {
    const { usuarioId, pessoaId } = await seedUserComPessoa({ id: 'u-a', email: 'a@t.br', nome: 'Ana', roles: ['Aluno'] });
    await pool.query(`UPDATE users SET priv_mostrar_email = TRUE,
        perfil_aluno = '{"sexo":"Feminino","estrangeiro":true,"nacionalidade":"chilena"}' WHERE id = $1`, [usuarioId]);
    await pool.query(`UPDATE pessoas SET sexo = 'Masculino' WHERE id = $1`, [pessoaId]);
    await rodarMigracao(MIG);
    const { rows: [p] } = await pool.query('SELECT sexo, nacionalidade, estrangeiro, priv_mostrar_email, priv_mostrar_telefone FROM pessoas WHERE id = $1', [pessoaId]);
    expect(p).toEqual({ sexo: 'Feminino', nacionalidade: 'chilena', estrangeiro: true, priv_mostrar_email: true, priv_mostrar_telefone: false });
  });

  it('aluno: monta vinculos.dados (egresso guarda o nivel; placeholder de qualificacao e orientador)', async () => {
    const { usuarioId, pessoaId } = await seedUserComPessoa({ id: 'u-e', email: 'e@t.br', nome: 'Egr', roles: ['Aluno'] });
    const { pessoaId: orientadorPessoaId } = await seedUserComPessoa({ id: 'u-orient', email: 'o@t.br', nome: 'Orientador' });
    await pool.query(`INSERT INTO vinculos (id, pessoa_id, papel, ativo) VALUES ('v-e', $1, 'EGRESSO', TRUE), ('v-m', $1, 'DISCENTE_MESTRADO', TRUE)`, [pessoaId]);
    await pool.query(`UPDATE users SET perfil_aluno = $2 WHERE id = $1`, [usuarioId, JSON.stringify({
      nivel: 'Doutor', entrada: '2019.1', situacao: 'Egresso', qualificacao: '2020-10-29', defesa: '2023-03-03',
      egresso: true, orientador_id: 'u-orient', uid_legado: '158', origem_import: 'profiap' })]);
    await rodarMigracao(MIG);
    expect(await dadosDoVinculo('v-e')).toEqual({
      nivel: 'DOUTORADO', entrada: '2019.1', situacao: 'Egresso', defesa: '2023-03-03', egresso: true,
      orientador_pessoa_id: orientadorPessoaId, uid_legado: '158', origem_import: 'profiap' });
    // vínculo de aluno matriculado: o nível é o papel, então `nivel` não entra
    expect((await dadosDoVinculo('v-m')).nivel).toBeUndefined();
  });

  it('professor: só uid_legado e origem_import entram em vinculos.dados', async () => {
    const { usuarioId, pessoaId } = await seedUserComPessoa({ id: 'u-p', email: 'p@t.br', nome: 'Prof' });
    await pool.query(`INSERT INTO vinculos (id, pessoa_id, papel, ativo) VALUES ('v-p', $1, 'DOCENTE_PERMANENTE', TRUE)`, [pessoaId]);
    await pool.query(`UPDATE users SET perfil_professor = '{"tipo":"Permanente","programas":["x"],"uid_legado":"103","origem_import":"profiap"}' WHERE id = $1`, [usuarioId]);
    await rodarMigracao(MIG);
    expect(await dadosDoVinculo('v-p')).toEqual({ uid_legado: '103', origem_import: 'profiap' });
  });

  it('é idempotente e não toca em quem não tem perfil', async () => {
    const { pessoaId } = await seedUserComPessoa({ id: 'u-x', email: 'x@t.br', nome: 'Sem perfil', roles: ['Gestor'] });
    await pool.query(`INSERT INTO vinculos (id, pessoa_id, papel, ativo) VALUES ('v-x', $1, 'SECRETARIO', TRUE)`, [pessoaId]);
    await rodarMigracao(MIG);
    await rodarMigracao(MIG);
    expect(await dadosDoVinculo('v-x')).toBeNull();
  });
});

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
