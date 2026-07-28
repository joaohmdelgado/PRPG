import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';
import { pool } from '../db/pool.js';
import { resetDb } from './helpers.js';

beforeEach(async () => {
  await resetDb();
});

afterAll(async () => {
  await pool.end();
});

describe('GET /api/vocabularios (Fase B.5, G10)', () => {
  it('exige o domínio', async () => {
    const res = await request(app).get('/api/vocabularios');
    expect(res.status).toBe(400);
  });

  it('devolve os valores do domínio, ordenados', async () => {
    const res = await request(app).get('/api/vocabularios?dominio=evento.tipo');
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0]).toHaveProperty('valor');
    expect(res.body[0]).toHaveProperty('rotulo');
    expect(res.body.map((v) => v.valor)).toContain('TRAMITACAO');
  });

  it('devolve lista vazia para domínio inexistente', async () => {
    const res = await request(app).get('/api/vocabularios?dominio=nao.existe');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});
