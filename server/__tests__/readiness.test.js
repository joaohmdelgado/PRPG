import { describe, it, expect, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';
import { pool } from '../db/pool.js';

afterAll(async () => {
  await pool.end();
});

describe('readiness', () => {
  it('mantém uma sonda de vida independente do banco', async () => {
    const res = await request(app).get('/api/live');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'live' });
    expect(res.headers['cache-control']).toContain('no-store');
  });

  it('declara pronto apenas após consultar o PostgreSQL', async () => {
    const res = await request(app).get('/api/ready');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ready', database: 'connected' });
    expect(res.headers['cache-control']).toContain('no-store');
  });
});
