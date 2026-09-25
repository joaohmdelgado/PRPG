import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';
import { pool } from '../db/pool.js';
import { resetDb, seedAdmin, loginAdmin, login } from './helpers.js';

// Fase F.1/F.2 (docs/revisao-portal-conteudo-2026-09-24.md): envelope de
// publicação — rascunho, agendamento, visibilidade por papel, edição
// concorrente e o contrato de listagem paginada.

let adminToken;
const auth = (req, token = adminToken) => req.set('Authorization', `Bearer ${token}`);

beforeEach(async () => {
  await resetDb();
  await seedAdmin();
  adminToken = await loginAdmin();
});

afterAll(async () => {
  await pool.end();
});

const ids = (res) => (Array.isArray(res.body) ? res.body : res.body.items).map((i) => i.id).sort();

describe('F.1 — rascunho e agendamento', () => {
  it('conteúdo novo nasce PUBLICADO e com criado_em/atualizado_em', async () => {
    const res = await auth(request(app).post('/api/news')).send({ id: 'n1', title: 'N1' });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('PUBLICADO');
    expect(res.body.criado_em).toBeTruthy();
    expect(res.body.atualizado_em).toBeTruthy();
  });

  it('rascunho não aparece para o público (lista e item) e aparece para o admin', async () => {
    await auth(request(app).post('/api/news')).send({ id: 'pub', title: 'Publicada' });
    await auth(request(app).post('/api/news')).send({ id: 'rasc', title: 'Rascunho', status: 'RASCUNHO' });

    expect(ids(await request(app).get('/api/news'))).toEqual(['pub']);
    expect((await request(app).get('/api/news/rasc')).status).toBe(404);

    expect(ids(await auth(request(app).get('/api/news')))).toEqual(['pub', 'rasc']);
    expect((await auth(request(app).get('/api/news/rasc'))).status).toBe(200);
    // ?status= restringe a lista do painel
    expect(ids(await auth(request(app).get('/api/news?status=RASCUNHO')))).toEqual(['rasc']);
  });

  it('agendado só aparece a partir de publicado_em', async () => {
    const futuro = new Date(Date.now() + 86400000).toISOString();
    const passado = new Date(Date.now() - 86400000).toISOString();
    await auth(request(app).post('/api/editais')).send({ id: 'fut', title: 'Futuro', publicadoEm: futuro });
    await auth(request(app).post('/api/editais')).send({ id: 'pas', title: 'Passado', publicadoEm: passado });
    expect(ids(await request(app).get('/api/editais'))).toEqual(['pas']);
  });

  it('arquivado sai do público; vale para as 11 tabelas de conteúdo', async () => {
    const criar = [
      ['/api/resolucoes', { title: 'R' }], ['/api/formularios', { title: 'F' }],
      ['/api/faq', { title: 'Q' }], ['/api/disciplinas', { title: 'D' }],
      ['/api/teses-dissertacoes', { title: 'T' }], ['/api/bolsas', { title: 'B' }],
      ['/api/calendarios', { title: 'C', ano: 2026 }], ['/api/pages', { title: 'P' }],
    ];
    for (const [url, body] of criar) {
      const r = await auth(request(app).post(url)).send({ ...body, status: 'ARQUIVADO' });
      expect(r.status, url).toBe(201);
      expect((await request(app).get(url)).body, url).toEqual([]);
      expect((await auth(request(app).get(url))).body.length, url).toBe(1);
    }
  });

  it('edital de proficiência em rascunho não abre inscrições', async () => {
    await auth(request(app).post('/api/editais')).send({
      id: 'prof', title: 'Proficiência', proficiencia: true, status: 'RASCUNHO',
      field_periodo: { data_inicio: '2000-01-01', data_fim: '2999-12-31' },
    });
    const res = await request(app).get('/api/proficiencia/periodo-aberto');
    expect(res.body).toBeNull();
  });
});

describe('F.1 — Gestor de Programa vê rascunho só do próprio programa', () => {
  it('rascunho do programa A: gestor A vê, gestor B e público não', async () => {
    const criarProg = async (nome, slug) =>
      (await auth(request(app).post('/api/programas')).send({ nome, slug, microsite_ativo: true })).body.id;
    const a = await criarProg('Prog A', 'pa');
    const b = await criarProg('Prog B', 'pb');
    for (const [email, programaId] of [['ga@x.br', a], ['gb@x.br', b]]) {
      await auth(request(app).post('/api/users')).send({ email, password: 'senha123', roles: ['GestorPrograma'], programaId });
    }
    const tokenA = await login('ga@x.br');
    const tokenB = await login('gb@x.br');
    await auth(request(app).post('/api/news')).send({ id: 'ra', title: 'Rasc A', programaId: a, status: 'RASCUNHO' });

    expect(ids(await auth(request(app).get('/api/news'), tokenA))).toContain('ra');
    expect(ids(await auth(request(app).get('/api/news'), tokenB))).not.toContain('ra');
    expect(ids(await request(app).get('/api/news'))).not.toContain('ra');
  });
});

