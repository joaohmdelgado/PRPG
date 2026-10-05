import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../app.js';
import { pool } from '../db/pool.js';
import { JWT_SECRET } from '../config.js';
import { resetDb, seedAdmin, loginAdmin, login, seedUser } from './helpers.js';

// AUTH-01 (docs/analise-prontidao-producao-2026-09-09.md): trocar a senha
// encerra as outras sessões da conta (users.sessao_versao no token).
let adminToken;

beforeEach(async () => {
  await resetDb();
  await seedAdmin();
  adminToken = await loginAdmin();
  await seedUser({ id: 'u-1', email: 'u1@t.br', roles: ['Aluno'], password: 'senhaVelha123', perfil_geral: { nome: 'U' } });
});
afterAll(async () => { await pool.end(); });

const conta = (token) => request(app).get('/api/minha-conta').set('Authorization', `Bearer ${token}`);

describe('troca de senha encerra as outras sessões', () => {
  it('pela /minha-conta/senha: a sessão que trocou recebe token novo, as demais caem', async () => {
    const celular = await login('u1@t.br', 'senhaVelha123');
    const notebook = await login('u1@t.br', 'senhaVelha123');

    const troca = await request(app).put('/api/minha-conta/senha').set('Authorization', `Bearer ${notebook}`)
      .send({ senhaAtual: 'senhaVelha123', novaSenha: 'senhaNova4567' });
    expect(troca.status).toBe(200);
    expect(troca.body.token).toBeTruthy();

    expect((await conta(celular)).status).toBe(401);
    expect((await conta(notebook)).status).toBe(401);
    expect((await conta(troca.body.token)).status).toBe(200);
  });

  it('pela troca forçada (PUT /users/:id): o token novo vem na resposta', async () => {
    await pool.query('UPDATE users SET senha_temporaria = TRUE WHERE id = $1', ['u-1']);
    const antigo = await login('u1@t.br', 'senhaVelha123');

    const troca = await request(app).put('/api/users/u-1').set('Authorization', `Bearer ${antigo}`)
      .send({ password: 'senhaNova4567' });
    expect(troca.status).toBe(200);
    expect(troca.body.token).toBeTruthy();
    expect(troca.body.password_hash).toBeUndefined();

    expect((await conta(antigo)).status).toBe(401);
    expect((await conta(troca.body.token)).status).toBe(200);
  });

  it('reset feito pelo admin derruba as sessões da pessoa', async () => {
    const sessao = await login('u1@t.br', 'senhaVelha123');
    const reset = await request(app).put('/api/users/u-1').set('Authorization', `Bearer ${adminToken}`)
      .send({ password: 'provisoria99' });
    expect(reset.status).toBe(200);
    expect(reset.body.token).toBeUndefined();

    expect((await conta(sessao)).status).toBe(401);
    expect((await request(app).get('/api/users').set('Authorization', `Bearer ${adminToken}`)).status).toBe(200);
  });

  it('mudar papel sem mexer na senha não derruba a sessão', async () => {
    const sessao = await login('u1@t.br', 'senhaVelha123');
    await request(app).put('/api/users/u-1').set('Authorization', `Bearer ${adminToken}`).send({ roles: ['Aluno'] });
    expect((await conta(sessao)).status).toBe(200);
  });

  it('token emitido antes da versão de sessão (sem sv) segue valendo até a primeira troca', async () => {
    const legado = jwt.sign({ id: 'u-1', email: 'u1@t.br', roles: ['Aluno'], programaId: null }, JWT_SECRET, { expiresIn: '1h' });
    expect((await conta(legado)).status).toBe(200);

    const sessao = await login('u1@t.br', 'senhaVelha123');
    await request(app).put('/api/minha-conta/senha').set('Authorization', `Bearer ${sessao}`)
      .send({ senhaAtual: 'senhaVelha123', novaSenha: 'senhaNova4567' });
    expect((await conta(legado)).status).toBe(401);
  });
});
