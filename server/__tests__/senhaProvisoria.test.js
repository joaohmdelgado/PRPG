import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';
import { pool } from '../db/pool.js';
import { resetDb, seedAdmin, loginAdmin, login } from './helpers.js';

// AUTH-02 (decisão de 05/10/2026): reset gera senha provisória aleatória,
// mostrada uma vez — no lugar da Mudar123 compartilhada.
let admin;
let A;
let B;

const como = (token) => (req) => req.set('Authorization', `Bearer ${token}`);
const programa = async (nome, sigla) => (await como(admin)(request(app).post('/api/programas'))
  .send({ nome, sigla, modalidades: [{ tipo: 'MESTRADO', ano_inicio: 2020, nota_capes: '4' }] })).body.id;
const usuario = async (corpo) => (await como(admin)(request(app).post('/api/users'))
  .send({ password: 'senhaBoa123', perfil_geral: { nome: corpo.email }, ...corpo })).body.id;
const gerar = (token, id) => como(token)(request(app).post(`/api/users/${id}/senha-provisoria`));

beforeEach(async () => {
  await resetDb();
  await seedAdmin();
  admin = await loginAdmin();
  A = await programa('Programa A', 'pga');
  B = await programa('Programa B', 'pgb');
});
afterAll(async () => { await pool.end(); });

describe('senha provisória gerada no painel', () => {
  it('admin gera: derruba as sessões, a nova entra com troca obrigatória, a antiga deixa de valer', async () => {
    const id = await usuario({ email: 'aluno@t.br', roles: ['Aluno'] });
    const sessao = await login('aluno@t.br', 'senhaBoa123');

    const res = await gerar(admin, id);
    expect(res.status).toBe(200);
    expect(res.body.senhaProvisoria).toMatch(/^[A-Za-z2-9]{4}-[A-Za-z2-9]{4}-[A-Za-z2-9]{4}$/);

    expect((await como(sessao)(request(app).get('/api/minha-conta'))).status).toBe(401);
    expect((await request(app).post('/api/login').send({ username: 'aluno@t.br', password: 'senhaBoa123' })).status).toBe(401);
    const entrou = await request(app).post('/api/login').send({ username: 'aluno@t.br', password: res.body.senhaProvisoria });
    expect(entrou.status).toBe(200);
    expect(entrou.body.senhaTemporaria).toBe(true);
  });

  it('gestor de programa gera só para aluno/professor do próprio programa', async () => {
    await usuario({ email: 'gpa@t.br', roles: ['GestorPrograma'], programaId: A });
    const gpa = await login('gpa@t.br', 'senhaBoa123');
    const doA = await usuario({ email: 'a1@t.br', roles: ['Aluno'], programaId: A });
    const doB = await usuario({ email: 'b1@t.br', roles: ['Aluno'], programaId: B });

    expect((await gerar(gpa, doA)).status).toBe(200);
    expect((await gerar(gpa, doB)).status).toBe(403);
  });

  it('gestor de programa não toma conta de papel mais alto, nem pelo reset nem pelo PUT', async () => {
    await usuario({ email: 'gpa@t.br', roles: ['GestorPrograma'], programaId: A });
    const gpa = await login('gpa@t.br', 'senhaBoa123');
    const gestorNoA = await usuario({ email: 'gestor@t.br', roles: ['Gestor'], programaId: A });

    expect((await gerar(gpa, gestorNoA)).status).toBe(403);
    expect((await como(gpa)(request(app).put(`/api/users/${gestorNoA}`)).send({ password: 'tomada12345' })).status).toBe(403);
    expect((await request(app).post('/api/login').send({ username: 'gestor@t.br', password: 'senhaBoa123' })).status).toBe(200);
  });

  it('aluno não gera senha para ninguém, nem para si', async () => {
    const id = await usuario({ email: 'aluno@t.br', roles: ['Aluno'] });
    const token = await login('aluno@t.br', 'senhaBoa123');
    expect((await gerar(token, id)).status).toBe(403);
    expect((await gerar(token, 'admin-test')).status).toBe(403);
  });
});
