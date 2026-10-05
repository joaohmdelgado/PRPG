import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';
import { pool } from '../db/pool.js';
import { resetDb, seedAdmin, loginAdmin, login, seedUser } from './helpers.js';
import { SENHA_PADRAO } from '../services/senhaPadrao.js';

// AUTH-02 (docs/analise-prontidao-producao-2026-09-09.md): a senha provisória é
// imposta pela API, não só pelo painel.
let adminToken;

beforeEach(async () => {
  await resetDb();
  await seedAdmin();
  adminToken = await loginAdmin();
});
afterAll(async () => { await pool.end(); });

const como = (token) => (req) => req.set('Authorization', `Bearer ${token}`);
const marcarProvisoria = (id) => pool.query('UPDATE users SET senha_temporaria = TRUE WHERE id = $1', [id]);

const gestorProvisorio = async () => {
  await seedUser({ id: 'g-prov', email: 'g@t.br', roles: ['Gestor'], password: SENHA_PADRAO, perfil_geral: { nome: 'G' } });
  await marcarProvisoria('g-prov');
  return login('g@t.br', SENHA_PADRAO);
};

describe('senha provisória imposta pela API', () => {
  it('bloqueia as demais rotas com 403 SENHA_TEMPORARIA', async () => {
    const token = await gestorProvisorio();
    const res = await como(token)(request(app).get('/api/users'));
    expect(res.status).toBe(403);
    expect(res.body.codigo).toBe('SENHA_TEMPORARIA');

    const edicao = await como(token)(request(app).put('/api/minha-conta')).send({ telefones: ['81 3320-6000'] });
    expect(edicao.status).toBe(403);
  });

  it('libera ver a própria conta', async () => {
    const token = await gestorProvisorio();
    const res = await como(token)(request(app).get('/api/minha-conta'));
    expect(res.status).toBe(200);
    expect(res.body.conta.senhaTemporaria).toBe(true);
  });

  it('PUT no próprio usuário só passa com a senha sozinha', async () => {
    const token = await gestorProvisorio();
    const comPapel = await como(token)(request(app).put('/api/users/g-prov')).send({ password: 'novaSenhaForte9', roles: ['Administrator'] });
    expect(comPapel.status).toBe(403);
    const outroUsuario = await como(token)(request(app).put('/api/users/admin-test')).send({ password: 'novaSenhaForte9' });
    expect(outroUsuario.status).toBe(403);

    const troca = await como(token)(request(app).put('/api/users/g-prov')).send({ password: 'novaSenhaForte9' });
    expect(troca.status).toBe(200);
    // O mesmo token passa a valer: a flag é lida do banco a cada requisição.
    expect((await como(token)(request(app).get('/api/users'))).status).toBe(200);
  });

  it('a troca recusa a senha padrão e senha curta', async () => {
    const token = await gestorProvisorio();
    const padrao = await como(token)(request(app).put('/api/users/g-prov')).send({ password: SENHA_PADRAO });
    expect(padrao.status).toBe(400);
    const curta = await como(token)(request(app).put('/api/users/g-prov')).send({ password: 'abc' });
    expect(curta.status).toBe(400);

    const viaConta = await como(token)(request(app).put('/api/minha-conta/senha'))
      .send({ senhaAtual: SENHA_PADRAO, novaSenha: SENHA_PADRAO });
    expect(viaConta.status).toBe(400);
    expect((await como(token)(request(app).get('/api/users'))).status).toBe(403);
  });

  it('PUT /minha-conta/senha também libera a conta', async () => {
    const token = await gestorProvisorio();
    const res = await como(token)(request(app).put('/api/minha-conta/senha'))
      .send({ senhaAtual: SENHA_PADRAO, novaSenha: 'novaSenhaForte9' });
    expect(res.status).toBe(200);
    expect((await como(token)(request(app).get('/api/users'))).status).toBe(200);
  });

  it('reset pelo admin tranca uma sessão já aberta', async () => {
    await seedUser({ id: 'g-ok', email: 'ok@t.br', roles: ['Gestor'], password: 'senhaBoa123', perfil_geral: { nome: 'Ok' } });
    const token = await login('ok@t.br', 'senhaBoa123');
    expect((await como(token)(request(app).get('/api/users'))).status).toBe(200);

    const reset = await como(adminToken)(request(app).put('/api/users/g-ok')).send({ password: 'provisoria99' });
    expect(reset.status).toBe(200);
    const depois = await como(token)(request(app).get('/api/users'));
    expect(depois.status).toBe(403);
    expect(depois.body.codigo).toBe('SENHA_TEMPORARIA');
  });

  it('token de conta excluída deixa de valer', async () => {
    await seedUser({ id: 'g-del', email: 'del@t.br', roles: ['Gestor'], password: 'senhaBoa123', perfil_geral: { nome: 'Del' } });
    const token = await login('del@t.br', 'senhaBoa123');
    expect((await como(adminToken)(request(app).delete('/api/users/g-del'))).status).toBe(200);
    expect((await como(token)(request(app).get('/api/users'))).status).toBe(401);
  });

  it('rotas públicas tratam o token provisório como anônimo', async () => {
    const criado = await como(adminToken)(request(app).post('/api/programas'))
      .send({ nome: 'PPG Rascunho', sigla: 'pgr', microsite_ativo: false, modalidades: [] });
    const { slug } = criado.body;
    expect((await como(adminToken)(request(app).get(`/api/programas/slug/${slug}`))).status).toBe(200);

    await seedUser({ id: 'a-prov', email: 'a@t.br', roles: ['Administrator'], password: SENHA_PADRAO, perfil_geral: { nome: 'A' } });
    await marcarProvisoria('a-prov');
    const token = await login('a@t.br', SENHA_PADRAO);
    expect((await como(token)(request(app).get(`/api/programas/slug/${slug}`))).status).toBe(404);
  });
});
