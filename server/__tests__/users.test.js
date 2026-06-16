import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';
import { pool } from '../db/pool.js';
import { resetDb, seedAdmin, seedUser, login, loginAdmin } from './helpers.js';

let adminToken;

beforeEach(async () => {
  await resetDb();
  await seedAdmin();
  adminToken = await loginAdmin();
});

afterAll(async () => {
  await pool.end();
});

const asAdmin = (req) => req.set('Authorization', `Bearer ${adminToken}`);

describe('users — listagem', () => {
  it('nunca expõe o password_hash', async () => {
    const res = await asAdmin(request(app).get('/api/users'));
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    res.body.forEach((u) => expect(u.password_hash).toBeUndefined());
  });
});

describe('users — criação', () => {
  it('rejeita e-mail duplicado com 409 e aponta o cadastro existente', async () => {
    const orig = await asAdmin(request(app).post('/api/users')).send({ email: 'dup@test.com', roles: ['Aluno'] });
    const res = await asAdmin(request(app).post('/api/users')).send({ email: 'dup@test.com', roles: ['Aluno'] });
    expect(res.status).toBe(409);
    expect(res.body.conflict).toBe('email');
    expect(res.body.existing?.id).toBe(orig.body.id);
  });

  it('rejeita CPF duplicado com 409 (compara só dígitos, ignora pontuação)', async () => {
    await asAdmin(request(app).post('/api/users'))
      .send({ email: 'cpf-a@test.com', roles: ['Aluno'], perfil_geral: { nome: 'A', cpf: '123.456.789-00' } });
    const res = await asAdmin(request(app).post('/api/users'))
      .send({ email: 'cpf-b@test.com', roles: ['Aluno'], perfil_geral: { nome: 'B', cpf: '12345678900' } });
    expect(res.status).toBe(409);
    expect(res.body.conflict).toBe('cpf');
  });

  it('usa senha padrão Mudar123 quando não informada e oculta o hash', async () => {
    const create = await asAdmin(request(app).post('/api/users')).send({ email: 'novo@test.com', roles: ['Aluno'] });
    expect(create.status).toBe(201);
    expect(create.body.password_hash).toBeUndefined();
    // Consegue logar com a senha padrão.
    const res = await request(app).post('/api/login').send({ username: 'novo@test.com', password: 'Mudar123' });
    expect(res.status).toBe(200);
  });

  it('exige programa para Professor', async () => {
    const semPrograma = await asAdmin(request(app).post('/api/users')).send({ email: 'prof@test.com', roles: ['Professor'] });
    expect(semPrograma.status).toBe(400);

    const comPrograma = await asAdmin(request(app).post('/api/users')).send({
      email: 'prof2@test.com',
      roles: ['Professor'],
      perfil_professor: { programas: ['ppg-1'] },
    });
    expect(comPrograma.status).toBe(201);
  });
});

describe('users — controle de acesso', () => {
  it('um usuário comum não pode ver o perfil de outro (403)', async () => {
    await seedUser({ id: 'aluno-1', email: 'aluno1@test.com', roles: ['Aluno'] });
    await seedUser({ id: 'aluno-2', email: 'aluno2@test.com', roles: ['Aluno'] });
    const alunoToken = await login('aluno1@test.com');

    const res = await request(app).get('/api/users/aluno-2').set('Authorization', `Bearer ${alunoToken}`);
    expect(res.status).toBe(403);

    const self = await request(app).get('/api/users/aluno-1').set('Authorization', `Bearer ${alunoToken}`);
    expect(self.status).toBe(200);
  });

  it('permite ao próprio usuário trocar a senha', async () => {
    await seedUser({ id: 'aluno-3', email: 'aluno3@test.com', roles: ['Aluno'] });
    const t = await login('aluno3@test.com');

    const upd = await request(app).put('/api/users/aluno-3')
      .set('Authorization', `Bearer ${t}`)
      .send({ password: 'novaSenha456' });
    expect(upd.status).toBe(200);

    const ok = await request(app).post('/api/login').send({ username: 'aluno3@test.com', password: 'novaSenha456' });
    expect(ok.status).toBe(200);
  });
});

describe('users — exclusão', () => {
  it('admin remove usuário', async () => {
    await seedUser({ id: 'temp', email: 'temp@test.com', roles: ['Aluno'] });
    const del = await asAdmin(request(app).delete('/api/users/temp'));
    expect(del.status).toBe(200);
    const get = await asAdmin(request(app).get('/api/users/temp'));
    expect(get.status).toBe(404);
  });
});
