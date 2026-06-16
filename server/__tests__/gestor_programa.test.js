import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';
import { pool } from '../db/pool.js';
import { resetDb, seedAdmin, loginAdmin, login } from './helpers.js';

let adminToken;
let gestorToken;
let programaA;
let programaB;

const novoPrograma = (over = {}) => ({
  nome: 'PPG Teste',
  sigla: 'ppgt',
  modalidades: [{ tipo: 'MESTRADO', ano_inicio: 2020, nota_capes: '4' }],
  ...over,
});

beforeEach(async () => {
  await resetDb();
  await seedAdmin();
  adminToken = await loginAdmin();

  const a = await request(app).post('/api/programas')
    .set('Authorization', `Bearer ${adminToken}`)
    .send(novoPrograma({ nome: 'Programa A', sigla: 'pga' }));
  programaA = a.body.id;

  const b = await request(app).post('/api/programas')
    .set('Authorization', `Bearer ${adminToken}`)
    .send(novoPrograma({ nome: 'Programa B', sigla: 'pgb' }));
  programaB = b.body.id;

  // Cria o gestor do Programa A via API de usuários (admin) e faz login.
  await request(app).post('/api/users')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      email: 'gestor@pga.com',
      password: 'senha123',
      roles: ['GestorPrograma'],
      programaId: programaA,
      perfil_geral: { nome: 'Gestor A' },
    });
  gestorToken = await login('gestor@pga.com');
});

afterAll(async () => {
  await pool.end();
});

const asGestor = (req) => req.set('Authorization', `Bearer ${gestorToken}`);
const asAdmin = (req) => req.set('Authorization', `Bearer ${adminToken}`);

describe('criação de usuário gestor de programa', () => {
  it('exige programaId ao criar um GestorPrograma (400)', async () => {
    const res = await asAdmin(request(app).post('/api/users'))
      .send({ email: 'sem@prog.com', password: 'x', roles: ['GestorPrograma'] });
    expect(res.status).toBe(400);
  });

  it('persiste o programaId e o devolve no login', async () => {
    const res = await request(app).post('/api/login')
      .send({ username: 'gestor@pga.com', password: 'senha123' });
    expect(res.status).toBe(200);
    expect(res.body.programaId).toBe(programaA);
    expect(res.body.gestorPrograma?.id).toBe(programaA);
  });
});

