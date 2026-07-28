import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';
import { pool } from '../db/pool.js';
import { resetDb, seedAdmin, loginAdmin, login } from './helpers.js';

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

const NUP_VALIDO = '23082.123456/2026-01';

const novoProcesso = (over = {}) => ({
  numero: NUP_VALIDO, assunto: 'Assunto de teste', ...over,
});

describe('processos — CRUD e unicidade do NUP', () => {
  it('cria um processo', async () => {
    const res = await asAdmin(request(app).post('/api/camara/processos')).send(novoProcesso());
    expect(res.status).toBe(201);
    expect(res.body.numero).toBe(NUP_VALIDO);
    expect(res.body.status).toBe('RECEBIDO');
  });

  it('rejeita NUP duplicado', async () => {
    await asAdmin(request(app).post('/api/camara/processos')).send(novoProcesso());
    const res = await asAdmin(request(app).post('/api/camara/processos')).send(novoProcesso());
    expect(res.status).toBe(409);
  });

  it('atualiza e remove um processo', async () => {
    const created = await asAdmin(request(app).post('/api/camara/processos')).send(novoProcesso());
    const id = created.body.id;

    const upd = await asAdmin(request(app).put(`/api/camara/processos/${id}`)).send({ assunto: 'Novo assunto' });
    expect(upd.status).toBe(200);
    expect(upd.body.assunto).toBe('Novo assunto');

    const del = await asAdmin(request(app).delete(`/api/camara/processos/${id}`));
    expect(del.status).toBe(200);
    const getAfter = await asAdmin(request(app).get(`/api/camara/processos/${id}`));
    expect(getAfter.status).toBe(404);
  });
});

describe('validação do NUP', () => {
  it('grava numero_valido=false para NUP fora do padrão, sem bloquear a criação', async () => {
    const res = await asAdmin(request(app).post('/api/camara/processos'))
      .send(novoProcesso({ numero: '12345/2026' }));
    expect(res.status).toBe(201);
    expect(res.body.numeroValido).toBe(false);
  });

  it('grava numero_valido=true para NUP no padrão', async () => {
    const res = await asAdmin(request(app).post('/api/camara/processos')).send(novoProcesso());
    expect(res.body.numeroValido).toBe(true);
  });
});

describe('eventos — linha do tempo append-only (Fase B.1: tabela genérica eventos)', () => {
  it('PATCH /localizacao cria evento e atualiza o cache de localização no processo', async () => {
    const created = await asAdmin(request(app).post('/api/camara/processos')).send(novoProcesso());
    const id = created.body.id;

    const unidade = await asAdmin(request(app).post('/api/camara/unidades'))
      .send({ sigla: 'TST', nome: 'Setor de Teste' });
    const unidadeId = unidade.body.id;

    const res = await asAdmin(request(app).patch(`/api/camara/processos/${id}/localizacao`))
      .send({ unidadeId, data: '2026-01-10', descricao: 'Enviado ao setor de teste' });
    expect(res.status).toBe(200);
    expect(res.body.localizacaoId).toBe(unidadeId);

    const detalhe = await asAdmin(request(app).get(`/api/camara/processos/${id}`));
    expect(detalhe.body.eventos.length).toBeGreaterThan(0);
    const evento = detalhe.body.eventos.find((e) => e.tipo === 'TRAMITACAO');
    expect(evento).toBeTruthy();
    expect(evento.descricao).toBe('Enviado ao setor de teste');

    const { rows } = await pool.query(
      "SELECT * FROM eventos WHERE entidade = 'processo' AND entidade_id = $1", [id]
    );
    expect(rows.length).toBeGreaterThan(0);
  });
});

