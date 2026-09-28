import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';
import { pool } from '../db/pool.js';
import { resetDb, seedAdmin, seedUser, loginAdmin, login } from './helpers.js';

// Fase P.6 (docs/revisao-portal-conteudo-2026-09-24.md): desempenho real —
// o navegador de quem visita reporta CLS/FCP/INP/LCP/TTFB (POST anônimo,
// src/webVitals.js) e o painel Qualidade dos dados lê o p75 por rota.

let adminToken;
const auth = (req) => req.set('Authorization', `Bearer ${adminToken}`);

beforeEach(async () => {
  await resetDb();
  await seedAdmin();
  adminToken = await loginAdmin();
});

afterAll(async () => {
  await pool.end();
});

const enviar = (corpo) => request(app).post('/api/web-vitals').send(corpo);
const base = { rota: '/noticias', metrica: 'LCP', valor: 2100, avaliacao: 'good' };

describe('P.6 — POST /web-vitals (anônimo)', () => {
  it('aceita um beacon válido, sem exigir login, e devolve 204 sem corpo', async () => {
    const res = await enviar(base);
    expect(res.status).toBe(204);
    expect(res.body).toEqual({});
    const { rows } = await pool.query('SELECT rota, metrica, valor, avaliacao, dispositivo FROM web_vitals');
    expect(rows).toEqual([{ rota: '/noticias', metrica: 'LCP', valor: 2100, avaliacao: 'good', dispositivo: null }]);
  });

  it('aceita as 5 métricas e os dois dispositivos', async () => {
    for (const metrica of ['CLS', 'FCP', 'INP', 'LCP', 'TTFB']) {
      expect((await enviar({ ...base, metrica, valor: metrica === 'CLS' ? 0.05 : 500 })).status, metrica).toBe(204);
    }
    for (const dispositivo of ['mobile', 'desktop']) {
      expect((await enviar({ ...base, dispositivo })).status, dispositivo).toBe(204);
    }
    expect((await pool.query('SELECT count(*)::int AS n FROM web_vitals')).rows[0].n).toBe(7);
  });

  it('rejeita rota vazia, métrica desconhecida, valor negativo/não numérico, avaliação e dispositivo fora da lista', async () => {
    expect((await enviar({ ...base, rota: '' })).status).toBe(400);
    expect((await enviar({ ...base, rota: '   ' })).status).toBe(400);
    expect((await enviar({ ...base, rota: undefined })).status).toBe(400);
    expect((await enviar({ ...base, metrica: 'XSS' })).status).toBe(400);
    expect((await enviar({ ...base, valor: -1 })).status).toBe(400);
    expect((await enviar({ ...base, valor: 'muito' })).status).toBe(400);
    expect((await enviar({ ...base, valor: Infinity })).status).toBe(400);
    expect((await enviar({ ...base, avaliacao: 'ótimo' })).status).toBe(400);
    expect((await enviar({ ...base, dispositivo: 'tablet' })).status).toBe(400);
    expect((await pool.query('SELECT count(*)::int AS n FROM web_vitals')).rows[0].n).toBe(0);
  });

  it('rota longa demais é cortada em 120 caracteres em vez de rejeitada', async () => {
    const rota = `/${'x'.repeat(200)}`;
    const res = await enviar({ ...base, rota });
    expect(res.status).toBe(204);
    const { rows } = await pool.query('SELECT rota FROM web_vitals');
    expect(rows[0].rota.length).toBe(120);
  });

  it('não aceita SQL nem HTML na rota — vira parâmetro, texto literal', async () => {
    const rota = "/x' OR '1'='1<script>alert(1)</script>";
    expect((await enviar({ ...base, rota })).status).toBe(204);
    const { rows } = await pool.query('SELECT rota FROM web_vitals');
    expect(rows[0].rota).toBe(rota);
    const tabelas = await pool.query("SELECT to_regclass('public.web_vitals') AS t");
    expect(tabelas.rows[0].t).toBe('web_vitals');
  });
});

describe('P.6 — GET /web-vitals/resumo (Qualidade dos dados)', () => {
  const semear = async () => {
    // /noticias: 10 amostras de LCP (amostra mínima — p75 esperado 2900, "needs-improvement").
    const valoresLcp = [1000, 1200, 1500, 1800, 2000, 2200, 2600, 3000, 3200, 3400];
    for (const valor of valoresLcp) await enviar({ rota: '/noticias', metrica: 'LCP', valor, avaliacao: valor <= 2500 ? 'good' : 'needs-improvement' });
    // /: 3 amostras de CLS (abaixo da amostra mínima — "não confiável").
    for (const valor of [0.02, 0.03, 0.04]) await enviar({ rota: '/', metrica: 'CLS', valor, avaliacao: 'good' });
  };

  it('exige Admin/Gestor', async () => {
    await seedUser({ id: 'aluno', email: 'aluno@x.br', roles: ['Aluno'] });
    const token = await login('aluno@x.br');
    expect((await request(app).get('/api/web-vitals/resumo')).status).toBe(401);
    expect((await request(app).get('/api/web-vitals/resumo').set('Authorization', `Bearer ${token}`)).status).toBe(403);
    expect((await auth(request(app).get('/api/web-vitals/resumo'))).status).toBe(200);
  });

  it('calcula o p75 por rota e métrica, com contagem e aviso de amostra pequena', async () => {
    await semear();
    const res = await auth(request(app).get('/api/web-vitals/resumo'));
    expect(res.status).toBe(200);
    expect(res.body.dias).toBe(30);
    expect(res.body.totalAmostras).toBe(13);

    const noticias = res.body.rotas.find((r) => r.rota === '/noticias');
    expect(noticias.metricas.LCP.n).toBe(10);
    expect(noticias.metricas.LCP.p75).toBeCloseTo(2900, 0);
    expect(noticias.metricas.LCP.avaliacao).toBe('needs-improvement');
    expect(noticias.metricas.LCP.confiavel).toBe(true);

    const home = res.body.rotas.find((r) => r.rota === '/');
    expect(home.metricas.CLS.n).toBe(3);
    expect(home.metricas.CLS.confiavel).toBe(false);
    expect(home.metricas.CLS.avaliacao).toBe('good');

    // Ordenado pela rota com mais amostras primeiro.
    expect(res.body.rotas.map((r) => r.rota)).toEqual(['/noticias', '/']);
  });

  it('?dias= respeita o intervalo (não conta o que ficou fora) e é limitado a 90', async () => {
    await pool.query(
      `INSERT INTO web_vitals (rota, metrica, valor, avaliacao, capturado_em)
       VALUES ('/antiga', 'LCP', 9000, 'poor', now() - interval '40 days')`,
    );
    await enviar({ ...base, rota: '/nova' });

    const curto = await auth(request(app).get('/api/web-vitals/resumo?dias=7'));
    expect(curto.body.rotas.map((r) => r.rota)).toEqual(['/nova']);

    const longo = await auth(request(app).get('/api/web-vitals/resumo?dias=60'));
    expect(longo.body.rotas.map((r) => r.rota).sort()).toEqual(['/antiga', '/nova']);

    const excedido = await auth(request(app).get('/api/web-vitals/resumo?dias=99999'));
    expect(excedido.body.dias).toBe(90);
  });

  it('rota sem nenhuma amostra recente não aparece', async () => {
    const res = await auth(request(app).get('/api/web-vitals/resumo'));
    expect(res.body.rotas).toEqual([]);
    expect(res.body.totalAmostras).toBe(0);
  });
});
