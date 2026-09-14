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

describe('microsite — página fixa "Sobre"', () => {
  it('cria automaticamente a página fixa ao criar o programa, sem sufixo -1', async () => {
    const { id, slug } = await criar({ slug: 'pgh' });

    const pub = await request(app).get(`/api/programas/slug/${slug}`);
    expect(pub.status).toBe(200);
    expect(pub.body.pagina_sobre).toMatchObject({ slug: 'sobre', chave: 'sobre', programaId: id });

    // Endereço próprio dentro do microsite (ver ProgramaSite.jsx/pagesController);
    // ?programa= escopa a busca (slug só é único dentro do programa).
    const bySlug = await request(app).get(`/api/pages/slug/sobre?programa=${slug}`);
    expect(bySlug.status).toBe(200);
    expect(bySlug.body.programaId).toBe(id);

    // Sem escopo, "sobre" não é uma página geral (é a fixa do programa) → 404.
    const semEscopo = await request(app).get('/api/pages/slug/sobre');
    expect(semEscopo.status).toBe(404);
  });

  it('dois programas diferentes têm cada um sua própria página "sobre" (escopo por programa_id)', async () => {
    const a = await criar({ slug: 'pgh' });
    const b = await criar({ nome: 'PPG Letras', sigla: 'ppgl', slug: 'ppgl' });

    const pubA = await request(app).get(`/api/programas/slug/${a.slug}`);
    const pubB = await request(app).get(`/api/programas/slug/${b.slug}`);
    expect(pubA.body.pagina_sobre.slug).toBe('sobre');
    expect(pubB.body.pagina_sobre.slug).toBe('sobre'); // não vira "sobre-1"
    expect(pubA.body.pagina_sobre.id).not.toBe(pubB.body.pagina_sobre.id);
  });

  it('edita o conteúdo (sanitizado) sem mudar slug/programa mesmo se o cliente tentar', async () => {
    const { id, slug } = await criar({ slug: 'pgh' });
    const pagina = (await request(app).get(`/api/pages/slug/sobre?programa=${slug}`)).body;

    const upd = await auth(request(app).put(`/api/pages/${pagina.id}`)).send({
      title: 'Sobre o PGH',
      slug: 'outra-coisa',
      programaId: null,
      body: { value: '<p>Texto novo</p><script>alert(1)</script>' },
    });
    expect(upd.status).toBe(200);
    expect(upd.body.slug).toBe('sobre'); // travado
    expect(upd.body.programaId).toBe(id); // travado
    expect(upd.body.title).toBe('Sobre o PGH'); // título livre
    expect(upd.body.body.value).toContain('<p>Texto novo</p>');
    expect(upd.body.body.value).not.toContain('<script>');
  });

  it('recusa excluir a página fixa', async () => {
    const { slug } = await criar({ slug: 'pgh' });
    const pagina = (await request(app).get(`/api/pages/slug/sobre?programa=${slug}`)).body;

    const del = await auth(request(app).delete(`/api/pages/${pagina.id}`));
    expect(del.status).toBe(400);

    const stillThere = await request(app).get(`/api/pages/slug/sobre?programa=${slug}`);
    expect(stillThere.status).toBe(200);
  });
});

describe('microsite — páginas comuns por programa (slug escopado)', () => {
  it('permite o mesmo slug em programas diferentes (antes era único globalmente)', async () => {
    const a = await criar({ slug: 'pgh' });
    const b = await criar({ nome: 'PPG Letras', sigla: 'ppgl', slug: 'ppgl' });

    const pa = await auth(request(app).post('/api/pages')).send({
      title: 'Regimento', programaId: a.id, body: { value: '<p>x</p>' },
    });
    const pb = await auth(request(app).post('/api/pages')).send({
      title: 'Regimento', programaId: b.id, body: { value: '<p>y</p>' },
    });
    expect(pa.body.slug).toBe('regimento');
    expect(pb.body.slug).toBe('regimento'); // não "regimento-1"
  });

  it('ainda evita colidir com as sub-rotas fixas do microsite (ex.: "noticias")', async () => {
    const { id } = await criar({ slug: 'pgh' });
    const p = await auth(request(app).post('/api/pages')).send({
      title: 'Notícias', programaId: id, body: { value: '<p>x</p>' },
    });
    expect(p.body.slug).toBe('noticias-1');
  });

  it('página geral ainda evita as rotas institucionais da PRPG e o slug de programas', async () => {
    await criar({ slug: 'pgh' });
    const geral = await auth(request(app).post('/api/pages')).send({
      title: 'Sobre', body: { value: '<p>x</p>' }, // sem programaId
    });
    expect(geral.body.slug).toBe('sobre-1'); // "sobre" é rota fixa da PRPG

    const colidePrograma = await auth(request(app).post('/api/pages')).send({
      title: 'pgh', body: { value: '<p>x</p>' },
    });
    expect(colidePrograma.body.slug).toBe('pgh-1'); // "pgh" já é slug de programa
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
