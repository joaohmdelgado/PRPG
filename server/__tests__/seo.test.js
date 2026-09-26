import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { app } from '../app.js';
import { pool } from '../db/pool.js';
import { limparCacheSeo } from '../seo/spa.js';
import { PAGINAS_ROTEADAS } from '../seo/metadados.js';
import { resumir, semHtml, jsonSeguro } from '../seo/texto.js';
import { resetDb, seedAdmin, loginAdmin } from './helpers.js';
import { garantirPaginasInstitucionais } from '../db/paginasInstitucionais.js';

// Fase P.4 (docs/revisao-portal-conteudo-2026-09-24.md, decisão D-R4):
// metadados por rota injetados pelo servidor no index.html, sitemap.xml,
// robots.txt e JSON-LD, a partir do banco.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SITE = 'http://seo.teste.br';
const INDEX = `<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="UTF-8">
    <title>PRPG UFRPE - Pró-Reitoria de Pós-Graduação</title>
  <script type="module" crossorigin src="/assets/app.abc123.js"></script>
</head>
<body><div id="root"></div></body>
</html>`;

let dist;
let token;
const auth = (req) => req.set('Authorization', `Bearer ${token}`);

beforeAll(() => {
  dist = fs.mkdtempSync(path.join(os.tmpdir(), 'prpg-dist-'));
  fs.mkdirSync(path.join(dist, 'assets'));
  fs.writeFileSync(path.join(dist, 'index.html'), INDEX);
  fs.writeFileSync(path.join(dist, 'assets', 'app.abc123.js'), 'console.log(1)');
  process.env.SPA_DIST_DIR = dist;
  process.env.PUBLIC_SITE_URL = SITE;
});

beforeEach(async () => {
  await resetDb();
  await seedAdmin();
  token = await loginAdmin();
  limparCacheSeo();
  delete process.env.SEO_NOINDEX;
});

afterAll(async () => {
  delete process.env.SPA_DIST_DIR;
  delete process.env.PUBLIC_SITE_URL;
  delete process.env.SEO_NOINDEX;
  fs.rmSync(dist, { recursive: true, force: true });
  await pool.end();
});

