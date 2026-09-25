import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';
import { pool } from '../db/pool.js';
import { resetDb, seedAdmin, loginAdmin } from './helpers.js';
import { parseDataPt } from '../utils/datas.js';

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

describe('R.5 — data das notícias', () => {
  it('parseDataPt aceita ISO e o formato por extenso do site antigo', () => {
    expect(parseDataPt('2026-03-20')).toBe('2026-03-20');
    expect(parseDataPt('20 de Março, 2026')).toBe('2026-03-20');
    expect(parseDataPt('2 de março de 2026')).toBe('2026-03-02');
    expect(parseDataPt('')).toBeNull();
    expect(parseDataPt('31/12/2026')).toBe('31/12/2026'); // não descarta: a coluna recusa (400)
  });

  it('grava como DATE, deriva o ano e lista da mais recente para a mais antiga', async () => {
    await auth(request(app).post('/api/news')).send({ id: 'a-antiga', title: 'Antiga', date: '07 de Agosto, 2024' });
    await auth(request(app).post('/api/news')).send({ id: 'z-nova', title: 'Nova', date: '2026-05-10' });
    await auth(request(app).post('/api/news')).send({ id: 'm-meio', title: 'Meio', date: '2025-01-15' });

    const res = await request(app).get('/api/news');
    expect(res.body.map((n) => n.id)).toEqual(['z-nova', 'm-meio', 'a-antiga']);
    const antiga = res.body.find((n) => n.id === 'a-antiga');
    expect(antiga.date).toBe('2024-08-07');
    expect(antiga.year).toBe('2024');
  });

  it('data em formato desconhecido devolve 400', async () => {
    const res = await auth(request(app).post('/api/news')).send({ title: 'X', date: '31/12/2026' });
    expect(res.status).toBe(400);
  });
});

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
