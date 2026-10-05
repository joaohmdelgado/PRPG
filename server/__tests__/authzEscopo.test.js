import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';
import { pool } from '../db/pool.js';
import { resetDb, seedAdmin, loginAdmin, login } from './helpers.js';

// SEC-01 / AUTH-01 (docs/analise-prontidao-producao-2026-09-09.md): escopo do
// Gestor de Programa nas rotas que o checam dentro do controller, e papéis e
// programa lidos do banco a cada requisição (não do token de 30 dias).
let adminToken;
let A;
let B;
let gpB;

const como = (token) => (req) => req.set('Authorization', `Bearer ${token}`);
const asAdmin = (req) => como(adminToken)(req);

const programa = async (nome, sigla) => (await asAdmin(request(app).post('/api/programas'))
  .send({ nome, sigla, modalidades: [{ tipo: 'MESTRADO', ano_inicio: 2020, nota_capes: '4' }] })).body.id;

const usuario = async (email, roles, programaId) => {
  const res = await asAdmin(request(app).post('/api/users'))
    .send({ email, password: 'senhaBoa123', roles, programaId, perfil_geral: { nome: email } });
  return res.body.id;
};

beforeEach(async () => {
  await resetDb();
  await seedAdmin();
  adminToken = await loginAdmin();
  A = await programa('Programa A', 'pga');
  B = await programa('Programa B', 'pgb');
  await usuario('gpb@t.br', ['GestorPrograma'], B);
  gpB = await login('gpb@t.br', 'senhaBoa123');
});
afterAll(async () => { await pool.end(); });

const fixturesDoA = async () => {
  const linha = (await asAdmin(request(app).post('/api/linhas-pesquisa')).send({ nome: 'Linha A', programa_id: A })).body;
  const ref = (await asAdmin(request(app).post('/api/taxonomia-refs')).send({ campo: 'entrada', valor: '2024.1', programa_id: A })).body;
  const posdoc = (await asAdmin(request(app).post('/api/pos-doutorado'))
    .send({ pessoaNome: 'Fulana', supervisorNome: 'Beltrano', projetoTitulo: 'Projeto A', programaId: A })).body;
  const noticia = (await asAdmin(request(app).post('/api/news')).send({ title: 'Notícia A', programaId: A })).body;
  expect([linha.id, ref.id, posdoc.id, noticia.id].every(Boolean)).toBe(true);
  return { linha, ref, posdoc, noticia };
};

describe('gestor de programa não alcança outro programa (escopo no controller)', () => {
  it('linhas, taxonomia, pós-doc, revisões e relacionados do programa A negam o gestor de B', async () => {
    const { linha, ref, posdoc, noticia } = await fixturesDoA();
    await asAdmin(request(app).put(`/api/news/${noticia.id}`)).send({ title: 'Notícia A v2' });
    const revisoes = (await asAdmin(request(app).get(`/api/revisoes/news/${noticia.id}`))).body;
    const revisaoId = (revisoes.items || revisoes)[0]?.id;
    expect(revisaoId).toBeTruthy();

    const tentativas = [
      ['put', `/api/linhas-pesquisa/${linha.id}`, { nome: 'hack' }],
      ['delete', `/api/linhas-pesquisa/${linha.id}`],
      ['put', `/api/taxonomia-refs/${ref.id}`, { campo: 'entrada', valor: 'hack' }],
      ['delete', `/api/taxonomia-refs/${ref.id}`],
      ['put', `/api/pos-doutorado/${posdoc.id}`, { projetoTitulo: 'hack' }],
      ['patch', `/api/pos-doutorado/${posdoc.id}/situacao`, { situacao: 'ENCERRADO' }],
      ['put', `/api/referencias/noticia/${noticia.id}`, { itens: [] }],
      ['post', `/api/revisoes/news/${noticia.id}/${revisaoId}/restaurar`, {}],
    ];
    for (const [metodo, url, corpo] of tentativas) {
      const res = await como(gpB)(request(app)[metodo](url)).send(corpo || {});
      expect(res.status, `${metodo.toUpperCase()} ${url}`).toBe(403);
    }

    const { rows } = await pool.query(
      `SELECT (SELECT nome FROM linhas_pesquisa WHERE id = $1) AS linha,
              (SELECT title FROM news WHERE id = $2) AS noticia`, [linha.id, noticia.id]);
    expect(rows[0]).toEqual({ linha: 'Linha A', noticia: 'Notícia A v2' });
  });
});

describe('papéis e programa vêm do banco, não do token', () => {
  it('rebaixar um Gestor tira o poder do token já emitido', async () => {
    const id = await usuario('gestor@t.br', ['Gestor']);
    const token = await login('gestor@t.br', 'senhaBoa123');
    expect((await como(token)(request(app).get('/api/users'))).status).toBe(200);

    expect((await asAdmin(request(app).put(`/api/users/${id}`)).send({ roles: ['Aluno'] })).status).toBe(200);
    expect((await como(token)(request(app).get('/api/users'))).status).toBe(403);
  });

  it('gestor transferido de programa passa a valer só no novo', async () => {
    const minha = (await como(gpB)(request(app).post('/api/linhas-pesquisa')).send({ nome: 'Linha B' })).body;
    expect(minha.programa_id).toBe(B);

    const gpId = (await pool.query("SELECT id FROM users WHERE email = 'gpb@t.br'")).rows[0].id;
    expect((await asAdmin(request(app).put(`/api/users/${gpId}`)).send({ programaId: A })).status).toBe(200);

    expect((await como(gpB)(request(app).put(`/api/linhas-pesquisa/${minha.id}`)).send({ nome: 'x' })).status).toBe(403);
  });

  it('gestor cujo programa foi excluído não alcança nada além da própria conta', async () => {
    const { linha } = await fixturesDoA();
    expect((await asAdmin(request(app).delete(`/api/programas/${B}`))).status).toBe(200);
    expect((await pool.query("SELECT programa_id FROM users WHERE email = 'gpb@t.br'")).rows[0].programa_id).toBeNull();
    // Novo login: o token agora também sai sem programa.
    const token = await login('gpb@t.br', 'senhaBoa123');

    for (const [metodo, url, corpo] of [
      ['put', `/api/linhas-pesquisa/${linha.id}`, { nome: 'hack' }],
      ['post', '/api/pos-doutorado', { pessoaNome: 'X', supervisorNome: 'Y', projetoTitulo: 'Z' }],
      ['post', '/api/news', { title: 'sem programa' }],
    ]) {
      const res = await como(token)(request(app)[metodo](url)).send(corpo);
      expect(res.status, `${metodo.toUpperCase()} ${url}`).toBe(403);
    }
    expect((await como(token)(request(app).get('/api/minha-conta'))).status).toBe(200);
    expect((await pool.query('SELECT nome FROM linhas_pesquisa WHERE id = $1', [linha.id])).rows[0].nome).toBe('Linha A');
  });
});