const noticia = (n) => auth(request(app).post('/api/news')).send(n);
const html = (res) => res.text;
const ldJson = (texto) => [...texto.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
const criarPrograma = async (dados) => {
  const r = await auth(request(app).post('/api/programas')).send({ nome: 'Programa X', modalidades: [{ tipo: 'M', ano_inicio: 2006, nota_capes: '4' }], ...dados });
  expect(r.status, JSON.stringify(r.body)).toBe(201);
  return r.body;
};

describe('P.4 — utilitários de texto', () => {
  it('semHtml e resumir tiram tags, script e entidades e cortam em palavra', () => {
    expect(semHtml('<p>Olá&nbsp;<b>mundo</b> &amp; cia</p><script>alert(1)</script><style>p{}</style>')).toBe('Olá mundo & cia');
    expect(semHtml('&#233;&#xE9;')).toBe('éé');
    const longo = resumir(`<p>${'palavra '.repeat(60)}</p>`, 50);
    expect(longo.length).toBeLessThanOrEqual(50);
    expect(longo.endsWith('…')).toBe(true);
    expect(longo).not.toMatch(/palavr…|palav…/);
  });

  it('jsonSeguro não deixa fechar a tag <script>', () => {
    const s = jsonSeguro({ t: '</script><img src=x onerror=alert(1)>&' });
    expect(s).not.toMatch(/[<>&]/);
    expect(JSON.parse(s).t).toBe('</script><img src=x onerror=alert(1)>&');
  });
});

describe('P.4 — página de notícia', () => {
  it('título, descrição, canonical, Open Graph, imagem WebP e JSON-LD saem no HTML inicial', async () => {
    await noticia({
      id: 'wk', title: 'Workshop de Inovação', excerpt: '<p>Resumo &amp; detalhes</p>', category: 'Pesquisa', categorySlug: 'pesquisa',
      date: '2026-05-10', author: 'Maria Silva', image: '/uploads/1-capa.jpg', imagemAlt: 'Auditório cheio',
    });
    const res = await request(app).get('/noticia/wk');
    expect(res.status).toBe(200);
    const h = html(res);
    expect(h).toContain('<title>Workshop de Inovação | PRPG UFRPE</title>');
    expect(h).not.toContain('Pró-Reitoria de Pós-Graduação</title>');
    expect(h).toContain('<meta name="description" content="Resumo &amp; detalhes">');
    expect(h).toContain(`<link rel="canonical" href="${SITE}/noticia/wk">`);
    expect(h).toContain('<meta property="og:type" content="article">');
    expect(h).toContain('<meta property="og:title" content="Workshop de Inovação">');
    expect(h).toContain(`<meta property="og:image" content="${SITE}/uploads/1-capa.jpg?w=1280">`);
    expect(h).toContain('<meta property="og:image:alt" content="Auditório cheio">');
    expect(h).toContain('<meta name="twitter:card" content="summary_large_image">');
    expect(h).toContain('rel="preload" as="image"');
    expect(h).toContain('/assets/app.abc123.js'); // o resto do index.html continua igual

    const ld = ldJson(h);
    const artigo = ld.find((d) => d['@type'] === 'NewsArticle');
    expect(artigo).toMatchObject({
      headline: 'Workshop de Inovação', datePublished: '2026-05-10',
      author: { '@type': 'Person', name: 'Maria Silva' },
      mainEntityOfPage: { '@id': `${SITE}/noticia/wk` },
    });
    expect(artigo.image).toEqual([`${SITE}/uploads/1-capa.jpg?w=1280`]);
    const trilha = ld.find((d) => d['@type'] === 'BreadcrumbList');
    expect(trilha.itemListElement.map((i) => i.name)).toEqual(['Início', 'Notícias', 'Workshop de Inovação']);
    expect(trilha.itemListElement[2].item).toBe(`${SITE}/noticia/wk`);
  });

  it('título com HTML e "</script>" não quebra o documento', async () => {
    await noticia({ id: 'xss', title: 'Ataque </title><script>alert(1)</script> "aspas" $& $\'', excerpt: 'x' });
    const h = html(await request(app).get('/noticia/xss'));
    expect(h).not.toMatch(/<script>alert/);
    expect(h).toContain('&lt;/title&gt;&lt;script&gt;alert(1)&lt;/script&gt;');
    // os blocos JSON-LD continuam sendo JSON válido e sem tags dentro
    for (const bloco of h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
      expect(bloco[1]).not.toMatch(/<|>/);
      expect(() => JSON.parse(bloco[1])).not.toThrow();
    }
    expect(ldJson(h).find((d) => d['@type'] === 'NewsArticle').headline).toContain('</script>');
  });

  it('rascunho, agendado e inexistente respondem 404 com noindex (e o SPA continua carregando)', async () => {
    await noticia({ id: 'rasc', title: 'Rascunho', status: 'RASCUNHO' });
    await noticia({ id: 'fut', title: 'Futura', publicadoEm: new Date(Date.now() + 86400000).toISOString() });
    for (const id of ['rasc', 'fut', 'nao-existe']) {
      const res = await request(app).get(`/noticia/${id}`);
      expect(res.status, id).toBe(404);
      expect(res.headers['x-robots-tag'], id).toMatch(/noindex/);
      expect(html(res), id).toContain('<meta name="robots" content="noindex, nofollow">');
      expect(html(res), id).not.toContain('rel="canonical"');
      expect(html(res), id).toContain('/assets/app.abc123.js');
      expect(html(res), id).not.toContain('Rascunho</title>');
    }
  });

  it('notícia de programa com microsite tem canonical no microsite; sem microsite, no portal', async () => {
    const com = await criarPrograma({ nome: 'Com Site', slug: 'com-site', sigla: 'CS', microsite_ativo: true });
    const sem = await criarPrograma({ nome: 'Sem Site', slug: 'sem-site' });
    await noticia({ id: 'n-com', title: 'Do programa', programaId: com.id });
    await noticia({ id: 'n-sem', title: 'Do outro', programaId: sem.id });
    const a = html(await request(app).get('/noticia/n-com'));
    expect(a).toContain(`<link rel="canonical" href="${SITE}/com-site/noticias/n-com">`);
    const b = html(await request(app).get('/com-site/noticias/n-com'));
    expect(b).toContain(`<link rel="canonical" href="${SITE}/com-site/noticias/n-com">`);
    expect(ldJson(b).find((d) => d['@type'] === 'BreadcrumbList').itemListElement.map((i) => i.name))
      .toEqual(['PRPG', 'Com Site', 'Notícias', 'Do programa']);
    expect(html(await request(app).get('/noticia/n-sem'))).toContain(`<link rel="canonical" href="${SITE}/noticia/n-sem">`);
  });
});

describe('P.4 — demais rotas', () => {
  it('home: título, Organization e WebSite; a descrição pode ser trocada no painel', async () => {
    const padrao = html(await request(app).get('/'));
    expect(padrao).toContain('<title>PRPG UFRPE — Pró-Reitoria de Pós-Graduação</title>');
    expect(padrao).toContain(`<link rel="canonical" href="${SITE}/">`);
    const ld = ldJson(padrao);
    expect(ld.map((d) => d['@type']).sort()).toEqual(['Organization', 'WebSite']);
    expect(ld.find((d) => d['@type'] === 'Organization')).toMatchObject({ name: 'Pró-Reitoria de Pós-Graduação da UFRPE', url: `${SITE}/` });

    const put = await auth(request(app).put('/api/configuracoes/seo')).send({ descricao: 'Descrição escolhida no painel.', imagem: '/uploads/og.png' });
    expect(put.status).toBe(200);
    limparCacheSeo();
    const novo = html(await request(app).get('/'));
    expect(novo).toContain('<meta name="description" content="Descrição escolhida no painel.">');
    expect(novo).toContain(`<meta property="og:image" content="${SITE}/uploads/og.png?w=1280">`);
  });

  it('rotas fixas, edital, página institucional e página do portal', async () => {
    await auth(request(app).post('/api/editais')).send({ id: 'ed1', title: 'Edital 01/2026 — Mestrado', description: '<p>Seleção para <b>mestrado</b>.</p>' });
    await garantirPaginasInstitucionais(); // as 14 páginas de endereço próprio (/sobre, /historico…)
    const avulsa = (await auth(request(app).post('/api/pages')).send({ title: 'Página Avulsa', body: { value: '<p>Texto da página avulsa.</p>' } })).body.slug;
    expect(avulsa).toBe('pagina-avulsa');

    const fixa = html(await request(app).get('/editais'));
    expect(fixa).toContain('<title>Painel de Editais | PRPG UFRPE</title>');
    expect(fixa).toContain(`<link rel="canonical" href="${SITE}/editais">`);

    const ed = html(await request(app).get('/editais/ed1'));
    expect(ed).toContain('<title>Edital 01/2026 — Mestrado | PRPG UFRPE</title>');
    expect(ed).toContain('<meta name="description" content="Seleção para mestrado.">');

    const sobre = html(await request(app).get('/sobre'));
    expect(sobre).toContain('<title>Sobre a PRPG | PRPG UFRPE</title>');
    expect(sobre).toContain('<meta name="description" content="Excelência acadêmica, pesquisa de alto nível e compromisso com o desenvolvimento da região Nordeste e do Brasil.">');

    for (const caminho of [`/${avulsa}`, `/p/${avulsa}`]) {
      const h = html(await request(app).get(caminho));
      expect(h, caminho).toContain('<title>Página Avulsa | PRPG UFRPE</title>');
    }
    expect((await request(app).get('/editais/nao-existe')).status).toBe(404);
    expect((await request(app).get('/nada/aqui/nem/la')).status).toBe(404);
  });

  it('áreas restritas e sem conteúdo próprio: noindex, sem canonical nem Open Graph', async () => {
    for (const caminho of ['/admin', '/admin/noticias', '/entrar', '/minha-conta/inscricoes', '/verificar/abc-123', '/declaracoes/proficiencia/abc', '/busca', '/proficiencia/inscricao/sucesso']) {
      const res = await request(app).get(caminho);
      expect(res.status, caminho).toBe(200);
      expect(res.headers['x-robots-tag'], caminho).toMatch(/noindex/);
      expect(html(res), caminho).toContain('<meta name="robots" content="noindex, nofollow">');
      expect(html(res), caminho).not.toMatch(/rel="canonical"|og:title|ld\+json/);
    }
  });

  it('página automática do programa e microsite: título com sigla, redirecionamento quando o microsite não está no ar', async () => {
    await criarPrograma({ nome: 'História', slug: 'pgh', sigla: 'PGH', descricao_curta: 'Mestrado e doutorado em História.', microsite_ativo: true });
    await criarPrograma({ nome: 'Outro Programa', slug: 'outro' });

    const auto = html(await request(app).get('/programas/pgh'));
    expect(auto).toContain('<title>PGH — História | PRPG UFRPE</title>');
    expect(auto).toContain('<meta name="description" content="Mestrado e doutorado em História.">');
    expect(ldJson(auto)[0].itemListElement.map((i) => i.name)).toEqual(['Início', 'Programas', 'História']);

    const site = html(await request(app).get('/pgh'));
    expect(site).toContain(`<link rel="canonical" href="${SITE}/pgh">`);
    const sub = html(await request(app).get('/pgh/noticias'));
    expect(sub).toContain('<title>Notícias — História | PRPG UFRPE</title>');

    for (const caminho of ['/outro', '/outro/noticias']) {
      const r = await request(app).get(caminho).redirects(0);
      expect(r.status, caminho).toBe(302);
      expect(r.headers.location, caminho).toBe('/programas/outro');
    }
    expect((await request(app).get('/pgh/pagina-que-nao-existe')).status).toBe(404);
    expect((await request(app).get('/programas/nao-existe')).status).toBe(404);
  });

  it('as páginas institucionais roteadas aqui são as mesmas do front', () => {
    const app_jsx = fs.readFileSync(path.join(__dirname, '../../src/App.jsx'), 'utf8');
    const doFront = [...app_jsx.matchAll(/path="\/([a-z0-9-]+)" element=\{<PaginaInstitucional slug="\1"/g)].map((m) => m[1]);
    expect([...PAGINAS_ROTEADAS].sort()).toEqual(doFront.sort());
  });
});

describe('P.4 — entrega do build', () => {
  it('arquivos de /assets vêm com cache de um ano; arquivo inexistente é 404 simples', async () => {
    const ok = await request(app).get('/assets/app.abc123.js');
    expect(ok.status).toBe(200);
    expect(ok.headers['cache-control']).toMatch(/max-age=31536000, immutable/);
    const falta = await request(app).get('/assets/antigo.js');
    expect(falta.status).toBe(404);
    expect(falta.headers['content-type']).toMatch(/text\/plain/);
  });

  it('o HTML sai com política própria (scripts só do site) e revalidável', async () => {
    const res = await request(app).get('/noticias');
    expect(res.headers['content-security-policy']).toBe("script-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'self'");
    expect(res.headers['cache-control']).toMatch(/must-revalidate/);
    const etag = res.headers.etag;
    expect(etag).toBeTruthy();
    expect((await request(app).get('/noticias').set('If-None-Match', etag)).status).toBe(304);
  });

  it('/index.html vai para a raiz e a API continua sendo a API', async () => {
    const r = await request(app).get('/index.html').redirects(0);
    expect(r.status).toBe(301);
    expect(r.headers.location).toBe('/');
    const api = await request(app).get('/api/nao-existe');
    expect(api.status).toBe(404);
    expect(api.body).toEqual({ message: 'Recurso não encontrado.' });
    expect((await request(app).get('/api/status')).body.status).toBe('online');
  });

  it('sem build (desenvolvimento) as páginas não são servidas por aqui, mas robots e sitemap continuam', async () => {
    const antes = process.env.SPA_DIST_DIR;
    process.env.SPA_DIST_DIR = path.join(os.tmpdir(), 'prpg-sem-build-nao-existe');
    try {
      expect((await request(app).get('/noticias')).status).toBe(404);
      expect((await request(app).get('/noticias')).headers['content-type']).not.toMatch(/json/);
      expect((await request(app).get('/robots.txt')).status).toBe(200);
      expect((await request(app).get('/sitemap.xml')).status).toBe(200);
    } finally {
      process.env.SPA_DIST_DIR = antes;
    }
  });

  it('SEO_NOINDEX (homologação) põe noindex em tudo e fecha o robots.txt', async () => {
    process.env.SEO_NOINDEX = 'true';
    await noticia({ id: 'n1', title: 'Qualquer' });
    const res = await request(app).get('/noticia/n1');
    expect(res.headers['x-robots-tag']).toMatch(/noindex/);
    expect(html(res)).toContain('<meta name="robots" content="noindex, nofollow">');
    expect(html(res)).not.toContain('rel="canonical"');
    expect((await request(app).get('/robots.txt')).text).toBe('User-agent: *\nDisallow: /\n');
  });
});

describe('P.4 — robots.txt e sitemap.xml', { timeout: 30000 }, () => {
  it('robots.txt libera o público, bloqueia as áreas restritas e aponta o sitemap', async () => {
    const res = await request(app).get('/robots.txt');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/plain/);
    for (const linha of ['User-agent: *', 'Disallow: /admin', 'Disallow: /minha-conta', 'Disallow: /api/', 'Disallow: /verificar/', `Sitemap: ${SITE}/sitemap.xml`]) {
      expect(res.text).toContain(linha);
    }
    expect(res.text).not.toMatch(/^Disallow: \/$/m);
  });

  it('sitemap só traz o que é público e canônico, com lastmod', async () => {
    await garantirPaginasInstitucionais();
    const site = await criarPrograma({ nome: 'Com Site', slug: 'com-site', microsite_ativo: true });
    const sem = await criarPrograma({ nome: 'Sem Site', slug: 'sem-site' });
    await noticia({ id: 'portal', title: 'Do portal', date: '2026-04-01' });
    await noticia({ id: 'rasc', title: 'Rascunho', status: 'RASCUNHO' });
    await noticia({ id: 'agendada', title: 'Futura', publicadoEm: new Date(Date.now() + 86400000).toISOString() });
    await noticia({ id: 'do-site', title: 'No microsite', programaId: site.id, date: '2026-03-01' });
    await noticia({ id: 'sem-microsite', title: 'Programa sem site', programaId: sem.id });
    await auth(request(app).post('/api/editais')).send({ id: 'ed1', title: 'Edital' });
    await auth(request(app).post('/api/editais')).send({ id: 'ed-rasc', title: 'Edital rascunho', status: 'RASCUNHO' });
    await auth(request(app).post('/api/pages')).send({ title: 'Avulsa', body: { value: '<p>Texto</p>' } });
    await auth(request(app).post('/api/pages')).send({ title: 'Vazia', body: { value: '<p>&nbsp;</p>' } });
    await auth(request(app).post('/api/pages')).send({ title: 'Extra', programaId: site.id, body: { value: '<p>Texto</p>' } });
    await auth(request(app).post('/api/pages')).send({ title: 'Rascunho', status: 'RASCUNHO', body: { value: '<p>Texto</p>' } });

    const res = await request(app).get('/sitemap.xml');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/xml/);
    expect(res.text.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    const locs = [...res.text.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].replace(SITE, ''));

    for (const esperado of ['/', '/editais', '/noticias', '/programas/com-site', '/programas/sem-site', '/com-site', '/noticia/portal',
      '/com-site/noticias/do-site', '/com-site/noticias', '/noticia/sem-microsite', '/editais/ed1', '/sobre', '/historico', '/p/avulsa', '/com-site/extra']) {
      expect(locs, esperado).toContain(esperado);
    }
    for (const proibido of ['/noticia/rasc', '/noticia/agendada', '/noticia/do-site', '/editais/ed-rasc', '/p/vazia', '/vazia', '/p/rascunho', '/sem-site', '/admin']) {
      expect(locs, proibido).not.toContain(proibido);
    }
    expect(new Set(locs).size).toBe(locs.length); // sem duplicatas
    expect(res.text).toMatch(/<loc>[^<]*\/noticia\/portal<\/loc><lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/);
  });
});
