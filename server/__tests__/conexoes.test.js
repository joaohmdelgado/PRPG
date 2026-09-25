import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';
import { pool } from '../db/pool.js';
import { resetDb, seedAdmin, loginAdmin } from './helpers.js';

// Fase N (docs/revisao-portal-conteudo-2026-09-24.md): conexões entre
// conteúdos — editais agregados (N.1), página de todo programa (N.2) e
// repositório de teses (N.3).

let adminToken;
const auth = (req) => req.set('Authorization', `Bearer ${adminToken}`);
const isoEm = (dias) => new Date(Date.now() + dias * 86400000).toISOString().slice(0, 10);

beforeEach(async () => {
  await resetDb();
  await seedAdmin();
  adminToken = await loginAdmin();
});

afterAll(async () => {
  await pool.end();
});

const criarPrograma = async (dados) => (await auth(request(app).post('/api/programas')).send(dados)).body.id;

describe('N.1 — editais da PRPG e dos programas', () => {
  it('cada edital de programa traz selo e link; S/SIGLA não vira selo', async () => {
    const comSite = await criarPrograma({ nome: 'Com Site', sigla: 'PCS', slug: 'pcs', microsite_ativo: true });
    const semSite = await criarPrograma({ nome: 'Sem Site', sigla: 'S/SIGLA', slug: 'sem-site' });
    await auth(request(app).post('/api/editais')).send({ id: 'e1', title: 'A', programaId: comSite });
    await auth(request(app).post('/api/editais')).send({ id: 'e2', title: 'B', programaId: semSite });
    await auth(request(app).post('/api/editais')).send({ id: 'e3', title: 'C' });

    const res = await request(app).get('/api/editais?escopo=portal');
    const porId = Object.fromEntries(res.body.map((e) => [e.id, e]));
    expect(porId.e1.programa).toMatchObject({ sigla: 'PCS', link: '/pcs' });
    expect(porId.e2.programa).toMatchObject({ sigla: null, nome: 'Sem Site', link: '/programas/sem-site' });
    expect(porId.e3.programa).toBeNull();

    const soProgramas = await request(app).get('/api/editais?escopo=programas');
    expect(soProgramas.body.map((e) => e.id).sort()).toEqual(['e1', 'e2']);
    const abertas = await request(app).get('/api/editais?situacao=abertas');
    expect(abertas.body).toEqual([]);
  });
});

describe('N.2 — página pública de todo programa', () => {
  it('reúne dados, coordenação, editais em aberto e teses, sem contato pessoal', async () => {
    const id = await criarPrograma({
      nome: 'Programa Automático', sigla: 'PA', slug: 'pa', email_programa: 'pa@ufrpe.br',
      modalidades: [{ tipo: 'M', nota_capes: '4' }],
    });
    await pool.query(`INSERT INTO pessoas (id, nome, email_institucional) VALUES ('p1', 'Coord Um', 'pessoal@x.br')`);
    await pool.query(`INSERT INTO vinculos (id, programa_id, pessoa_id, papel, ativo) VALUES ('v1', $1, 'p1', 'COORDENADOR_ATUAL', TRUE)`, [id]);
    await auth(request(app).post('/api/editais')).send({
      id: 'aberto', title: 'Seleção', programaId: id, field_periodo: { data_inicio: isoEm(-1), data_fim: isoEm(5) },
    });
    await auth(request(app).post('/api/editais')).send({
      id: 'velho', title: 'Antigo', programaId: id, field_periodo: { data_inicio: isoEm(-60), data_fim: isoEm(-30) },
    });
    await auth(request(app).post('/api/editais')).send({ id: 'rasc', title: 'Rascunho', programaId: id, status: 'RASCUNHO' });

    const res = await request(app).get('/api/programas/slug/pa/publico');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ nome: 'Programa Automático', sigla: 'PA', site: false, email_programa: 'pa@ufrpe.br' });
    expect(res.body.coordenacao).toEqual([{ nome: 'Coord Um', papel: 'Coordenação' }]);
    expect(res.body.editais.map((e) => e.id)).toEqual(['aberto']);
    expect(JSON.stringify(res.body)).not.toContain('pessoal@x.br');
    expect((await request(app).get('/api/programas/slug/nao-existe/publico')).status).toBe(404);
  });
});

