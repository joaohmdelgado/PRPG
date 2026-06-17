import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';
import { pool } from '../db/pool.js';
import { resetDb, seedAdmin, seedUser, login, loginAdmin } from './helpers.js';
import { calcularResultado, validarLinguas } from '../controllers/proficienciaController.js';

let adminToken;
let alunoToken;

beforeEach(async () => {
  await resetDb();
  await seedAdmin();
  adminToken = await loginAdmin();
  await seedUser({
    id: 'aluno-1', email: 'aluno@test.com', roles: ['Aluno'],
    perfil_geral: { nome: 'João da Silva', cpf: '111.222.333-44' },
  });
  alunoToken = await login('aluno@test.com');
});

afterAll(async () => {
  await pool.end();
});

const asAdmin = (req) => req.set('Authorization', `Bearer ${adminToken}`);
const asAluno = (req) => req.set('Authorization', `Bearer ${alunoToken}`);

// Cria um edital de proficiência com período aberto (cobre hoje) e devolve seu id.
async function criarPeriodoAberto() {
  const res = await asAdmin(request(app).post('/api/editais'))
    .send({
      title: 'Proficiência Teste',
      proficiencia: true,
      field_periodo: { data_inicio: '2000-01-01', data_fim: '2999-12-31' },
    });
  return res.body.id;
}

// ============================ Unit: regras ============================

describe('calcularResultado', () => {
  it('classifica as faixas: <5 insuficiente, 5–7 suficiência, >7 proficiência', () => {
    expect(calcularResultado(4.9)).toBe('INSUFICIENTE');
    expect(calcularResultado(5)).toBe('SUFICIENCIA');
    expect(calcularResultado(7)).toBe('SUFICIENCIA');
    expect(calcularResultado(7.01)).toBe('PROFICIENCIA');
    expect(calcularResultado(10)).toBe('PROFICIENCIA');
  });
});

describe('validarLinguas', () => {
  it('mestrado exige exatamente uma língua', () => {
    expect(validarLinguas({ linguas: ['Inglês'], nivel: 'Mestrado', estrangeiro: false }).ok).toBe(true);
    expect(validarLinguas({ linguas: ['Inglês', 'Espanhol'], nivel: 'Mestrado', estrangeiro: false }).ok).toBe(false);
  });
  it('doutorado permite até duas línguas', () => {
    expect(validarLinguas({ linguas: ['Inglês', 'Espanhol'], nivel: 'Doutorado', estrangeiro: false }).ok).toBe(true);
    expect(validarLinguas({ linguas: ['Inglês', 'Espanhol', 'Português'], nivel: 'Doutorado', estrangeiro: false }).ok).toBe(false);
  });
  it('estrangeiro exige Português + mais uma', () => {
    expect(validarLinguas({ linguas: ['Português', 'Inglês'], nivel: 'Mestrado', estrangeiro: true }).ok).toBe(true);
    expect(validarLinguas({ linguas: ['Inglês', 'Espanhol'], nivel: 'Mestrado', estrangeiro: true }).ok).toBe(false);
    expect(validarLinguas({ linguas: ['Português'], nivel: 'Mestrado', estrangeiro: true }).ok).toBe(false);
  });
  it('rejeita língua inválida e duplicatas', () => {
    expect(validarLinguas({ linguas: ['Alemão'], nivel: 'Mestrado', estrangeiro: false }).ok).toBe(false);
    expect(validarLinguas({ linguas: ['Inglês', 'Inglês'], nivel: 'Doutorado', estrangeiro: false }).ok).toBe(false);
  });
});

// ========================= Integração: fluxo =========================

