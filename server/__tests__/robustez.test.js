import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';
import { pool } from '../db/pool.js';
import { resetDb, seedAdmin, loginAdmin } from './helpers.js';

// Fase R (docs/revisao-portal-conteudo-2026-09-24.md): um erro dentro de um
// handler async não pode escapar como rejeição não tratada — no servidor real
// isso dispara o shutdown de server/index.js e derruba a API inteira. Aqui
// (sem index.js) o sintoma antigo era a requisição ficar pendurada até o
// timeout do teste.

let token;

beforeEach(async () => {
  await resetDb();
  await seedAdmin();
  token = await loginAdmin();
});

afterAll(async () => {
  await pool.end();
});

const auth = (req) => req.set('Authorization', `Bearer ${token}`);

describe('R.1/R.2 — erros em handlers async viram resposta JSON', () => {
  it('data inválida numa coluna DATE devolve 400 (não derruba nem pendura)', async () => {
    const criado = await auth(request(app).post('/api/editais')).send({ title: 'Edital R' });
    expect(criado.status).toBe(201);

    const res = await auth(request(app).put(`/api/editais/${criado.body.id}`)).send({ deadline: '31/12/2026' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/inválid/i);

    // A API continua respondendo depois do erro.
    const status = await request(app).get('/api/status');
    expect(status.status).toBe(200);
  });

  it('id duplicado devolve 409 em vez de 500', async () => {
    const a = await auth(request(app).post('/api/editais')).send({ id: 'dup-r', title: 'A' });
    expect(a.status).toBe(201);
    const b = await auth(request(app).post('/api/editais')).send({ id: 'dup-r', title: 'B' });
    expect(b.status).toBe(409);
  });

  it('inscrição de proficiência com nome não-texto não quebra o handler', async () => {
    await pool.query(
      `INSERT INTO editais (id, title, proficiencia, periodo_data_inicio, periodo_data_fim)
       VALUES ('prof-r', 'Proficiência R', TRUE, CURRENT_DATE - 1, CURRENT_DATE + 1)`
    );
    const res = await request(app).post('/api/proficiencia/inscricoes').send({ nome: 123, cpf: 456 });
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
  });
});
