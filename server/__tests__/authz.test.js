import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';
import { pool } from '../db/pool.js';
import { resetDb, seedAdmin, seedUser, login, loginAdmin } from './helpers.js';

let alunoToken;
let adminToken;

beforeEach(async () => {
  await resetDb();
  await seedAdmin();
  await seedUser({ id: 'aluno-az', email: 'aluno@az.com', roles: ['Aluno'] });
  adminToken = await loginAdmin();
  alunoToken = await login('aluno@az.com');
});

afterAll(async () => {
  await pool.end();
});

// Rotas restritas a Administrator/Gestor.
const adminOnlyRoutes = [
  ['get', '/api/users'],
  ['get', '/api/portarias'],
  ['get', '/api/grupos-pesquisa'],
];

describe('autorização por papel', () => {
  it('bloqueia usuário comum nas rotas exclusivas de admin (403)', async () => {
    for (const [method, path] of adminOnlyRoutes) {
      const res = await request(app)[method](path).set('Authorization', `Bearer ${alunoToken}`);
      expect(res.status, `${method} ${path}`).toBe(403);
    }
  });

  it('permite admin nas mesmas rotas', async () => {
    for (const [method, path] of adminOnlyRoutes) {
      const res = await request(app)[method](path).set('Authorization', `Bearer ${adminToken}`);
      expect(res.status, `${method} ${path}`).toBe(200);
    }
  });

  it('bloqueia POST de taxonomias para usuário comum (403)', async () => {
    const res = await request(app).post('/api/taxonomias')
      .set('Authorization', `Bearer ${alunoToken}`)
      .send({ entradas: ['x'] });
    expect(res.status).toBe(403);
  });
});