describe('inscrição', () => {
  it('rejeita inscrição quando não há período aberto', async () => {
    const res = await asAluno(request(app).post('/api/proficiencia/inscricoes'))
      .send({ nivel: 'Mestrado', linguas: ['Inglês'], comprovanteResidenciaUrl: '/uploads/x.pdf' });
    expect(res.status).toBe(409);
  });

  it('aluno se inscreve em um período aberto (mestrado, uma língua)', async () => {
    await criarPeriodoAberto();
    const res = await asAluno(request(app).post('/api/proficiencia/inscricoes'))
      .send({ nivel: 'Mestrado', linguas: ['Inglês'], comprovanteResidenciaUrl: '/uploads/comp.pdf' });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('INSCRITO');
    expect(res.body.nome).toBe('João da Silva');
    expect(res.body.cpf).toBe('111.222.333-44');
    expect(res.body.linguas).toEqual(['Inglês']);
  });

  it('exige comprovante de vínculo quando não é o titular', async () => {
    await criarPeriodoAberto();
    const res = await asAluno(request(app).post('/api/proficiencia/inscricoes'))
      .send({
        nivel: 'Mestrado', linguas: ['Inglês'], comprovanteResidenciaUrl: '/uploads/comp.pdf',
        titularComprovante: false,
      });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/vínculo/i);
  });

  it('aplica as regras de língua via API (mestrado não pode duas)', async () => {
    await criarPeriodoAberto();
    const res = await asAluno(request(app).post('/api/proficiencia/inscricoes'))
      .send({ nivel: 'Mestrado', linguas: ['Inglês', 'Espanhol'], comprovanteResidenciaUrl: '/uploads/c.pdf' });
    expect(res.status).toBe(400);
  });

  it('impede duas inscrições no mesmo período', async () => {
    await criarPeriodoAberto();
    const body = { nivel: 'Mestrado', linguas: ['Inglês'], comprovanteResidenciaUrl: '/uploads/c.pdf' };
    await asAluno(request(app).post('/api/proficiencia/inscricoes')).send(body);
    const res = await asAluno(request(app).post('/api/proficiencia/inscricoes')).send(body);
    expect(res.status).toBe(409);
  });

  it('aluno só enxerga as próprias inscrições', async () => {
    await criarPeriodoAberto();
    await asAluno(request(app).post('/api/proficiencia/inscricoes'))
      .send({ nivel: 'Mestrado', linguas: ['Inglês'], comprovanteResidenciaUrl: '/uploads/c.pdf' });
    // Outro aluno
    await seedUser({ id: 'aluno-2', email: 'a2@test.com', roles: ['Aluno'], perfil_geral: { nome: 'Maria', cpf: '999' } });
    const token2 = await login('a2@test.com');
    const minhas2 = await request(app).get('/api/proficiencia/inscricoes/minhas')
      .set('Authorization', `Bearer ${token2}`);
    expect(minhas2.status).toBe(200);
    expect(minhas2.body).toHaveLength(0);
    const minhas1 = await asAluno(request(app).get('/api/proficiencia/inscricoes/minhas'));
    expect(minhas1.body).toHaveLength(1);
  });
});

describe('avaliação e declaração', () => {
  async function inscrever() {
    await criarPeriodoAberto();
    const r = await asAluno(request(app).post('/api/proficiencia/inscricoes'))
      .send({ nivel: 'Doutorado', linguas: ['Inglês', 'Espanhol'], comprovanteResidenciaUrl: '/uploads/c.pdf' });
    return r.body.id;
  }

  it('lança nota e calcula o resultado', async () => {
    const id = await inscrever();
    const res = await asAdmin(request(app).put(`/api/proficiencia/inscricoes/${id}/nota`)).send({ nota: 8.5 });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('AVALIADO');
    expect(res.body.resultado).toBe('PROFICIENCIA');
  });

  it('gera declaração em PDF para inscrição avaliada com aprovação', async () => {
    const id = await inscrever();
    await asAdmin(request(app).put(`/api/proficiencia/inscricoes/${id}/nota`)).send({ nota: 6 });
    const res = await asAdmin(request(app).get(`/api/proficiencia/inscricoes/${id}/declaracao`));
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/pdf/);
  });

  it('não gera declaração para nota insuficiente', async () => {
    const id = await inscrever();
    await asAdmin(request(app).put(`/api/proficiencia/inscricoes/${id}/nota`)).send({ nota: 3 });
    const res = await asAdmin(request(app).get(`/api/proficiencia/inscricoes/${id}/declaracao`));
    expect(res.status).toBe(409);
  });

  it('aluno comum não acessa o painel de inscrições nem lança nota', async () => {
    const id = await inscrever();
    const lista = await asAluno(request(app).get('/api/proficiencia/inscricoes'));
    expect(lista.status).toBe(403);
    const nota = await asAluno(request(app).put(`/api/proficiencia/inscricoes/${id}/nota`)).send({ nota: 8 });
    expect(nota.status).toBe(403);
  });
});
