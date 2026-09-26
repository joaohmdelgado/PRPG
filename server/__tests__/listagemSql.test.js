import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';
import { pool } from '../db/pool.js';
import { resetDb, seedAdmin, loginAdmin } from './helpers.js';

// Fase P.2 (docs/revisao-portal-conteudo-2026-09-24.md): a listagem de
// notícias filtra, ordena e pagina no banco; a de editais só busca erratas e
// resultados dos itens que vão na resposta; as respostas são comprimidas e
// revalidáveis por ETag.

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

const noticia = (n) => auth(request(app).post('/api/news')).send(n).then((r) => {
  expect(r.status).toBe(201);
  return r.body;
});

const semear = async () => {
  await noticia({ id: 'a', title: 'Seleção de mestrado', category: 'Editais', categorySlug: 'editais', date: '2026-03-10', excerpt: 'Inscrições abertas', content: ['<p>corpo A</p>'], tags: ['x'], quote: { text: 't', author: 'q' }, imageCaption: 'legenda', authorRole: 'cargo' });
  await noticia({ id: 'b', title: 'Pesquisa em destaque', category: 'Pesquisa', categorySlug: 'pesquisa', date: '2025-06-01', excerpt: 'Resultado da avaliação', destaque: true });
  await noticia({ id: 'c', title: 'Ação extensionista', category: 'Pesquisa', categorySlug: 'pesquisa', date: '2025-01-15', excerpt: 'Projeto' });
  await noticia({ id: 'd', title: 'Sem data', category: 'Geral', categorySlug: 'geral' });
  await noticia({ id: 'r', title: 'Rascunho secreto', date: '2026-04-01', status: 'RASCUNHO' });
};

const ids = (res) => (Array.isArray(res.body) ? res.body : res.body.items).map((i) => i.id);

