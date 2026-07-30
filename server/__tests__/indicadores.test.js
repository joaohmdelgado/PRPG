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

describe('indicadores — Câmara (K.2)', () => {
  it('calcula processos ativos, backlog por setor e carga por relator', async () => {
    const proc = await asAdmin(request(app).post('/api/camara/processos'))
      .send({ numero: '23082.333333/2026-01', assunto: 'Processo indicadores' });
    await pool.query(
      `INSERT INTO camara_relatorias (id, processo_id, relator_id, relator_nome, ativa, criado_em)
       VALUES ('rel-ind-1', $1, NULL, 'Relator Indicadores', TRUE, now())`,
      [proc.body.id]
    );

    const res = await asAdmin(request(app).get('/api/camara/indicadores'));
    expect(res.status).toBe(200);
    expect(res.body.processosAtivos).toBeGreaterThanOrEqual(1);
    expect(res.body.cargaPorRelator.some((r) => r.relator === 'Relator Indicadores')).toBe(true);
    expect(res.body).toHaveProperty('agingMedioDias');
    expect(res.body).toHaveProperty('processosReincidentes');
    expect(res.body).toHaveProperty('tempoMedioResolucaoDias');
  });
});

describe('indicadores — PNPD (K.3)', () => {
  it('calcula vigentes, relatórios pendentes, concentração por supervisor e qualidade do cadastro', async () => {
    await asAdmin(request(app).post('/api/pos-doutorado')).send({
      pessoaNome: 'Posdoc Indicadores', supervisorNome: 'Supervisor Indicadores',
      projetoTitulo: 'Projeto', dataInicio: new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10),
      dataFim: new Date(Date.now() + 300 * 86400000).toISOString().slice(0, 10),
    });

    const res = await asAdmin(request(app).get('/api/pos-doutorado/indicadores'));
    expect(res.status).toBe(200);
    expect(res.body.vigentes).toBeGreaterThanOrEqual(1);
    expect(res.body.concentracaoPorSupervisor.some((s) => s.supervisor === 'Supervisor Indicadores')).toBe(true);
    expect(res.body.qualidadeCadastro).toHaveProperty('semCpf');
  });

  it('exporta o extrato Sucupira em xlsx', async () => {
    const res = await asAdmin(request(app).get('/api/pos-doutorado/exportar-sucupira.xlsx'));
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('spreadsheetml');
  });
});

describe('indicadores — Expedientes (K.4)', () => {
  it('calcula reservas pendentes, sem PDF, por destinatário e por série/ano', async () => {
    await asAdmin(request(app).post('/api/atos/reservar')).send({ serieId: 'OFICIO', ano: new Date().getFullYear(), assunto: 'Reserva teste' });
    await asAdmin(request(app).post('/api/atos')).send({ serieId: 'PORTARIA_PRPG', ano: new Date().getFullYear(), assunto: 'Emitido teste', situacao: 'EMITIDO' });

    const res = await asAdmin(request(app).get('/api/atos/indicadores'));
    expect(res.status).toBe(200);
    expect(res.body.reservasPendentes).toBeGreaterThanOrEqual(1);
    expect(res.body.semPdf).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(res.body.porSerieAno)).toBe(true);
  });
});

describe('K.7 — autosserviço do GestorPrograma no PNPD', () => {
  let gestorToken, programaA;

  beforeEach(async () => {
    const prog = await asAdmin(request(app).post('/api/programas')).send({ nome: 'Programa K7', sigla: 'pk7', modalidades: [] });
    programaA = prog.body.id;
    await asAdmin(request(app).post('/api/users')).send({
      email: 'gestor@pk7.com', password: 'senha123',
      roles: ['GestorPrograma'], programaId: programaA, perfil_geral: { nome: 'Gestor K7' },
    });
    gestorToken = await login('gestor@pk7.com');
  });

  const asGestor = (req) => req.set('Authorization', `Bearer ${gestorToken}`);

  it('GestorPrograma cadastra um pós-doc, forçado ao seu próprio programa', async () => {
    const res = await asGestor(request(app).post('/api/pos-doutorado')).send({
      pessoaNome: 'Posdoc do Gestor', supervisorNome: 'Supervisor Z', projetoTitulo: 'Projeto Z',
      programaId: 'outro-programa-tentativa',
    });
    expect(res.status).toBe(201);
    expect(res.body.programaId).toBe(programaA);
  });

  it('GestorPrograma não acessa/edita pós-doc de outro programa', async () => {
    const outro = await asAdmin(request(app).post('/api/pos-doutorado')).send({
      pessoaNome: 'Posdoc de outro programa', supervisorNome: 'Supervisor W', projetoTitulo: 'Projeto W',
    });
    const res = await asGestor(request(app).put(`/api/pos-doutorado/${outro.body.id}`)).send({ projetoTitulo: 'Alterado' });
    expect(res.status).toBe(403);
  });

  it('GestorPrograma não pode excluir (só Administrator)', async () => {
    const meu = await asGestor(request(app).post('/api/pos-doutorado')).send({
      pessoaNome: 'Posdoc Excluir', supervisorNome: 'Supervisor V', projetoTitulo: 'Projeto V',
    });
    const res = await asGestor(request(app).delete(`/api/pos-doutorado/${meu.body.id}`));
    expect(res.status).toBe(403);
  });
});
