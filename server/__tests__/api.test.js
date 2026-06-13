import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';
import { pool } from '../db/pool.js';
import { resetDb, seedAdmin, loginAdmin } from './helpers.js';

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

describe('autenticação', () => {
  it('faz login com credenciais válidas', async () => {
    const res = await request(app).post('/api/login').send({ username: 'admin@test.com', password: 'admin123' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect(res.body.roles).toContain('Administrator');
  });

  it('rejeita senha inválida com 401', async () => {
    const res = await request(app).post('/api/login').send({ username: 'admin@test.com', password: 'errada' });
    expect(res.status).toBe(401);
  });

  it('bloqueia rota protegida sem token (401)', async () => {
    const res = await request(app).post('/api/news').send({ title: 'x' });
    expect(res.status).toBe(401);
  });
});

describe('validação de entrada', () => {
  it('rejeita criação sem título (400)', async () => {
    const res = await auth(request(app).post('/api/news')).send({ excerpt: 'sem titulo' });
    expect(res.status).toBe(400);
  });

  it('rejeita body que não é objeto (400)', async () => {
    const res = await auth(request(app).post('/api/news')).send([1, 2, 3]);
    expect(res.status).toBe(400);
  });
});

describe('news — CRUD e sanitização', () => {
  it('cria sanitizando o conteúdo, lê, atualiza (merge) e remove', async () => {
    const create = await auth(request(app).post('/api/news')).send({
      title: 'Notícia QA',
      content: ['<p>ok</p><script>alert(1)</script>'],
      tags: ['#qa'],
    });
    expect(create.status).toBe(201);
    expect(create.body.content[0]).toBe('<p>ok</p>');
    const id = create.body.id;

    const get = await request(app).get(`/api/news/${id}`);
    expect(get.status).toBe(200);
    expect(get.body.title).toBe('Notícia QA');

    const upd = await auth(request(app).put(`/api/news/${id}`)).send({ excerpt: 'resumo novo' });
    expect(upd.status).toBe(200);
    expect(upd.body.excerpt).toBe('resumo novo');
    expect(upd.body.title).toBe('Notícia QA'); // merge preserva campos

    const del = await auth(request(app).delete(`/api/news/${id}`));
    expect(del.status).toBe(200);

    const after = await request(app).get('/api/news');
    expect(after.body).toHaveLength(0);
  });

  it('retorna 404 para id inexistente', async () => {
    const res = await request(app).get('/api/news/nao-existe');
    expect(res.status).toBe(404);
  });
});

describe('editais — status calculado', () => {
  it('marca como Concluído um período no passado', async () => {
    await auth(request(app).post('/api/editais')).send({
      title: 'Edital Antigo',
      field_periodo: { data_inicio: '2020-01-01', data_fim: '2020-02-01' },
    });
    const res = await request(app).get('/api/editais');
    expect(res.body[0].situationLabel).toBe('Concluído');
  });

  it('sanitiza a descrição do edital', async () => {
    const res = await auth(request(app).post('/api/editais')).send({
      title: 'Edital XSS',
      description: '<p>texto</p><script>alert(1)</script>',
    });
    expect(res.body.description).toBe('<p>texto</p>');
  });
});

describe('pages — slug', () => {
  it('gera slug a partir do título e serve por slug', async () => {
    const create = await auth(request(app).post('/api/pages')).send({
      title: 'Minha Página de Teste',
      body: { value: '<p>oi</p>', summary: 'resumo' },
    });
    expect(create.status).toBe(201);
    expect(create.body.slug).toBe('minha-pagina-de-teste');

    const bySlug = await request(app).get('/api/pages/slug/minha-pagina-de-teste');
    expect(bySlug.status).toBe(200);
    expect(bySlug.body.title).toBe('Minha Página de Teste');
  });

  it('garante slugs únicos para títulos iguais', async () => {
    const base = { body: { value: '<p>x</p>', summary: '' } };
    const a = await auth(request(app).post('/api/pages')).send({ title: 'Igual', ...base });
    const b = await auth(request(app).post('/api/pages')).send({ title: 'Igual', ...base });
    expect(a.body.slug).toBe('igual');
    expect(b.body.slug).toBe('igual-1');
  });
});

describe('taxonomias', () => {
  it('retorna objeto e persiste atualização', async () => {
    const upd = await auth(request(app).post('/api/taxonomias')).send({
      entradas: ['a', 'b'],
      tipo_bolsa: ['CAPES'],
    });
    expect(upd.status).toBe(200);
    const get = await request(app).get('/api/taxonomias');
    expect(get.body.entradas).toEqual(['a', 'b']);
    expect(get.body.tipo_bolsa).toEqual(['CAPES']);
  });
});
