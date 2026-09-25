import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';
import { pool } from '../db/pool.js';
import { resetDb, seedAdmin, loginAdmin } from './helpers.js';

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

describe('classificações de conteúdo editáveis (Fase F.4)', () => {
  let token;
  const auth = (req) => req.set('Authorization', `Bearer ${token}`);
  beforeEach(async () => {
    await seedAdmin();
    token = await loginAdmin();
  });

  it('cria com valor em slug, lista pública só ativos e ?todos=1 traz uso', async () => {
    const criado = await auth(request(app).post('/api/vocabularios')).send({ dominio: 'noticia.categoria', rotulo: 'Extensão Universitária' });
    expect(criado.status).toBe(201);
    expect(criado.body.valor).toBe('extensao-universitaria');
    await auth(request(app).post('/api/news')).send({ title: 'N', category: 'Extensão Universitária', categorySlug: 'extensao-universitaria' });

    const admin = await auth(request(app).get('/api/vocabularios?dominio=noticia.categoria&todos=1'));
    expect(admin.body[0]).toMatchObject({ valor: 'extensao-universitaria', emUso: 1 });
    // sem login, ?todos=1 não vale: devolve a lista pública (sem emUso)
    const pub = await request(app).get('/api/vocabularios?dominio=noticia.categoria&todos=1');
    expect(pub.body[0].emUso).toBeUndefined();
  });

  it('renomear propaga o rótulo às cópias gravadas no conteúdo', async () => {
    const v = (await auth(request(app).post('/api/vocabularios')).send({ dominio: 'documento.secao', rotulo: 'Lato' })).body;
    await auth(request(app).post('/api/resolucoes')).send({ id: 'r1', title: 'R', sectionId: v.valor, sectionTitle: 'Lato' });
    await auth(request(app).post('/api/formularios')).send({ id: 'f1', title: 'F', sectionId: v.valor, sectionTitle: 'Lato' });

    const res = await auth(request(app).put(`/api/vocabularios/${v.id}`)).send({ rotulo: 'Lato sensu' });
    expect(res.status).toBe(200);
    expect(res.body.valor).toBe(v.valor); // chave estável
    expect((await request(app).get('/api/resolucoes/r1')).body.sectionTitle).toBe('Lato sensu');
    expect((await request(app).get('/api/formularios/f1')).body.sectionTitle).toBe('Lato sensu');
  });

  it('renomear subcategoria (referência pelo rótulo) também propaga', async () => {
    const v = (await auth(request(app).post('/api/vocabularios')).send({ dominio: 'resolucao.subcategoria', rotulo: 'PROAP' })).body;
    await auth(request(app).post('/api/resolucoes')).send({ id: 'r2', title: 'R', categoryTitle: 'PROAP' });
    await auth(request(app).put(`/api/vocabularios/${v.id}`)).send({ rotulo: 'PROAP/CAPES' });
    expect((await request(app).get('/api/resolucoes/r2')).body.categoryTitle).toBe('PROAP/CAPES');
  });

  it('excluir valor em uso só desativa; sem uso, exclui', async () => {
    const usado = (await auth(request(app).post('/api/vocabularios')).send({ dominio: 'bolsa.tipo', rotulo: 'CAPES' })).body;
    const livre = (await auth(request(app).post('/api/vocabularios')).send({ dominio: 'bolsa.tipo', rotulo: 'CNPq' })).body;
    await auth(request(app).post('/api/bolsas')).send({ title: 'B', tipoBolsa: 'CAPES' });

    const r1 = await auth(request(app).delete(`/api/vocabularios/${usado.id}`));
    expect(r1.body).toMatchObject({ desativado: true, emUso: 1 });
    const r2 = await auth(request(app).delete(`/api/vocabularios/${livre.id}`));
    expect(r2.body).toMatchObject({ excluido: true });
    expect((await request(app).get('/api/vocabularios?dominio=bolsa.tipo')).body).toEqual([]);
  });

  it('domínios de regra de negócio não são editáveis', async () => {
    const res = await auth(request(app).post('/api/vocabularios')).send({ dominio: 'processo.situacao', rotulo: 'X' });
    expect(res.status).toBe(400);
  });

  it('escrita exige Admin/Gestor', async () => {
    const res = await request(app).post('/api/vocabularios').send({ dominio: 'bolsa.tipo', rotulo: 'X' });
    expect(res.status).toBe(401);
  });
});