describe('P.2 — notícias: filtros, ordem e página no banco', () => {
  beforeEach(semear);

  it('ordena por data decrescente, com a notícia sem data por último, e esconde o rascunho', async () => {
    expect(ids(await request(app).get('/api/news'))).toEqual(['a', 'b', 'c', 'd']);
    expect(ids(await auth(request(app).get('/api/news')))).toEqual(['r', 'a', 'b', 'c', 'd']);
  });

  it('filtra por categoria, ano, destaque e excluir', async () => {
    expect(ids(await request(app).get('/api/news?categoria=pesquisa'))).toEqual(['b', 'c']);
    expect(ids(await request(app).get('/api/news?ano=2025'))).toEqual(['b', 'c']);
    expect(ids(await request(app).get('/api/news?destaque=1'))).toEqual(['b']);
    expect(ids(await request(app).get('/api/news?categoria=pesquisa&excluir=b'))).toEqual(['c']);
  });

  it('busca em título e resumo sem diferenciar acento nem caixa, e % e _ são texto', async () => {
    expect(ids(await request(app).get('/api/news?q=' + encodeURIComponent('SELECAO')))).toEqual(['a']);
    expect(ids(await request(app).get('/api/news?q=' + encodeURIComponent('avaliacao')))).toEqual(['b']);
    expect(ids(await request(app).get('/api/news?q=' + encodeURIComponent('ACAO ext')))).toEqual(['c']);
    expect(ids(await request(app).get('/api/news?q=%25'))).toEqual([]);
    expect(ids(await request(app).get('/api/news?q=_'))).toEqual([]);
  });

  it('pagina no banco: total, páginas, anos do seletor e página fora do intervalo', async () => {
    const p1 = await request(app).get('/api/news?page=1&limit=2');
    expect(p1.body).toMatchObject({ total: 4, page: 1, limit: 2, pages: 2, anos: ['2026', '2025'] });
    expect(p1.body.items.map((i) => i.id)).toEqual(['a', 'b']);
    const p2 = await request(app).get('/api/news?page=2&limit=2');
    expect(p2.body.items.map((i) => i.id)).toEqual(['c', 'd']);
    // Página além da última volta para a última (como sempre foi).
    const alem = await request(app).get('/api/news?page=99&limit=2');
    expect(alem.body.page).toBe(2);
    // Os anos do seletor ignoram o filtro de ano, mas o total respeita.
    const ano = await request(app).get('/api/news?page=1&limit=10&ano=2025');
    expect(ano.body.total).toBe(2);
    expect(ano.body.anos).toEqual(['2026', '2025']);
  });

  it('?resumo=1 tira corpo, citação, tags, legenda e cargo; sem ele, tudo continua lá', async () => {
    const resumo = (await request(app).get('/api/news?resumo=1&categoria=editais')).body[0];
    expect(resumo.title).toBe('Seleção de mestrado');
    for (const campo of ['content', 'quote', 'tags', 'imageCaption', 'authorRole']) expect(resumo).not.toHaveProperty(campo);
    const completo = (await request(app).get('/api/news?categoria=editais')).body[0];
    expect(completo.content).toEqual(['<p>corpo A</p>']);
    expect(completo.quote).toEqual({ text: 't', author: 'q' });
    expect(completo.tags).toEqual(['x']);
  });

  it('?ordenar= só aceita campos conhecidos; vazio vai para o fim nos dois sentidos', async () => {
    // Sem acento nem caixa: Ação < Pesquisa < Seleção < Sem data.
    expect(ids(await request(app).get('/api/news?ordenar=title'))).toEqual(['c', 'b', 'a', 'd']);
    expect(ids(await request(app).get('/api/news?ordenar=date&dir=asc'))).toEqual(['c', 'b', 'a', 'd']);
    expect(ids(await request(app).get('/api/news?ordenar=date&dir=desc'))).toEqual(['a', 'b', 'c', 'd']);
    // Nome de coluna que não está na lista é ignorado (nada de SQL vindo da URL).
    const invasor = await request(app).get('/api/news?ordenar=' + encodeURIComponent('title; DROP TABLE news'));
    expect(invasor.status).toBe(200);
    expect(ids(invasor)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('entrada maliciosa nos filtros vira parâmetro, nunca SQL', async () => {
    const r = await request(app).get('/api/news?categoria=' + encodeURIComponent("x' OR '1'='1") + '&ano=' + encodeURIComponent("2025' OR '1'='1"));
    expect(r.status).toBe(200);
    expect(r.body).toEqual([]);
  });
});

describe('P.2 — editais: erratas e resultados só dos itens da página', () => {
  it('a listagem paginada traz as erratas dos editais da página', async () => {
    for (const id of ['e1', 'e2', 'e3']) {
      const r = await auth(request(app).post('/api/editais')).send({ id, title: `Edital ${id}`, numero: id });
      expect(r.status).toBe(201);
    }
    const errata = await auth(request(app).post('/api/editais/e2/erratas')).send({ numero: 'Errata 1', downloadLink: '/uploads/e.pdf' });
    expect([200, 201]).toContain(errata.status);

    const todos = await request(app).get('/api/editais');
    expect(todos.body.find((e) => e.id === 'e2').erratas).toHaveLength(1);
    const pagina = await request(app).get('/api/editais?page=1&limit=2&ordenar=numero&dir=asc');
    expect(pagina.body.items.map((e) => e.id)).toEqual(['e1', 'e2']);
    expect(pagina.body.items[1].erratas[0]).toMatchObject({ numero: 'Errata 1' });
    expect(pagina.body.items[0].erratas).toEqual([]);
  });
});

describe('P.2 — transporte: gzip e ETag', () => {
  it('comprime a listagem e responde 304 quando nada mudou', async () => {
    await semear();
    const primeira = await request(app).get('/api/news').set('Accept-Encoding', 'gzip');
    expect(primeira.headers['content-encoding']).toBe('gzip');
    const etag = primeira.headers.etag;
    expect(etag).toBeTruthy();
    const segunda = await request(app).get('/api/news').set('Accept-Encoding', 'gzip').set('If-None-Match', etag);
    expect(segunda.status).toBe(304);
  });
});
