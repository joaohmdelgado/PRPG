import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';
import { pool } from '../db/pool.js';
import { resetDb, seedAdmin, seedUser, seedUserComPessoa, loginAdmin, login } from './helpers.js';
import {
  joinPessoa, pessoaReal, doUsuario, idsDaMesmaPessoa, nomePessoa,
} from '../db/identidadeVinculo.js';

// B.11 (docs/analise-fk-vinculos-pessoa-id-b3.md). Durante a transição cada
// caso roda com o vínculo gravado pelo users.id (legado) e pelo pessoas.id; a
// Task 10 (FK) deixa só 'pessoa'.
const FORMAS = ['usuario', 'pessoa'];
const gravado = (forma, pessoa) => (forma === 'usuario' ? pessoa.usuarioId : pessoa.pessoaId);
const vincular = (id, pessoaIdGravado, papel, programaId = 'prog-1') => pool.query(
  `INSERT INTO vinculos (id, programa_id, pessoa_id, papel, ativo, criado_em) VALUES ($1, $2, $3, $4, TRUE, now())`,
  [id, programaId, pessoaIdGravado, papel]
);

let token;
beforeEach(async () => {
  await resetDb();
  await seedAdmin();
  await pool.query(`INSERT INTO programas (id, nome, sigla, slug) VALUES ('prog-1', 'Programa Um', 'PU', 'pu')`);
  token = await loginAdmin();
});
afterAll(async () => { await pool.end(); });
const asAdmin = (req) => req.set('Authorization', `Bearer ${token}`);

describe.each(FORMAS)('B.11 identidadeVinculo — vínculo gravado por %s', (forma) => {
  it('joinPessoa acha login e pessoa; pessoaReal devolve o pessoas.id', async () => {
    const ana = await seedUserComPessoa({ id: 'u-ana', email: 'ana@t.br', nome: 'Ana' });
    await vincular('v1', gravado(forma, ana), 'DOCENTE_PERMANENTE');
    const { rows } = await pool.query(
      `SELECT u.id AS usuario_id, p.id AS pessoa_id, ${pessoaReal('v.pessoa_id')} AS real, ${nomePessoa()} AS nome
         FROM vinculos v ${joinPessoa('v.pessoa_id')}`
    );
    expect(rows).toEqual([{ usuario_id: 'u-ana', pessoa_id: ana.pessoaId, real: ana.pessoaId, nome: 'Ana' }]);
  });

  it('doUsuario casa o vínculo com o usuário', async () => {
    const ana = await seedUserComPessoa({ id: 'u-ana', email: 'ana@t.br', nome: 'Ana' });
    await vincular('v1', gravado(forma, ana), 'DOCENTE_PERMANENTE');
    const { rows } = await pool.query(
      `SELECT v.id FROM vinculos v JOIN users u ON ${doUsuario('v.pessoa_id')} WHERE u.id = 'u-ana'`
    );
    expect(rows.map((r) => r.id)).toEqual(['v1']);
  });
});

describe('B.11 identidadeVinculo — casos fixos', () => {
  it('pessoa sem login: usuario nulo, nome da pessoa', async () => {
    await pool.query(`INSERT INTO pessoas (id, nome) VALUES ('pes-sem', 'Sem Login')`);
    await vincular('v1', 'pes-sem', 'SECRETARIO');
    const { rows } = await pool.query(
      `SELECT u.id AS usuario_id, ${nomePessoa()} AS nome FROM vinculos v ${joinPessoa('v.pessoa_id')}`
    );
    expect(rows).toEqual([{ usuario_id: null, nome: 'Sem Login' }]);
  });

  it('idsDaMesmaPessoa parte de qualquer um dos dois ids', async () => {
    const ana = await seedUserComPessoa({ id: 'u-ana', email: 'ana@t.br', nome: 'Ana' });
    const esperado = [ana.pessoaId, 'u-ana'].sort();
    expect((await idsDaMesmaPessoa('u-ana')).sort()).toEqual(esperado);
    expect((await idsDaMesmaPessoa(ana.pessoaId)).sort()).toEqual(esperado);
    expect(await idsDaMesmaPessoa('ninguem')).toEqual(['ninguem']);
    expect(await idsDaMesmaPessoa(null)).toEqual([]);
  });
});
