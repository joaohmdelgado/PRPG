import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';
import { pool } from '../db/pool.js';
import { resetDb, seedAdmin, loginAdmin, login } from './helpers.js';

let adminToken;
let gestorToken;
let programaA;
let programaB;

const novoPrograma = (over = {}) => ({
  nome: 'PPG Teste',
  sigla: 'ppgt',
  modalidades: [{ tipo: 'MESTRADO', ano_inicio: 2020, nota_capes: '4' }],
  ...over,
});

beforeEach(async () => {
  await resetDb();
  await seedAdmin();
  adminToken = await loginAdmin();

  const a = await request(app).post('/api/programas')
    .set('Authorization', `Bearer ${adminToken}`)
    .send(novoPrograma({ nome: 'Programa A', sigla: 'pga' }));
  programaA = a.body.id;

  const b = await request(app).post('/api/programas')
    .set('Authorization', `Bearer ${adminToken}`)
    .send(novoPrograma({ nome: 'Programa B', sigla: 'pgb' }));
  programaB = b.body.id;

  // Cria o gestor do Programa A via API de usuários (admin) e faz login.
  await request(app).post('/api/users')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      email: 'gestor@pga.com',
      password: 'senha123',
      roles: ['GestorPrograma'],
      programaId: programaA,
      perfil_geral: { nome: 'Gestor A' },
    });
  gestorToken = await login('gestor@pga.com');
});

afterAll(async () => {
  await pool.end();
});

const asGestor = (req) => req.set('Authorization', `Bearer ${gestorToken}`);
const asAdmin = (req) => req.set('Authorization', `Bearer ${adminToken}`);

describe('criação de usuário gestor de programa', () => {
  it('exige programaId ao criar um GestorPrograma (400)', async () => {
    const res = await asAdmin(request(app).post('/api/users'))
      .send({ email: 'sem@prog.com', password: 'x', roles: ['GestorPrograma'] });
    expect(res.status).toBe(400);
  });

  it('persiste o programaId e o devolve no login', async () => {
    const res = await request(app).post('/api/login')
      .send({ username: 'gestor@pga.com', password: 'senha123' });
    expect(res.status).toBe(200);
    expect(res.body.programaId).toBe(programaA);
    expect(res.body.gestorPrograma?.id).toBe(programaA);
  });
});

describe('escopo de escrita do gestor de programa', () => {
  it('força o programa do gestor ao criar notícia, ignorando spoof', async () => {
    const res = await asGestor(request(app).post('/api/news'))
      .send({ title: 'Notícia do gestor', programaId: programaB });
    expect(res.status).toBe(201);
    expect(res.body.programaId).toBe(programaA);
  });

  it('lista apenas as notícias do próprio programa via ?programa', async () => {
    await asAdmin(request(app).post('/api/news')).send({ title: 'Da PRPG' });
    await asAdmin(request(app).post('/api/news')).send({ title: 'Do B', programaId: programaB });
    await asGestor(request(app).post('/api/news')).send({ title: 'Do A' });

    const res = await request(app).get(`/api/news?programa=${programaA}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].title).toBe('Do A');
  });
});

describe('posse de conteúdo do gestor de programa', () => {
  it('bloqueia editar/excluir notícia de outro programa (403)', async () => {
    const outra = await asAdmin(request(app).post('/api/news'))
      .send({ title: 'Notícia do B', programaId: programaB });
    const id = outra.body.id;

    const put = await asGestor(request(app).put(`/api/news/${id}`)).send({ title: 'Hack' });
    expect(put.status).toBe(403);

    const del = await asGestor(request(app).delete(`/api/news/${id}`));
    expect(del.status).toBe(403);
  });

  it('permite editar/excluir a própria notícia', async () => {
    const minha = await asGestor(request(app).post('/api/news')).send({ title: 'Minha' });
    const id = minha.body.id;

    const put = await asGestor(request(app).put(`/api/news/${id}`)).send({ title: 'Minha (editada)' });
    expect(put.status).toBe(200);
    expect(put.body.programaId).toBe(programaA);

    const del = await asGestor(request(app).delete(`/api/news/${id}`));
    expect(del.status).toBe(200);
  });
});

describe('limites do gestor de programa', () => {
  it('não pode criar nem excluir programas (403)', async () => {
    const post = await asGestor(request(app).post('/api/programas')).send(novoPrograma());
    expect(post.status).toBe(403);

    const del = await asGestor(request(app).delete(`/api/programas/${programaB}`));
    expect(del.status).toBe(403);
  });

  it('só pode editar o seu próprio programa', async () => {
    const outro = await asGestor(request(app).put(`/api/programas/${programaB}`))
      .send({ nome: 'Tentativa' });
    expect(outro.status).toBe(403);

    const meu = await asGestor(request(app).put(`/api/programas/${programaA}`))
      .send(novoPrograma({ nome: 'Programa A (editado)', sigla: 'pga' }));
    expect(meu.status).toBe(200);
  });

  it('não pode criar conteúdo global (bolsas/calendários) (403)', async () => {
    const bolsa = await asGestor(request(app).post('/api/bolsas')).send({ title: 'Bolsa' });
    expect(bolsa.status).toBe(403);

    const cal = await asGestor(request(app).post('/api/calendarios')).send({ ano: 2026 });
    expect(cal.status).toBe(403);
  });
});
