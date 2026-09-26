import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';
import { pool } from '../db/pool.js';
import { resetDb, seedAdmin, seedUser, loginAdmin } from './helpers.js';
import { ordenarLista, responderLista } from '../utils/listagem.js';

// Fase U.3 — ordenação, busca e paginação no servidor para a tabela do painel.

let token;
const asAdmin = (req) => req.set('Authorization', `Bearer ${token}`);

beforeEach(async () => {
  await resetDb();
  await seedAdmin();
  token = await loginAdmin();
});

afterAll(async () => {
  await pool.end();
});

describe('ordenarLista (unidade)', () => {
  const itens = [{ n: 'banana', v: 2 }, { n: 'Árvore', v: null }, { n: 'abacaxi', v: 10 }, { n: 'cereja', v: 1 }];
  const ord = { n: (i) => i.n, v: (i) => i.v };

  it('ordena sem diferenciar acento/caixa, e números como números', () => {
    expect(ordenarLista(itens, { ordenar: 'n' }, ord).map((i) => i.n)).toEqual(['abacaxi', 'Árvore', 'banana', 'cereja']);
    expect(ordenarLista(itens, { ordenar: 'v' }, ord).map((i) => i.v)).toEqual([1, 2, 10, null]);
  });

  it('vazios ficam no fim nos dois sentidos', () => {
    expect(ordenarLista(itens, { ordenar: 'v', dir: 'desc' }, ord).map((i) => i.v)).toEqual([10, 2, 1, null]);
  });

  it('campo fora da lista é ignorado (nunca um caminho arbitrário do objeto)', () => {
    for (const campo of ['title', 'constructor', '__proto__', 'toString', 'hasOwnProperty']) {
      expect(ordenarLista(itens, { ordenar: campo }, ord)).toBe(itens);
    }
    expect(ordenarLista(itens, { ordenar: 'n' }, undefined)).toBe(itens);
  });

  it('é estável: itens iguais mantêm a ordem original', () => {
    const iguais = [{ k: 1, id: 'a' }, { k: 1, id: 'b' }, { k: 0, id: 'c' }, { k: 1, id: 'd' }];
    expect(ordenarLista(iguais, { ordenar: 'k' }, { k: (i) => i.k }).map((i) => i.id)).toEqual(['c', 'a', 'b', 'd']);
  });

  it('responderLista pagina depois de buscar e ordenar', () => {
    let corpo;
    const res = { json: (c) => { corpo = c; } };
    responderLista(res, itens, { q: 'a', ordenar: 'n', page: '2', limit: '2' }, { busca: ['n'], ordenaveis: ord });
    // "a" casa com abacaxi, Árvore, banana (cereja não tem "a"? tem: c-e-r-e-j-a) → 4 itens; página 2 de 2
    expect(corpo.total).toBe(4);
    expect(corpo.pages).toBe(2);
    expect(corpo.items.map((i) => i.n)).toEqual(['banana', 'cereja']);
  });
});