describe('N.3 — repositório de teses', () => {
  const criarTese = (dados) => auth(request(app).post('/api/teses-dissertacoes')).send(dados);

  it('filtra por tipo, ano e texto (inclui nomes) e traz as opções dos filtros', async () => {
    const prog = await criarPrograma({ nome: 'Prog T', sigla: 'PT', slug: 'pt' });
    await pool.query(`INSERT INTO pessoas (id, nome, email_institucional) VALUES
      ('aut', 'Autora Fulana', 'autora@x.br'), ('ori', 'Orientador Beltrano', 'ori@x.br')`);
    await criarTese({ id: 't1', title: 'Solos do agreste', tipo: 'Dissertação', ano: '2024-01-01', programaId: prog, autorId: 'aut', orientadorId: 'ori' });
    await criarTese({ id: 't2', title: 'Aves marinhas', tipo: 'Tese', ano: '2022-01-01', programaId: prog });

    const tudo = await request(app).get('/api/teses-dissertacoes?page=1&limit=10');
    expect(tudo.body.total).toBe(2);
    expect(tudo.body.anos).toEqual(['2024', '2022']);
    expect(tudo.body.tipos).toEqual(['Dissertação', 'Tese']);
    expect(tudo.body.orientadores).toEqual([{ id: 'ori', nome: 'Orientador Beltrano' }]);
    expect(tudo.body.items[0].programa).toMatchObject({ sigla: 'PT', link: '/programas/pt' });

    const ids = async (qs) => (await request(app).get(`/api/teses-dissertacoes?page=1&limit=10&${qs}`)).body.items.map((t) => t.id);
    expect(await ids('tipo=Tese')).toEqual(['t2']);
    expect(await ids('ano=2024')).toEqual(['t1']);
    expect(await ids('q=beltrano')).toEqual(['t1']);
    expect(await ids('orientador=ori')).toEqual(['t1']);
  });

  it('o público não recebe o e-mail de autor/orientador; o painel recebe', async () => {
    await pool.query(`INSERT INTO pessoas (id, nome, email_institucional) VALUES ('aut', 'Autora', 'autora@x.br')`);
    await criarTese({ id: 't1', title: 'X', autorId: 'aut' });
    expect((await request(app).get('/api/teses-dissertacoes')).body[0].autor).toEqual({ id: 'aut', nome: 'Autora' });
    expect((await auth(request(app).get('/api/teses-dissertacoes'))).body[0].autor.email).toBe('autora@x.br');
    expect((await request(app).get('/api/teses-dissertacoes/t1')).body.autor).not.toHaveProperty('email');
  });
});

describe('N.5 — relacionados', () => {
  it('liga nos dois sentidos, o público só vê o que está publicado, e some ao excluir', async () => {
    await auth(request(app).post('/api/editais')).send({ id: 'e1', title: 'Seleção 2026' });
    await auth(request(app).post('/api/resolucoes')).send({ id: 'r1', title: 'Resolução 10/2020', link: 'https://x/r.pdf' });
    await auth(request(app).post('/api/news')).send({ id: 'n1', title: 'Rascunho', status: 'RASCUNHO' });

    const put = await auth(request(app).put('/api/referencias/edital/e1'))
      .send({ itens: [{ tipo: 'resolucao', id: 'r1' }, { tipo: 'noticia', id: 'n1' }, { tipo: 'edital', id: 'e1' }] });
    expect(put.status).toBe(200);
    expect(put.body.map((i) => i.id)).toEqual(['r1', 'n1']); // a ligação consigo mesmo é ignorada

    const pub = await request(app).get('/api/referencias/edital/e1');
    expect(pub.body).toEqual([expect.objectContaining({ tipo: 'resolucao', id: 'r1', destino: 'https://x/r.pdf', rotuloTipo: 'Resolução' })]);
    // Sentido inverso: a resolução mostra o edital.
    expect((await request(app).get('/api/referencias/resolucao/r1')).body.map((i) => i.destino)).toEqual(['/editais/e1']);

    await auth(request(app).delete('/api/resolucoes/r1'));
    const { rows } = await pool.query('SELECT count(*)::int AS n FROM referencias');
    expect(rows[0].n).toBe(1); // sobrou só edital -> notícia
  });

  it('valida itens e acesso; busca candidatos por título sem acento', async () => {
    await auth(request(app).post('/api/editais')).send({ id: 'e1', title: 'Edital de Proficiência' });
    expect((await request(app).put('/api/referencias/edital/e1').send({ itens: [] })).status).toBe(401);
    expect((await auth(request(app).put('/api/referencias/edital/e1')).send({ itens: [{ tipo: 'noticia', id: 'nao-existe' }] })).status).toBe(400);
    expect((await auth(request(app).put('/api/referencias/edital/e1')).send({ itens: [{ tipo: 'usuario', id: 'x' }] })).status).toBe(400);
    expect((await request(app).get('/api/referencias/processo/1')).status).toBe(404);
    const cand = await auth(request(app).get('/api/referencias-candidatos?q=proficiencia'));
    expect(cand.body.map((c) => `${c.tipo}:${c.id}`)).toEqual(['edital:e1']);
  });
});
