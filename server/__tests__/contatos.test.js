import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';
import { pool } from '../db/pool.js';
import { resetDb, seedAdmin, loginAdmin, seedUser } from './helpers.js';

let adminToken;

beforeEach(async () => {
  await resetDb();
  await seedAdmin();
  adminToken = await loginAdmin();
});

afterAll(async () => {
  await pool.end();
});

const asAdmin = (req) => req.set('Authorization', `Bearer ${adminToken}`);

async function criarProgramaComCoordenador(nomeCoord = 'Coordenador A') {
  await seedUser({ id: 'coord-a', email: 'coorda@test.com', roles: ['Professor'], perfil_geral: { nome: nomeCoord } });
  const res = await asAdmin(request(app).post('/api/programas')).send({
    nome: 'PPG Teste', sigla: 'ppgt', modalidades: [],
    coordenador_atual: { pessoa_id: 'coord-a', portaria: 'Port. 1' },
  });
  return res.body.id;
}

describe('GET /api/contatos/agenda', () => {
  it('lista o coordenador ativo, agrupável por cargo', async () => {
    await criarProgramaComCoordenador();
    const res = await asAdmin(request(app).get('/api/contatos/agenda?papel=COORDENADOR_ATUAL'));
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].nome).toBe('Coordenador A');
    expect(res.body[0].programaSigla).toBe('PPGT');
    expect(res.body[0].contatos).toEqual([]);
  });

  it('filtra por busca livre (nome, sigla)', async () => {
    await criarProgramaComCoordenador();
    const achou = await asAdmin(request(app).get('/api/contatos/agenda?q=PPGT'));
    expect(achou.body).toHaveLength(1);
    const naoAchou = await asAdmin(request(app).get('/api/contatos/agenda?q=inexistente'));
    expect(naoAchou.body).toHaveLength(0);
  });
});

describe('GET /api/contatos/agenda/contadores', () => {
  it('devolve contador por cargo e total', async () => {
    await criarProgramaComCoordenador();
    const res = await asAdmin(request(app).get('/api/contatos/agenda/contadores'));
    expect(res.status).toBe(200);
    expect(res.body.COORDENADOR_ATUAL).toBe(1);
    expect(res.body.TODOS).toBe(1);
  });
});

describe('CRUD de contatos da pessoa', () => {
  it('cria, lista e remove um contato de e-mail', async () => {
    await criarProgramaComCoordenador();
    const agenda = await asAdmin(request(app).get('/api/contatos/agenda?papel=COORDENADOR_ATUAL'));
    const pessoaId = agenda.body[0].pessoaId;

    const criado = await asAdmin(request(app).post(`/api/contatos/pessoa/${pessoaId}`))
      .send({ tipo: 'EMAIL', valor: 'Coord.A@UFRPE.br', rotulo: 'institucional', publico: true });
    expect(criado.status).toBe(201);
    expect(criado.body.valor).toBe('coord.a@ufrpe.br'); // normalizado

    const lista = await asAdmin(request(app).get(`/api/contatos/pessoa/${pessoaId}`));
    expect(lista.body).toHaveLength(1);

    const agendaComContato = await asAdmin(request(app).get('/api/contatos/agenda?papel=COORDENADOR_ATUAL'));
    expect(agendaComContato.body[0].contatos).toHaveLength(1);

    const del = await asAdmin(request(app).delete(`/api/contatos/${criado.body.id}`));
    expect(del.status).toBe(200);
    const listaVazia = await asAdmin(request(app).get(`/api/contatos/pessoa/${pessoaId}`));
    expect(listaVazia.body).toHaveLength(0);
  });

  it('exige tipo e valor', async () => {
    const res = await asAdmin(request(app).post('/api/contatos/pessoa/qualquer')).send({ tipo: 'EMAIL' });
    expect(res.status).toBe(400);
  });
});

describe('CRUD de contatos do programa', () => {
  it('cria e lista contato do programa', async () => {
    const progId = await criarProgramaComCoordenador();
    const criado = await asAdmin(request(app).post(`/api/contatos/programa/${progId}`))
      .send({ tipo: 'EMAIL', valor: 'secretaria.ppgt@ufrpe.br', rotulo: 'secretaria' });
    expect(criado.status).toBe(201);
    const lista = await asAdmin(request(app).get(`/api/contatos/programa/${progId}`));
    expect(lista.body).toHaveLength(1);
  });
});

describe('exportação XLSX', () => {
  it('exporta a agenda em xlsx', async () => {
    await criarProgramaComCoordenador();
    const res = await asAdmin(request(app).get('/api/contatos/agenda/exportar.xlsx'));
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/spreadsheetml/);
  });
});

describe('controle de acesso', () => {
  it('exige autenticação', async () => {
    const res = await request(app).get('/api/contatos/agenda');
    expect(res.status).toBe(401);
  });
});