describe('escopo de escrita do gestor de programa', () => {
  it('força o programa do gestor ao criar notícia, ignorando spoof', async () => {
    const res = await asGestor(request(app).post('/api/news'))
      .send({ title: 'Notícia do gestor', programaId: programaB });
    expect(res.status).toBe(201);
    expect(res.body.programaId).toBe(programaA);
  });

  it('lista apenas as notícias do próprio programa via ?programa', async () => {
    await asAdmin(request(app).post('/api/news')).send({ title: 'Da PRPG' });
    await asAdmin(request(app).post('/api/news')).send({ title: 'Do B', programaId: programaB });
    await asGestor(request(app).post('/api/news')).send({ title: 'Do A' });

    const res = await request(app).get(`/api/news?programa=${programaA}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].title).toBe('Do A');
  });
});

describe('posse de conteúdo do gestor de programa', () => {
  it('bloqueia editar/excluir notícia de outro programa (403)', async () => {
    const outra = await asAdmin(request(app).post('/api/news'))
      .send({ title: 'Notícia do B', programaId: programaB });
    const id = outra.body.id;

    const put = await asGestor(request(app).put(`/api/news/${id}`)).send({ title: 'Hack' });
    expect(put.status).toBe(403);

    const del = await asGestor(request(app).delete(`/api/news/${id}`));
    expect(del.status).toBe(403);
  });

  it('permite editar/excluir a própria notícia', async () => {
    const minha = await asGestor(request(app).post('/api/news')).send({ title: 'Minha' });
    const id = minha.body.id;

    const put = await asGestor(request(app).put(`/api/news/${id}`)).send({ title: 'Minha (editada)' });
    expect(put.status).toBe(200);
    expect(put.body.programaId).toBe(programaA);

    const del = await asGestor(request(app).delete(`/api/news/${id}`));
    expect(del.status).toBe(200);
  });
});

describe('limites do gestor de programa', () => {
  it('não pode criar nem excluir programas (403)', async () => {
    const post = await asGestor(request(app).post('/api/programas')).send(novoPrograma());
    expect(post.status).toBe(403);

    const del = await asGestor(request(app).delete(`/api/programas/${programaB}`));
    expect(del.status).toBe(403);
  });

  it('só pode editar o seu próprio programa', async () => {
    const outro = await asGestor(request(app).put(`/api/programas/${programaB}`))
      .send({ nome: 'Tentativa' });
    expect(outro.status).toBe(403);

    const meu = await asGestor(request(app).put(`/api/programas/${programaA}`))
      .send(novoPrograma({ nome: 'Programa A (editado)', sigla: 'pga' }));
    expect(meu.status).toBe(200);
  });

  it('não pode criar conteúdo global (bolsas/calendários) (403)', async () => {
    const bolsa = await asGestor(request(app).post('/api/bolsas')).send({ title: 'Bolsa' });
    expect(bolsa.status).toBe(403);

    const cal = await asGestor(request(app).post('/api/calendarios')).send({ ano: 2026 });
    expect(cal.status).toBe(403);
  });
});

describe('cadastro de alunos/professores pelo gestor', () => {
  it('cadastra aluno já vinculado ao próprio programa (ignora spoof de programa)', async () => {
    const res = await asGestor(request(app).post('/api/users')).send({
      email: 'aluno1@pga.com', roles: ['Aluno'], papelVinculo: 'DISCENTE_MESTRADO',
      programaId: programaB, perfil_geral: { nome: 'Aluno Um' },
    });
    expect(res.status).toBe(201);
    expect(res.body.programaId).toBe(programaA);

    const disc = await asGestor(request(app).get(`/api/programas/${programaA}/discentes`));
    expect(disc.status).toBe(200);
    expect(disc.body.some((d) => d.pessoa_id === res.body.id && d.papel === 'DISCENTE_MESTRADO')).toBe(true);
  });

  it('cadastra professor já vinculado como docente do programa', async () => {
    const res = await asGestor(request(app).post('/api/users')).send({
      email: 'prof1@pga.com', roles: ['Professor'], papelVinculo: 'DOCENTE_PERMANENTE',
      perfil_geral: { nome: 'Prof Um' },
    });
    expect(res.status).toBe(201);
    expect(res.body.programaId).toBe(programaA);

    const doc = await asGestor(request(app).get(`/api/programas/${programaA}/docentes`));
    expect(doc.body.some((d) => d.pessoa_id === res.body.id)).toBe(true);
  });

  it('não pode criar papéis com poder (GestorPrograma/Administrator) (403)', async () => {
    const a = await asGestor(request(app).post('/api/users'))
      .send({ email: 'x@pga.com', roles: ['GestorPrograma'], programaId: programaA });
    expect(a.status).toBe(403);
    const b = await asGestor(request(app).post('/api/users'))
      .send({ email: 'y@pga.com', roles: ['Administrator'] });
    expect(b.status).toBe(403);
  });

  it('a lista de usuários do gestor mostra só os do seu programa', async () => {
    await asGestor(request(app).post('/api/users'))
      .send({ email: 'a-aluno@pga.com', roles: ['Aluno'], perfil_geral: { nome: 'A Aluno' } });
    await asAdmin(request(app).post('/api/users')).send({
      email: 'b-aluno@pgb.com', roles: ['Aluno'], programaId: programaB,
      papelVinculo: 'DISCENTE_MESTRADO', perfil_geral: { nome: 'B Aluno' },
    });

    const res = await asGestor(request(app).get('/api/users'));
    expect(res.status).toBe(200);
    const emails = res.body.map((u) => u.email);
    expect(emails).toContain('a-aluno@pga.com');
    expect(emails).not.toContain('b-aluno@pgb.com');
    expect(emails).not.toContain('admin@test.com');
  });
});

describe('posse cruzada de alunos (regra de egresso)', () => {
  it('gestor não edita nem exclui aluno de outro programa (403)', async () => {
    const aluno = await asAdmin(request(app).post('/api/users')).send({
      email: 'aluno-b@pgb.com', roles: ['Aluno'], programaId: programaB,
      perfil_geral: { nome: 'Aluno B' },
    });
    const id = aluno.body.id;

    const put = await asGestor(request(app).put(`/api/users/${id}`)).send({ perfil_geral: { nome: 'Hack' } });
    expect(put.status).toBe(403);

    const del = await asGestor(request(app).delete(`/api/users/${id}`));
    expect(del.status).toBe(403);
  });

  it('egresso de outro programa fica visível, mas continua somente leitura', async () => {
    const aluno = await asAdmin(request(app).post('/api/users')).send({
      email: 'egresso@pgb.com', roles: ['Aluno'], programaId: programaB,
      perfil_geral: { nome: 'Egresso X' },
    });
    const id = aluno.body.id;

    const link = await asGestor(request(app).post(`/api/programas/${programaA}/discentes`))
      .send({ pessoa_id: id, papel: 'EGRESSO' });
    expect(link.status).toBe(201);

    const lista = await asGestor(request(app).get('/api/users'));
    expect(lista.body.map((u) => u.email)).toContain('egresso@pgb.com');

    const put = await asGestor(request(app).put(`/api/users/${id}`)).send({ perfil_geral: { nome: 'Z' } });
    expect(put.status).toBe(403);
    const del = await asGestor(request(app).delete(`/api/users/${id}`));
    expect(del.status).toBe(403);
  });

  it('gestor edita e exclui aluno do próprio programa', async () => {
    const aluno = await asGestor(request(app).post('/api/users'))
      .send({ email: 'meu-aluno@pga.com', roles: ['Aluno'], perfil_geral: { nome: 'Meu Aluno' } });
    const id = aluno.body.id;

    const put = await asGestor(request(app).put(`/api/users/${id}`))
      .send({ perfil_geral: { nome: 'Meu Aluno (editado)' } });
    expect(put.status).toBe(200);

    const del = await asGestor(request(app).delete(`/api/users/${id}`));
    expect(del.status).toBe(200);
  });
});

describe('cadastro de pessoa já existente (checagem de duplicidade)', () => {
  it('e-mail de aluno de outro programa: 409, identifica e permite vincular sem duplicar', async () => {
    const alunoB = await asAdmin(request(app).post('/api/users')).send({
      email: 'reuso@pgb.com', roles: ['Aluno'], programaId: programaB,
      papelVinculo: 'DISCENTE_MESTRADO', perfil_geral: { nome: 'Pessoa Reuso' },
    });

    // Gestor de A tenta cadastrar a mesma pessoa → conflito, sem criar conta nova.
    const conf = await asGestor(request(app).post('/api/users')).send({
      email: 'reuso@pgb.com', roles: ['Aluno'], papelVinculo: 'DISCENTE_DOUTORADO',
      perfil_geral: { nome: 'Pessoa Reuso' },
    });
    expect(conf.status).toBe(409);
    expect(conf.body.conflict).toBe('email');
    expect(conf.body.existing.id).toBe(alunoB.body.id);
    expect(conf.body.existing.jaVinculado).toBe(false);

    // Procedimento: vincular o cadastro existente ao programa A.
    const link = await asGestor(request(app).post(`/api/programas/${programaA}/discentes`))
      .send({ pessoa_id: alunoB.body.id, papel: 'DISCENTE_DOUTORADO' });
    expect(link.status).toBe(201);

    const disc = await asGestor(request(app).get(`/api/programas/${programaA}/discentes`));
    expect(disc.body.some((d) => d.pessoa_id === alunoB.body.id)).toBe(true);

    // A posse continua do programa B: o gestor de A não edita a conta.
    const put = await asGestor(request(app).put(`/api/users/${alunoB.body.id}`))
      .send({ perfil_geral: { nome: 'Hack' } });
    expect(put.status).toBe(403);
  });

  it('CPF já cadastrado em outro programa: 409 conflict=cpf (ignora pontuação)', async () => {
    await asAdmin(request(app).post('/api/users')).send({
      email: 'cpf-owner@pgb.com', roles: ['Aluno'], programaId: programaB,
      perfil_geral: { nome: 'Dono CPF', cpf: '111.222.333-44' },
    });

    const conf = await asGestor(request(app).post('/api/users')).send({
      email: 'outro-email@pga.com', roles: ['Aluno'],
      perfil_geral: { nome: 'Outro', cpf: '11122233344' },
    });
    expect(conf.status).toBe(409);
    expect(conf.body.conflict).toBe('cpf');
  });

  it('pessoa já vinculada ao próprio programa: 409 com jaVinculado=true', async () => {
    await asGestor(request(app).post('/api/users'))
      .send({ email: 'ja@pga.com', roles: ['Aluno'], perfil_geral: { nome: 'Já Vinculado' } });

    const conf = await asGestor(request(app).post('/api/users'))
      .send({ email: 'ja@pga.com', roles: ['Aluno'], perfil_geral: { nome: 'Já Vinculado' } });
    expect(conf.status).toBe(409);
    expect(conf.body.existing.jaVinculado).toBe(true);
  });
});
