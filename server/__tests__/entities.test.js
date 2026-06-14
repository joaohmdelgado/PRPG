import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';
import { pool } from '../db/pool.js';
import { resetDb, seedAdmin, seedUser, login, loginAdmin } from './helpers.js';

let token;

beforeEach(async () => {
  await resetDb();
  await seedAdmin();
  token = await loginAdmin();
});

afterAll(async () => {
  await pool.end();
});

const auth = (req) => req.set('Authorization', `Bearer ${token}`);

describe('calendarios', () => {
  it('mantém apenas um calendário marcado como corrente', async () => {
    await auth(request(app).post('/api/calendarios')).send({ ano: 2024, title: 'Cal 2024', isCurrent: true });
    await auth(request(app).post('/api/calendarios')).send({ ano: 2025, title: 'Cal 2025', isCurrent: true });

    const res = await request(app).get('/api/calendarios');
    const correntes = res.body.filter((c) => c.isCurrent);
    expect(correntes).toHaveLength(1);
    expect(correntes[0].ano).toBe(2025);
  });

  it('persiste milestones (tabela filha) no round-trip', async () => {
    const create = await auth(request(app).post('/api/calendarios')).send({
      ano: 2026,
      title: 'Cal 2026',
      milestones: [
        { event: 'Início', date: '2026-03-01' },
        { event: 'Fim', date: '2026-07-01' },
      ],
    });
    const res = await request(app).get(`/api/calendarios/${create.body.id}`);
    expect(res.body.milestones).toHaveLength(2);
    expect(res.body.milestones[0].event).toBe('Início');
  });
});

describe('resolucoes', () => {
  it('sanitiza o campo desc ao criar', async () => {
    const res = await auth(request(app).post('/api/resolucoes')).send({
      title: 'Res 01',
      desc: '<p>texto</p><script>alert(1)</script>',
    });
    expect(res.status).toBe(201);
    expect(res.body.desc).toBe('<p>texto</p>');
  });
});

describe('grupos de pesquisa', () => {
  it('resolve os líderes (field_lideres) em nomes', async () => {
    await seedUser({ id: 'lider-1', email: 'lider@test.com', roles: ['Professor'], perfil_geral: { nome: 'Dra. Líder' } });
    await auth(request(app).post('/api/grupos-pesquisa')).send({
      title: 'Grupo X',
      body: { value: '<p>desc</p>', summary: '' },
      field_lideres: ['lider-1'],
    });

    const res = await auth(request(app).get('/api/grupos-pesquisa'));
    expect(res.status).toBe(200);
    expect(res.body[0].field_lideres_resolved[0].nome).toBe('Dra. Líder');
  });
});

describe('teses/dissertações', () => {
  it('resolve o autor (field_autor) em nome', async () => {
    await seedUser({ id: 'autor-1', email: 'autor@test.com', roles: ['Aluno'], perfil_geral: { nome: 'Autor Teste' } });
    await auth(request(app).post('/api/teses-dissertacoes')).send({
      title: 'Dissertação Y',
      field_autor: 'autor-1',
      field_tipo_td: 'DISSERTACAO',
    });

    const res = await request(app).get('/api/teses-dissertacoes');
    expect(res.body[0].field_autor_resolved.nome).toBe('Autor Teste');
  });
});

describe('metricas anuais (Fase 4 / dashboard)', () => {
  const novoPrograma = async () => {
    const res = await auth(request(app).post('/api/programas')).send({ nome: 'PPG Métricas', sigla: 'ppgm' });
    return res.body.id;
  };

  it('cria, lê por programa e bloqueia duplicidade (programa+ano)', async () => {
    const progId = await novoPrograma();
    const create = await auth(request(app).post('/api/metricas')).send({
      programa_id: progId, ano: 2025, docentes_permanentes: 18,
      discentes_mestrado: 40, discentes_doutorado: 22, taxa_conclusao: 78.5,
    });
    expect(create.status).toBe(201);
    expect(create.body.docentes_permanentes).toBe(18);
    expect(create.body.taxa_conclusao).toBe(78.5);
    expect(create.body.criado_por).toBe('admin-test');

    const list = await auth(request(app).get(`/api/metricas?programa=${progId}`));
    expect(list.status).toBe(200);
    expect(list.body).toHaveLength(1);

    const dup = await auth(request(app).post('/api/metricas')).send({ programa_id: progId, ano: 2025 });
    expect(dup.status).toBe(409);
  });

  it('remove em cascata ao excluir o programa', async () => {
    const progId = await novoPrograma();
    await auth(request(app).post('/api/metricas')).send({ programa_id: progId, ano: 2024 });
    await auth(request(app).delete(`/api/programas/${progId}`));
    const list = await auth(request(app).get(`/api/metricas?programa=${progId}`));
    expect(list.body).toHaveLength(0);
  });

  it('exige autenticação para acessar métricas', async () => {
    const res = await request(app).get('/api/metricas');
    expect(res.status).toBe(401);
  });
});

describe('auditoria (Fase 3)', () => {
  it('carimba criado_por na criação e atualizado_por na edição (entidade genérica)', async () => {
    const created = await auth(request(app).post('/api/resolucoes')).send({ title: 'Res Audit', desc: 'x' });
    expect(created.status).toBe(201);
    expect(created.body.criado_por).toBe('admin-test');
    expect(created.body.atualizado_por).toBe('admin-test');

    // Edição por outro usuário: atualizado_por muda, criado_por é preservado.
    await seedUser({ id: 'gestor-1', email: 'gestor@test.com', roles: ['Gestor'], perfil_geral: { nome: 'Gestor' } });
    const gestorToken = await login('gestor@test.com');
    const upd = await request(app)
      .put(`/api/resolucoes/${created.body.id}`)
      .set('Authorization', `Bearer ${gestorToken}`)
      .send({ title: 'Res Audit v2' });
    expect(upd.status).toBe(200);
    expect(upd.body.criado_por).toBe('admin-test');
    expect(upd.body.atualizado_por).toBe('gestor-1');
  });
});