describe('listagens do painel', () => {
  const criarNoticias = async () => {
    for (const [title, date] of [['Zebra na UFRPE', '2026-01-10'], ['Águia Real', '2026-03-05'], ['Bicho-preguiça', null], ['abelha', '2026-02-01']]) {
      const r = await asAdmin(request(app).post('/api/news')).send({ title, date: date || undefined, category: 'Geral', categorySlug: 'geral' });
      expect(r.status).toBe(201);
    }
  };

  it('ordena por título nos dois sentidos, sem diferenciar acento, e pagina no servidor', async () => {
    await criarNoticias();
    const asc = await asAdmin(request(app).get('/api/news?ordenar=title&dir=asc&page=1&limit=3'));
    expect(asc.status).toBe(200);
    expect(asc.body).toMatchObject({ total: 4, page: 1, limit: 3, pages: 2 });
    expect(asc.body.items.map((n) => n.title)).toEqual(['abelha', 'Águia Real', 'Bicho-preguiça']);

    const pagina2 = await asAdmin(request(app).get('/api/news?ordenar=title&dir=asc&page=2&limit=3'));
    expect(pagina2.body.items.map((n) => n.title)).toEqual(['Zebra na UFRPE']);

    const desc = await asAdmin(request(app).get('/api/news?ordenar=title&dir=desc&limit=10'));
    expect(desc.body.items.map((n) => n.title)).toEqual(['Zebra na UFRPE', 'Bicho-preguiça', 'Águia Real', 'abelha']);
  });

  it('data em branco fica no fim mesmo em ordem decrescente', async () => {
    await criarNoticias();
    const res = await asAdmin(request(app).get('/api/news?ordenar=date&dir=desc&limit=10'));
    const titulos = res.body.items.map((n) => n.title);
    expect(titulos[titulos.length - 1]).toBe('Bicho-preguiça');
    expect(titulos[0]).toBe('Águia Real');
  });

  it('ordenar por campo inexistente não quebra nem muda a ordem padrão', async () => {
    await criarNoticias();
    const padrao = await asAdmin(request(app).get('/api/news?limit=10'));
    const ruim = await asAdmin(request(app).get('/api/news?ordenar=__proto__&limit=10'));
    expect(ruim.status).toBe(200);
    expect(ruim.body.items.map((n) => n.id)).toEqual(padrao.body.items.map((n) => n.id));
  });

  it('busca em editais sem diferenciar acento e combina com ordenação', async () => {
    for (const title of ['Seleção de Mestrado', 'Seleção de Doutorado', 'Bolsas de Pesquisa']) {
      const r = await asAdmin(request(app).post('/api/editais')).send({ title, categoryId: 'selecao', categoryTitle: 'Seleção' });
      expect(r.status).toBe(201);
    }
    const res = await asAdmin(request(app).get('/api/editais?q=selecao&ordenar=title&dir=desc&page=1&limit=10'));
    expect(res.status).toBe(200);
    expect(res.body.items.map((e) => e.title)).toEqual(['Seleção de Mestrado', 'Seleção de Doutorado', 'Bolsas de Pesquisa']);
    const so = await asAdmin(request(app).get('/api/editais?q=doutorado&page=1&limit=10'));
    expect(so.body.items.map((e) => e.title)).toEqual(['Seleção de Doutorado']);
    expect(so.body.total).toBe(1);
  });

  it('resolucoes e faq aceitam ?q e ?ordenar', async () => {
    for (const title of ['Regimento Geral', 'Norma de bolsas']) {
      await asAdmin(request(app).post('/api/resolucoes')).send({ title, sectionTitle: 'Normas', categoryTitle: 'Geral' });
    }
    const r = await asAdmin(request(app).get('/api/resolucoes?ordenar=title&dir=desc&page=1&limit=5'));
    expect(r.body.items.map((x) => x.title)).toEqual(['Regimento Geral', 'Norma de bolsas']);
    const b = await asAdmin(request(app).get('/api/resolucoes?q=BOLSAS'));
    expect(b.body.map((x) => x.title)).toEqual(['Norma de bolsas']);
  });
});