describe('pauta — reuniões', () => {
  async function criarProcesso(numero = NUP_VALIDO) {
    const res = await asAdmin(request(app).post('/api/camara/processos')).send(novoProcesso({ numero }));
    return res.body.id;
  }
  async function criarReuniao(data = '2026-02-01') {
    const res = await asAdmin(request(app).post('/api/camara/reunioes')).send({ data });
    return res.body.id;
  }

  it('pautar o mesmo processo duas vezes na mesma reunião falha (UNIQUE)', async () => {
    const processoId = await criarProcesso();
    const reuniaoId = await criarReuniao();

    const primeira = await asAdmin(request(app).post(`/api/camara/reunioes/${reuniaoId}/pauta`))
      .send({ processoIds: [processoId] });
    expect(primeira.status).toBe(201);
    expect(primeira.body).toHaveLength(1);

    // Repetir o mesmo processo na mesma reunião é ignorado silenciosamente (UNIQUE).
    const repetida = await asAdmin(request(app).post(`/api/camara/reunioes/${reuniaoId}/pauta`))
      .send({ processoIds: [processoId] });
    expect(repetida.status).toBe(201);
    expect(repetida.body).toHaveLength(0);

    const pauta = await asAdmin(request(app).get(`/api/camara/reunioes/${reuniaoId}/pauta`));
    expect(pauta.body).toHaveLength(1);
  });

  it('repautar em reunião diferente cria novo item e preserva o anterior', async () => {
    const processoId = await criarProcesso();
    const reuniao1 = await criarReuniao('2026-02-01');
    const reuniao2 = await criarReuniao('2026-03-01');

    await asAdmin(request(app).post(`/api/camara/reunioes/${reuniao1}/pauta`)).send({ processoIds: [processoId] });
    await asAdmin(request(app).post(`/api/camara/reunioes/${reuniao2}/pauta`)).send({ processoIds: [processoId] });

    const pauta1 = await asAdmin(request(app).get(`/api/camara/reunioes/${reuniao1}/pauta`));
    const pauta2 = await asAdmin(request(app).get(`/api/camara/reunioes/${reuniao2}/pauta`));
    expect(pauta1.body).toHaveLength(1);
    expect(pauta2.body).toHaveLength(1);
  });

  it('lançamento em lote de deliberações grava evento em cada processo', async () => {
    const processoId = await criarProcesso();
    const reuniaoId = await criarReuniao();
    const itemPauta = await asAdmin(request(app).post(`/api/camara/reunioes/${reuniaoId}/pauta`))
      .send({ processoIds: [processoId] });
    const itemId = itemPauta.body[0].id;

    const res = await asAdmin(request(app).put(`/api/camara/reunioes/${reuniaoId}/resultados`))
      .send({ itens: [{ id: itemId, deliberacao: 'APROVADO', statusResultante: 'DELIBERADO' }] });
    expect(res.status).toBe(200);

    const detalhe = await asAdmin(request(app).get(`/api/camara/processos/${processoId}`));
    expect(detalhe.body.status).toBe('DELIBERADO');
    const eventoDeliberacao = detalhe.body.eventos.find((e) => e.tipo === 'DELIBERACAO');
    expect(eventoDeliberacao).toBeTruthy();
  });
});

describe('controle de acesso', () => {
  let gestorToken;
  let programaA;

  beforeEach(async () => {
    const prog = await asAdmin(request(app).post('/api/programas'))
      .send({ nome: 'Programa A', sigla: 'pga', modalidades: [] });
    programaA = prog.body.id;

    await asAdmin(request(app).post('/api/users')).send({
      email: 'gestor@pga.com', password: 'senha123',
      roles: ['GestorPrograma'], programaId: programaA, perfil_geral: { nome: 'Gestor A' },
    });
    gestorToken = await login('gestor@pga.com');
  });

  const asGestor = (req) => req.set('Authorization', `Bearer ${gestorToken}`);

  it('GestorPrograma só lê processos do seu próprio programa', async () => {
    await asAdmin(request(app).post('/api/camara/processos'))
      .send(novoProcesso({ numero: '23082.111111/2026-01', programaId: programaA }));
    await asAdmin(request(app).post('/api/camara/processos'))
      .send(novoProcesso({ numero: '23082.222222/2026-01' })); // sem programa

    const res = await asGestor(request(app).get('/api/camara/processos'));
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].programaId).toBe(programaA);
  });

  it('processo sigiloso do seu programa é invisível para o GestorPrograma', async () => {
    await asAdmin(request(app).post('/api/camara/processos'))
      .send(novoProcesso({ numero: '23082.333333/2026-01', programaId: programaA, sigiloso: true }));

    const lista = await asGestor(request(app).get('/api/camara/processos'));
    expect(lista.body).toHaveLength(0);
  });
});
