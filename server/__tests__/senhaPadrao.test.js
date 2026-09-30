import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { app } from '../app.js';
import { pool } from '../db/pool.js';
import { resetDb, seedAdmin, seedUser } from './helpers.js';
import alunosImporter from '../services/importers/alunosImporter.js';
import professoresImporter from '../services/importers/professoresImporter.js';
import {
  SENHA_PADRAO, localizarContasComSenhaPadrao, marcarSenhaTemporaria,
} from '../services/senhaPadrao.js';

beforeEach(async () => {
  await resetDb();
  await seedAdmin();
  await pool.query(`INSERT INTO programas (id, nome, sigla, slug) VALUES ('prog-1', 'Programa Um', 'PU', 'pu')`);
});
afterAll(async () => { await pool.end(); });

const entrar = (email, password) => request(app).post('/api/login').send({ username: email, password });
const flagNoBanco = async (email) => (await pool.query(
  'SELECT senha_temporaria FROM users WHERE email = $1', [email]
)).rows[0].senha_temporaria;
const opcoes = { programaId: 'prog-1', actor: 'admin-test', dryRun: false };

describe('importadores legados — senha padrão é provisória', () => {
  it('aluno importado nasce com senha_temporaria e o login exige a troca', async () => {
    const m = alunosImporter.map({ name: [{ value: 'Bia' }], mail: [{ value: 'bia@t.br' }] });
    const r = await alunosImporter.importOne(m, opcoes);
    expect(r.acao).toBe('criado');

    expect(await flagNoBanco('bia@t.br')).toBe(true);
    const res = await entrar('bia@t.br', SENHA_PADRAO);
    expect(res.status).toBe(200);
    expect(res.body.senhaTemporaria).toBe(true);
  });

  it('professor importado nasce com senha_temporaria e o login exige a troca', async () => {
    const m = professoresImporter.map({ name: [{ value: 'Ana' }], mail: [{ value: 'ana@t.br' }] });
    const r = await professoresImporter.importOne(m, opcoes);
    expect(r.acao).toBe('criado');

    expect(await flagNoBanco('ana@t.br')).toBe(true);
    const res = await entrar('ana@t.br', SENHA_PADRAO);
    expect(res.status).toBe(200);
    expect(res.body.senhaTemporaria).toBe(true);
  });

  it('a flag persiste entre logins até a pessoa trocar a senha', async () => {
    const m = alunosImporter.map({ name: [{ value: 'Bia' }], mail: [{ value: 'bia@t.br' }] });
    await alunosImporter.importOne(m, opcoes);

    const primeiro = await entrar('bia@t.br', SENHA_PADRAO);
    const segundo = await entrar('bia@t.br', SENHA_PADRAO);
    expect(primeiro.body.senhaTemporaria).toBe(true);
    expect(segundo.body.senhaTemporaria).toBe(true);

    const troca = await request(app).put(`/api/users/${(await pool.query(
      'SELECT id FROM users WHERE email = $1', ['bia@t.br']
    )).rows[0].id}`).set('Authorization', `Bearer ${primeiro.body.token}`).send({ password: 'minhaNovaSenha8' });
    expect(troca.status).toBe(200);

    const depois = await entrar('bia@t.br', 'minhaNovaSenha8');
    expect(depois.body.senhaTemporaria).toBe(false);
  });

  it('reimportar quem já trocou a senha não volta a marcá-la como provisória', async () => {
    const m = alunosImporter.map({ name: [{ value: 'Bia' }], mail: [{ value: 'bia@t.br' }] });
    await alunosImporter.importOne(m, opcoes);
    await pool.query(
      'UPDATE users SET password_hash = $1, senha_temporaria = FALSE WHERE email = $2',
      [await bcrypt.hash('minhaNovaSenha8', 4), 'bia@t.br']
    );

    const r = await alunosImporter.importOne(m, opcoes);
    expect(r.acao).toBe('atualizado');
    expect(await flagNoBanco('bia@t.br')).toBe(false);
    expect((await entrar('bia@t.br', 'minhaNovaSenha8')).body.senhaTemporaria).toBe(false);
  });
});

describe('varredura de contas com a senha padrão', () => {
  const semFlag = async (id, email, senha) => {
    await seedUser({ id, email, roles: ['Aluno'], password: senha });
    await pool.query('UPDATE users SET senha_temporaria = FALSE WHERE id = $1', [id]);
  };

  it('acha só as contas com a senha padrão ainda não marcadas e as marca', async () => {
    await semFlag('u-padrao', 'padrao@t.br', SENHA_PADRAO);
    await semFlag('u-outra', 'outra@t.br', 'senhaDiferente9');
    await seedUser({ id: 'u-ja', email: 'ja@t.br', roles: ['Aluno'], password: SENHA_PADRAO });
    await pool.query('UPDATE users SET senha_temporaria = TRUE WHERE id = $1', ['u-ja']);

    const { achadas } = await localizarContasComSenhaPadrao();
    expect(achadas).toEqual([{ id: 'u-padrao', email: 'padrao@t.br' }]);

    // Localizar sozinho (simulação) não grava nada.
    expect(await flagNoBanco('padrao@t.br')).toBe(false);

    expect(await marcarSenhaTemporaria(achadas.map((c) => c.id))).toBe(1);
    expect(await flagNoBanco('padrao@t.br')).toBe(true);
    expect(await flagNoBanco('outra@t.br')).toBe(false);
    expect((await entrar('padrao@t.br', SENHA_PADRAO)).body.senhaTemporaria).toBe(true);

    // Idempotente: nada mais a marcar.
    expect((await localizarContasComSenhaPadrao()).achadas).toEqual([]);
    expect(await marcarSenhaTemporaria([])).toBe(0);
  });
});