describe('usuários, programas e páginas (U.3)', () => {
  it('usuários: busca por nome/e-mail sem acento, filtra por papel, ordena e devolve as opções dos filtros', async () => {
    await seedUser({ id: 'u1', email: 'joao@test.com', roles: ['Aluno'], perfil_geral: { nome: 'João Álvares' } });
    await seedUser({ id: 'u2', email: 'maria@test.com', roles: ['Professor'], perfil_geral: { nome: 'Maria Souza' } });
    await seedUser({ id: 'u3', email: 'ana@test.com', roles: ['Aluno', 'Professor'], perfil_geral: { nome: 'Ana Lima' } });

    const todos = await asAdmin(request(app).get('/api/users?ordenar=nome&page=1&limit=2'));
    expect(todos.status).toBe(200);
    expect(todos.body.total).toBe(4); // + o admin do teste
    expect(todos.body.pages).toBe(2);
    expect(todos.body.items.map((u) => u.perfil_geral.nome)).toEqual(['Admin Teste', 'Ana Lima']);
    expect(todos.body.roles).toEqual(['Administrator', 'Aluno', 'Professor']);
    expect(JSON.stringify(todos.body)).not.toContain('password_hash');

    const busca = await asAdmin(request(app).get('/api/users?q=joao alvares&page=1'));
    expect(busca.body.items.map((u) => u.id)).toEqual(['u1']);

    const professores = await asAdmin(request(app).get('/api/users?role=Professor&ordenar=nome&dir=desc&page=1'));
    expect(professores.body.items.map((u) => u.id)).toEqual(['u2', 'u3']);

    // Sem paginação continua sendo o array (formulários que usam /api/users).
    const array = await asAdmin(request(app).get('/api/users'));
    expect(Array.isArray(array.body)).toBe(true);
  });

  it('programas: array sem paginação (site público) e paginado/ordenado/buscável no painel', async () => {
    for (const [nome, sigla, campus] of [['Ciência Animal', 'PPGCA', 'Sede'], ['Botânica', 'PPGB', 'Sede'], ['Agronomia', 'PPGA', 'UAST']]) {
      const r = await asAdmin(request(app).post('/api/programas')).send({ nome, sigla, campus });
      expect(r.status).toBe(201);
    }
    const publico = await request(app).get('/api/programas');
    expect(Array.isArray(publico.body)).toBe(true);
    expect(publico.body).toHaveLength(3);

    const pag = await asAdmin(request(app).get('/api/programas?ordenar=nome&dir=desc&page=1&limit=2'));
    expect(pag.body.items.map((p) => p.nome)).toEqual(['Ciência Animal', 'Botânica']);
    expect(pag.body.total).toBe(3);
    const busca = await asAdmin(request(app).get('/api/programas?q=uast&page=1'));
    expect(busca.body.items.map((p) => p.nome)).toEqual(['Agronomia']);
  });

  it('páginas: busca no texto, só as gerais (escopo=prpg) e sem fixas vazias', async () => {
    const prog = await asAdmin(request(app).post('/api/programas')).send({ nome: 'Programa X', sigla: 'PX' });
    const programaId = prog.body.id;
    await asAdmin(request(app).post('/api/pages')).send({ title: 'Regimento Geral', body: { value: '<p>texto sobre bolsas</p>' } });
    await asAdmin(request(app).post('/api/pages')).send({ title: 'Do Programa', programaId, body: { value: '<p>outro assunto</p>' } });
    // Criar o programa já cria as 6 páginas fixas do microsite (vazias).
    const todas = await asAdmin(request(app).get('/api/pages?page=1&limit=20'));
    expect(todas.body.total).toBe(2 + 6);
    const semFixas = await asAdmin(request(app).get('/api/pages?semFixasVazias=1&page=1&limit=10'));
    expect(semFixas.body.items.map((p) => p.title).sort()).toEqual(['Do Programa', 'Regimento Geral']);
    const gerais = await asAdmin(request(app).get('/api/pages?escopo=prpg&page=1&limit=10'));
    expect(gerais.body.items.map((p) => p.title)).toEqual(['Regimento Geral']);
    const noTexto = await asAdmin(request(app).get('/api/pages?q=bolsas&page=1&limit=10'));
    expect(noTexto.body.items.map((p) => p.title)).toEqual(['Regimento Geral']);
    const doPrograma = await asAdmin(request(app).get(`/api/pages?programa=${programaId}&semFixasVazias=1&page=1&limit=10`));
    expect(doPrograma.body.items.map((p) => p.title)).toEqual(['Do Programa']);
  });
});
