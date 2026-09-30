import { describe, it, expect, beforeEach, afterAll } from 'vitest';
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
