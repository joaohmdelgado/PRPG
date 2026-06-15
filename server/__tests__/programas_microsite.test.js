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

const novoPrograma = (over = {}) => ({
  nome: 'PPG História',
  sigla: 'pgh',
  modalidades: [{ tipo: 'M', ano_inicio: 2006, nota_capes: '4' }],
  ...over,
});

const criar = async (over) => (await auth(request(app).post('/api/programas')).send(novoPrograma(over))).body;

describe('microsite — slug', () => {
  it('gera slug a partir do nome e responde em /programas/slug/:slug', async () => {
    const { slug } = await criar();
    expect(slug).toBe('ppg-historia');

    const res = await request(app).get(`/api/programas/slug/${slug}`);
    expect(res.status).toBe(200);
    expect(res.body.nome).toBe('PPG História');
  });

  it('respeita slug informado e garante unicidade', async () => {
    const a = await criar({ slug: 'pgh' });
    expect(a.slug).toBe('pgh');
    const b = await criar({ slug: 'pgh' });
    expect(b.slug).toBe('pgh-1');
  });

  it('recusa slug reservado (colidiria com rotas da PRPG)', async () => {
    const { slug } = await criar({ slug: 'editais' });
    expect(slug).toBe('editais-pg');
  });

  it('retorna 404 para slug inexistente', async () => {
    const res = await request(app).get('/api/programas/slug/nao-existe');
    expect(res.status).toBe(404);
  });
});

describe('microsite — páginas (rich-text)', () => {
  it('salva seções, sanitiza HTML e expõe só as visíveis ao público', async () => {
    const { slug } = await criar({
      slug: 'pgh',
      paginas: [
        { secao: 'sobre', titulo: 'Sobre', body: { value: '<p>Olá</p><script>alert(1)</script>' }, visivel: true },
        { secao: 'historico', titulo: 'Histórico', body: { value: '<p>Origem</p>' }, visivel: false },
      ],
    });

    const pub = await request(app).get(`/api/programas/slug/${slug}`);
    expect(pub.status).toBe(200);
    const secoesPub = pub.body.paginas.map((p) => p.secao);
    expect(secoesPub).toContain('sobre');
    expect(secoesPub).not.toContain('historico'); // oculta para o público

    const sobre = pub.body.paginas.find((p) => p.secao === 'sobre');
    expect(sobre.body.value).toContain('<p>Olá</p>');
    expect(sobre.body.value).not.toContain('<script>');

    const adm = await auth(request(app).get(`/api/programas/slug/${slug}`));
    expect(adm.body.paginas.map((p) => p.secao)).toContain('historico'); // admin vê ocultas
  });

  it('atualiza (upsert) a seção sem duplicar', async () => {
    const created = await criar({ slug: 'pgh', paginas: [{ secao: 'sobre', body: { value: '<p>v1</p>' }, visivel: true }] });
    await auth(request(app).put(`/api/programas/${created.id}`)).send({
      paginas: [{ secao: 'sobre', body: { value: '<p>v2</p>' }, visivel: true }],
    });
    const res = await request(app).get('/api/programas/slug/pgh');
    const sobre = res.body.paginas.filter((p) => p.secao === 'sobre');
    expect(sobre).toHaveLength(1);
    expect(sobre[0].body.value).toContain('v2');
  });
});

describe('microsite — conteúdo vinculado ao programa', () => {
  it('filtra notícias por programa (id e slug); itens sem programa ficam globais', async () => {
    const prog = await criar({ slug: 'pgh' });

    await auth(request(app).post('/api/news')).send({ title: 'Notícia do PGH', programaId: prog.id });
    await auth(request(app).post('/api/news')).send({ title: 'Notícia geral da PRPG' });

    const todas = await request(app).get('/api/news');
    expect(todas.body).toHaveLength(2);

    const porId = await request(app).get(`/api/news?programa=${prog.id}`);
    expect(porId.body).toHaveLength(1);
    expect(porId.body[0].title).toBe('Notícia do PGH');

    const porSlug = await request(app).get('/api/news?programa=pgh');
    expect(porSlug.body).toHaveLength(1);
    expect(porSlug.body[0].programaId).toBe(prog.id);
  });

  it('filtra editais por programa', async () => {
    const prog = await criar({ slug: 'pgh' });
    await auth(request(app).post('/api/editais')).send({ title: 'Edital PGH', programaId: prog.id });
    await auth(request(app).post('/api/editais')).send({ title: 'Edital geral' });

    const porSlug = await request(app).get('/api/editais?programa=pgh');
    expect(porSlug.body).toHaveLength(1);
    expect(porSlug.body[0].title).toBe('Edital PGH');
  });
});