describe('F.1 — microsite conta e busca só o publicado', () => {
  it('contadores, busca e menu ignoram rascunho para o público', async () => {
    const prog = (await auth(request(app).post('/api/programas')).send({ nome: 'PPG M', slug: 'ppgm', microsite_ativo: true })).body;
    await auth(request(app).post('/api/disciplinas')).send({ title: 'Disciplina Oculta', programaId: prog.id, status: 'RASCUNHO' });
    await auth(request(app).post('/api/disciplinas')).send({ title: 'Disciplina Visível', programaId: prog.id });
    await auth(request(app).post('/api/pages')).send({ title: 'Página Oculta', programaId: prog.id, status: 'RASCUNHO' });

    const pub = (await request(app).get('/api/programas/slug/ppgm')).body;
    expect(pub.modulos.disciplinas).toBe(1);
    expect(pub.paginas).toEqual([]);

    const busca = (await request(app).get('/api/programas/slug/ppgm/busca?q=Disciplina')).body;
    const titulos = JSON.stringify(busca);
    expect(titulos).toContain('Disciplina Visível');
    expect(titulos).not.toContain('Disciplina Oculta');

    // quem edita vê a página em rascunho no menu (pré-visualização)
    const admin = (await auth(request(app).get('/api/programas/slug/ppgm'))).body;
    expect(admin.paginas.map((p) => p.title)).toEqual(['Página Oculta']);
  });
});

describe('F.2 — edição concorrente', () => {
  it('salvar com versão desatualizada devolve 409; com a versão atual, 200', async () => {
    const criado = (await auth(request(app).post('/api/news')).send({ id: 'c1', title: 'Original' })).body;
    const versaoInicial = criado.atualizado_em;

    const primeiro = await auth(request(app).put('/api/news/c1')).send({ title: 'Pessoa A', _versao: versaoInicial });
    expect(primeiro.status).toBe(200);

    const segundo = await auth(request(app).put('/api/news/c1')).send({ title: 'Pessoa B', _versao: versaoInicial });
    expect(segundo.status).toBe(409);
    expect(segundo.body.message).toMatch(/alterado por outra pessoa/);
    expect((await request(app).get('/api/news/c1')).body.title).toBe('Pessoa A');

    const terceiro = await auth(request(app).put('/api/news/c1')).send({ title: 'Pessoa B', _versao: primeiro.body.atualizado_em });
    expect(terceiro.status).toBe(200);
  });

  it('sem _versao o comportamento antigo continua (último salva)', async () => {
    await auth(request(app).post('/api/faq')).send({ id: 'q1', title: 'Q' });
    expect((await auth(request(app).put('/api/faq/q1')).send({ title: 'Q2' })).status).toBe(200);
  });

  it('calendário (repositório próprio) também detecta conflito', async () => {
    const cal = (await auth(request(app).post('/api/calendarios')).send({ id: 'cal1', title: 'C', ano: 2026 })).body;
    await auth(request(app).put('/api/calendarios/cal1')).send({ title: 'C2', _versao: cal.atualizado_em });
    const res = await auth(request(app).put('/api/calendarios/cal1')).send({ title: 'C3', _versao: cal.atualizado_em });
    expect(res.status).toBe(409);
  });
});

describe('F.2/F.3 — contrato de listagem', () => {
  beforeEach(async () => {
    for (let i = 1; i <= 25; i++) {
      await auth(request(app).post('/api/news')).send({
        id: `n${String(i).padStart(2, '0')}`, title: `Notícia ${i}`, excerpt: i % 2 ? 'ímpar' : 'par',
        date: `2026-01-${String(i).padStart(2, '0')}`, categorySlug: i <= 5 ? 'eventos' : 'pesquisa',
        content: ['<p>corpo longo</p>'],
      });
    }
  });

  it('sem page/limit continua devolvendo array (compatível)', async () => {
    const res = await request(app).get('/api/news');
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(25);
  });

  it('com page/limit devolve { items, total, page, limit, pages }', async () => {
    const res = await request(app).get('/api/news?page=2&limit=10');
    expect(res.body).toMatchObject({ total: 25, page: 2, limit: 10, pages: 3 });
    expect(res.body.items).toHaveLength(10);
    expect(res.body.items[0].id).toBe('n15'); // ordem: data desc
  });

  it('filtros de notícia no servidor: q (sem acento), categoria, ano, excluir, resumo', async () => {
    const q = await request(app).get('/api/news?q=IMPAR');
    expect(q.body).toHaveLength(13);
    const cat = await request(app).get('/api/news?categoria=eventos&excluir=n01');
    expect(cat.body.map((n) => n.id).sort()).toEqual(['n02', 'n03', 'n04', 'n05']);
    expect((await request(app).get('/api/news?ano=2025')).body).toEqual([]);
    const resumo = await request(app).get('/api/news?resumo=1&limit=1');
    expect(resumo.body.items[0].content).toBeUndefined();
    expect(resumo.body.items[0].title).toBeTruthy();
  });

  it('limit tem teto de 100', async () => {
    const res = await request(app).get('/api/news?limit=5000');
    expect(res.body.limit).toBe(100);
  });
});
