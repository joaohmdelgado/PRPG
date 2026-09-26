import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';
import { pool } from '../db/pool.js';
import { resetDb, seedAdmin, seedUser, loginAdmin, login } from './helpers.js';

// Fase U.5 — /api/busca ampliada aos tipos de conteúdo (busca do painel, Ctrl+K).

let adminToken;
let gestorToken;
let programaA;
let programaB;

const asAdmin = (req) => req.set('Authorization', `Bearer ${adminToken}`);
const asGestor = (req) => req.set('Authorization', `Bearer ${gestorToken}`);
const busca = (as, q) => as(request(app).get('/api/busca').query({ q }));
const titulos = (lista) => lista.map((i) => i.titulo).sort();

beforeEach(async () => {
  await resetDb();
  await seedAdmin();
  adminToken = await loginAdmin();

  programaA = (await asAdmin(request(app).post('/api/programas')).send({ nome: 'Programa Alfa', sigla: 'PGA' })).body.id;
  programaB = (await asAdmin(request(app).post('/api/programas')).send({ nome: 'Programa Beta', sigla: 'PGB' })).body.id;
  await asAdmin(request(app).post('/api/users')).send({
    email: 'gestor@pga.com', password: 'senha123', roles: ['GestorPrograma'], programaId: programaA, perfil_geral: { nome: 'Gestor A' },
  });
  gestorToken = await login('gestor@pga.com');
});

afterAll(async () => {
  await pool.end();
});

describe('busca do painel por tipo de conteúdo', () => {
  it('encontra notícia (inclusive rascunho), edital, resolução, formulário, página, tese, FAQ e disciplina', async () => {
    await asAdmin(request(app).post('/api/news')).send({ title: 'Seleção aberta para o mestrado', category: 'Geral', status: 'RASCUNHO' });
    await asAdmin(request(app).post('/api/editais')).send({ title: 'Edital de seleção 2026', numero: '01/2026', categoryTitle: 'Seleção' });
    await asAdmin(request(app).post('/api/resolucoes')).send({ title: 'Resolução sobre seleção', sectionTitle: 'Normas' });
    await asAdmin(request(app).post('/api/formularios')).send({ title: 'Formulário de seleção', sectionTitle: 'Alunos' });
    await asAdmin(request(app).post('/api/pages')).send({ title: 'Como funciona a seleção', body: { value: '<p>x</p>' } });
    await asAdmin(request(app).post('/api/faq')).send({ title: 'Quando é a seleção?', resposta: 'Em março' });
    await asAdmin(request(app).post('/api/teses-dissertacoes')).send({ title: 'Análise da seleção de sementes', tipo: 'Tese' });
    await asAdmin(request(app).post('/api/disciplinas')).send({ title: 'Seleção de plantas', tipoDisciplina: 'Optativa' });

    // Sem acento, sem caixa: "SELECAO" encontra "seleção".
    const res = await busca(asAdmin, 'SELECAO');
    expect(res.status).toBe(200);
    for (const chave of ['noticias', 'editais', 'resolucoes', 'formularios', 'paginas', 'faq', 'teses', 'disciplinas']) {
      expect(res.body[chave], chave).toHaveLength(1);
    }
    expect(res.body.noticias[0]).toMatchObject({ titulo: 'Seleção aberta para o mestrado', status: 'RASCUNHO' });
    expect(res.body.editais[0].detalhe).toBe('01/2026');
    expect(res.body.processos).toEqual([]);
  });

  it('encontra programa, usuário e bolsa; ignora buscas curtas', async () => {
    await seedUser({ id: 'u1', email: 'maria@test.com', roles: ['Professor'], perfil_geral: { nome: 'Maria Conceição' } });
    await asAdmin(request(app).post('/api/bolsas')).send({ title: 'Bolsa CAPES de mestrado', tipoBolsa: 'CAPES' });

    const p = await busca(asAdmin, 'alfa');
    expect(titulos(p.body.programas)).toEqual(['Programa Alfa']);
    const u = await busca(asAdmin, 'conceicao');
    expect(u.body.usuarios).toEqual([{ id: 'u1', titulo: 'Maria Conceição', detalhe: 'maria@test.com' }]);
    const b = await busca(asAdmin, 'capes');
    expect(titulos(b.body.bolsas)).toEqual(['Bolsa CAPES de mestrado']);

    const curta = await busca(asAdmin, 'a');
    expect(curta.body.noticias).toEqual([]);
    expect(curta.body.usuarios).toEqual([]);
  });

  it('% e _ digitados são texto, não curinga', async () => {
    await asAdmin(request(app).post('/api/news')).send({ title: 'Reajuste de 50% na bolsa', category: 'Geral' });
    await asAdmin(request(app).post('/api/news')).send({ title: 'Outra notícia qualquer', category: 'Geral' });
    const literal = await busca(asAdmin, '50%');
    expect(titulos(literal.body.noticias)).toEqual(['Reajuste de 50% na bolsa']);
    const coringa = await busca(asAdmin, '%%');
    expect(coringa.body.noticias).toEqual([]);
    const sublinhado = await busca(asAdmin, 'o_tra');
    expect(sublinhado.body.noticias).toEqual([]);
  });
});

describe('escopo do Gestor de Programa', () => {
  it('só encontra conteúdo do próprio programa, sem usuários, bolsas nem programas alheios', async () => {
    await asAdmin(request(app).post('/api/news')).send({ title: 'Notícia do programa Alfa', category: 'Geral', programaId: programaA });
    await asAdmin(request(app).post('/api/news')).send({ title: 'Notícia do programa Beta', category: 'Geral', programaId: programaB });
    await asAdmin(request(app).post('/api/news')).send({ title: 'Notícia geral da PRPG', category: 'Geral' });
    await asAdmin(request(app).post('/api/bolsas')).send({ title: 'Bolsa do programa', tipoBolsa: 'CAPES' });

    const res = await busca(asGestor, 'notícia');
    expect(titulos(res.body.noticias)).toEqual(['Notícia do programa Alfa']);

    const prog = await busca(asGestor, 'programa');
    expect(titulos(prog.body.programas)).toEqual(['Programa Alfa']);
    expect(prog.body.bolsas).toEqual([]);

    const gente = await busca(asGestor, 'gestor');
    expect(gente.body.usuarios).toEqual([]);
  });

  it('exige papel do painel', async () => {
    await seedUser({ id: 'al', email: 'aluno@test.com', roles: ['Aluno'], perfil_geral: { nome: 'Aluno' } });
    const token = await login('aluno@test.com');
    const res = await request(app).get('/api/busca').query({ q: 'teste' }).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });
});
