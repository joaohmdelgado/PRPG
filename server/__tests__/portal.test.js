import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';
import { pool } from '../db/pool.js';
import { resetDb, seedAdmin, seedUser, loginAdmin, login } from './helpers.js';

// Fase H.1 (docs/revisao-portal-conteudo-2026-09-24.md): menus, atalhos e
// contato do portal no banco.

let adminToken;
const auth = (req, token = adminToken) => req.set('Authorization', `Bearer ${token}`);

beforeEach(async () => {
  await resetDb();
  await seedAdmin();
  adminToken = await loginAdmin();
  await pool.query(`INSERT INTO menus (chave, nome, niveis, campos) VALUES
    ('principal', 'Menu principal', 2, '{}'), ('acesso-rapido', 'Acesso rápido', 1, '{icone}')`);
});

afterAll(async () => {
  await pool.end();
});

const arvore = [
  { rotulo: 'A Pós', filhos: [{ rotulo: 'Sobre', destino: '/sobre' }, { rotulo: 'Oculto', destino: '/x', ativo: false }] },
  { rotulo: 'Notícias', destino: '/noticias' },
  { rotulo: 'Grupo inativo', ativo: false, filhos: [{ rotulo: 'Filho', destino: '/f' }] },
];

describe('H.1 — menus', () => {
  it('Admin substitui a árvore; o público vê só os itens ativos, na ordem enviada', async () => {
    const put = await auth(request(app).put('/api/menus/principal')).send({ itens: arvore });
    expect(put.status).toBe(200);
    expect(put.body).toHaveLength(3);

    const pub = await request(app).get('/api/menus');
    expect(pub.status).toBe(200);
    expect(pub.body.principal.map((i) => i.rotulo)).toEqual(['A Pós', 'Notícias']);
    expect(pub.body.principal[0].filhos.map((i) => i.rotulo)).toEqual(['Sobre']);

    // Salvar de novo substitui (não duplica).
    await auth(request(app).put('/api/menus/principal')).send({ itens: [{ rotulo: 'Só um', destino: '/' }] });
    expect((await request(app).get('/api/menus/principal')).body.map((i) => i.rotulo)).toEqual(['Só um']);
  });

  it('editor (?todos=1) recebe as listas com descrição e os itens inativos', async () => {
    await auth(request(app).put('/api/menus/principal')).send({ itens: arvore });
    const res = await auth(request(app).get('/api/menus?todos=1'));
    const principal = res.body.find((m) => m.chave === 'principal');
    expect(principal.niveis).toBe(2);
    expect(principal.itens).toHaveLength(3);
    // Sem papel de edição, ?todos=1 é ignorado.
    const pub = await request(app).get('/api/menus?todos=1');
    expect(Array.isArray(pub.body)).toBe(false);
  });

  it('valida rótulo, destino, ícone e profundidade', async () => {
    const put = (itens, chave = 'principal') => auth(request(app).put(`/api/menus/${chave}`)).send({ itens });
    expect((await put([{ destino: '/x' }])).status).toBe(400);
    expect((await put([{ rotulo: 'X', destino: 'javascript:alert(1)' }])).status).toBe(400);
    expect((await put([{ rotulo: 'X', icone: '"><script>' }], 'acesso-rapido')).status).toBe(400);
    expect((await put([{ rotulo: 'X', filhos: [{ rotulo: 'Y' }] }], 'acesso-rapido')).status).toBe(400);
    expect((await put([{ rotulo: 'X', filhos: [{ rotulo: 'Y', filhos: [{ rotulo: 'Z' }] }] }])).status).toBe(400);
    expect((await put([{ rotulo: 'X' }], 'nao-existe')).status).toBe(404);
    expect((await put([{ rotulo: 'X', destino: 'https://ufrpe.br', icone: 'fa-solid fa-globe' }], 'acesso-rapido')).status).toBe(200);
  });

  it('só Admin/Gestor editam', async () => {
    await seedUser({ id: 'u1', email: 'aluno@x.br', roles: ['Aluno'] });
    const token = await login('aluno@x.br');
    expect((await request(app).put('/api/menus/principal').send({ itens: [] })).status).toBe(401);
    expect((await auth(request(app).put('/api/menus/principal'), token).send({ itens: [] })).status).toBe(403);
  });
});

