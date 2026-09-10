import { describe, it, expect, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';
import { pool } from '../db/pool.js';

afterAll(async () => {
  await pool.end();
});

describe('identificador de requisição', () => {
  it('gera um ID rastreável no servidor para cada resposta', async () => {
    const [primeira, segunda] = await Promise.all([
      request(app).get('/api/status'),
      request(app).get('/api/status'),
    ]);

    expect(primeira.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
    expect(segunda.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
    expect(primeira.headers['x-request-id']).not.toBe(segunda.headers['x-request-id']);
  });
});