describe('H.1 — configurações do portal', () => {
  it('grava só os campos conhecidos e o público lê', async () => {
    const res = await auth(request(app).put('/api/configuracoes/contato'))
      .send({ email: 'x@ufrpe.br', telefone: '81 1234', intruso: 'não' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ email: 'x@ufrpe.br', telefone: '81 1234' });
    expect((await request(app).get('/api/configuracoes')).body.contato.email).toBe('x@ufrpe.br');
  });

  it('rejeita chave desconhecida, imagem e mapa inválidos', async () => {
    expect((await auth(request(app).put('/api/configuracoes/segredo')).send({})).status).toBe(404);
    expect((await auth(request(app).put('/api/configuracoes/home')).send({ imagem: 'javascript:x' })).status).toBe(400);
    expect((await auth(request(app).put('/api/configuracoes/contato')).send({ mapa: 'https://evil.example/' })).status).toBe(400);
  });
});

describe('H.2 — home dirigida por dados e escopo do portal (D-R1)', () => {
  const criarProg = async (nome, slug) =>
    (await auth(request(app).post('/api/programas')).send({ nome, slug, sigla: slug.toUpperCase() })).body.id;
  const isoEm = (dias) => new Date(Date.now() + dias * 86400000).toISOString().slice(0, 10);

  it('?escopo=portal: notícia de programa só entra se marcada; edital de programa entra sempre', async () => {
    const p = await criarProg('Prog', 'pp');
    await auth(request(app).post('/api/news')).send({ id: 'geral', title: 'Geral' });
    await auth(request(app).post('/api/news')).send({ id: 'prog-sim', title: 'Sim', programaId: p, destaque: true });
    await auth(request(app).post('/api/news')).send({ id: 'prog-nao', title: 'Não', programaId: p });
    await auth(request(app).post('/api/editais')).send({ id: 'ed-prog', title: 'Edital', programaId: p });
    const ids = (r) => r.body.map((i) => i.id).sort();
    expect(ids(await request(app).get('/api/news?escopo=portal'))).toEqual(['geral', 'prog-sim']);
    expect(ids(await request(app).get('/api/editais?escopo=portal'))).toEqual(['ed-prog']);
  });

  it('/api/portal/home: destaque, editais abertos com selo, prazos e números', async () => {
    const p = await criarProg('Programa X', 'px');
    await auth(request(app).post('/api/news')).send({ id: 'n1', title: 'Antiga destaque', date: '2026-01-01', destaque: true });
    await auth(request(app).post('/api/news')).send({ id: 'n2', title: 'Recente', date: '2026-05-01' });
    await auth(request(app).post('/api/news')).send({ id: 'n3', title: 'Rascunho', date: '2026-06-01', status: 'RASCUNHO' });
    await auth(request(app).post('/api/editais')).send({
      id: 'e1', title: 'Seleção X', programaId: p,
      field_periodo: { data_inicio: isoEm(-5), data_fim: isoEm(10) },
    });
    await auth(request(app).post('/api/editais')).send({
      id: 'e2', title: 'Encerrado', field_periodo: { data_inicio: isoEm(-50), data_fim: isoEm(-20) },
    });
    const [a, m, d] = isoEm(30).split('-');
    await auth(request(app).post('/api/calendarios')).send({
      id: 'c1', ano: 2026, isCurrent: true, title: 'Cal',
      milestones: [{ event: 'Passado', date: '01/01/2020' }, { event: 'Matrícula', date: `até ${d}/${m}/${a}` }],
    });

    const res = await request(app).get('/api/portal/home');
    expect(res.status).toBe(200);
    expect(res.body.destaque.id).toBe('n1');
    expect(res.body.destaque).not.toHaveProperty('content');
    expect(res.body.noticias.map((n) => n.id)).toEqual(['n2']);
    expect(res.body.editais.map((e) => e.id)).toEqual(['e1']);
    expect(res.body.editais[0].programa).toMatchObject({ slug: 'px', sigla: 'PX' });
    expect(res.body.prazos.map((x) => x.titulo)).toEqual(['Inscrições: Seleção X', 'Matrícula']);
    expect(res.body.numeros.programas).toBeGreaterThanOrEqual(1);
  });
});
