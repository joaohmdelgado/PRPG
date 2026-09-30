import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';
import { pool } from '../db/pool.js';
import { resetDb, seedAdmin, seedUser, seedUserComPessoa, login, loginAdmin } from './helpers.js';

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

describe('users — listagem', () => {
  it('nunca expõe o password_hash', async () => {
    const res = await asAdmin(request(app).get('/api/users'));
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    res.body.forEach((u) => expect(u.password_hash).toBeUndefined());
  });
});

describe('users — criação', () => {
  it('rejeita e-mail duplicado com 409 e aponta o cadastro existente', async () => {
    const orig = await asAdmin(request(app).post('/api/users')).send({ email: 'dup@test.com', roles: ['Aluno'] });
    const res = await asAdmin(request(app).post('/api/users')).send({ email: 'dup@test.com', roles: ['Aluno'] });
    expect(res.status).toBe(409);
    expect(res.body.conflict).toBe('email');
    expect(res.body.existing?.id).toBe(orig.body.id);
  });

  it('rejeita CPF duplicado com 409 (compara só dígitos, ignora pontuação)', async () => {
    await asAdmin(request(app).post('/api/users'))
      .send({ email: 'cpf-a@test.com', roles: ['Aluno'], perfil_geral: { nome: 'A', cpf: '123.456.789-00' } });
    const res = await asAdmin(request(app).post('/api/users'))
      .send({ email: 'cpf-b@test.com', roles: ['Aluno'], perfil_geral: { nome: 'B', cpf: '12345678900' } });
    expect(res.status).toBe(409);
    expect(res.body.conflict).toBe('cpf');
  });

  it('usa senha padrão Mudar123 quando não informada e oculta o hash', async () => {
    const create = await asAdmin(request(app).post('/api/users')).send({ email: 'novo@test.com', roles: ['Aluno'] });
    expect(create.status).toBe(201);
    expect(create.body.password_hash).toBeUndefined();
    // Consegue logar com a senha padrão.
    const res = await request(app).post('/api/login').send({ username: 'novo@test.com', password: 'Mudar123' });
    expect(res.status).toBe(200);
  });

  it('exige programa para Professor', async () => {
    const semPrograma = await asAdmin(request(app).post('/api/users')).send({ email: 'prof@test.com', roles: ['Professor'] });
    expect(semPrograma.status).toBe(400);

    const comPrograma = await asAdmin(request(app).post('/api/users')).send({
      email: 'prof2@test.com',
      roles: ['Professor'],
      perfil_professor: { programas: ['ppg-1'] },
    });
    expect(comPrograma.status).toBe(201);
  });
});

describe('users — controle de acesso', () => {
  it('um usuário comum não pode ver o perfil de outro (403)', async () => {
    await seedUser({ id: 'aluno-1', email: 'aluno1@test.com', roles: ['Aluno'] });
    await seedUser({ id: 'aluno-2', email: 'aluno2@test.com', roles: ['Aluno'] });
    const alunoToken = await login('aluno1@test.com');

    const res = await request(app).get('/api/users/aluno-2').set('Authorization', `Bearer ${alunoToken}`);
    expect(res.status).toBe(403);

    const self = await request(app).get('/api/users/aluno-1').set('Authorization', `Bearer ${alunoToken}`);
    expect(self.status).toBe(200);
  });

  it('permite ao próprio usuário trocar a senha', async () => {
    await seedUser({ id: 'aluno-3', email: 'aluno3@test.com', roles: ['Aluno'] });
    const t = await login('aluno3@test.com');

    const upd = await request(app).put('/api/users/aluno-3')
      .set('Authorization', `Bearer ${t}`)
      .send({ password: 'novaSenha456' });
    expect(upd.status).toBe(200);

    const ok = await request(app).post('/api/login').send({ username: 'aluno3@test.com', password: 'novaSenha456' });
    expect(ok.status).toBe(200);
  });

  it('não permite que o próprio usuário (não-admin) escale seus papéis nem o programa', async () => {
    await seedUser({ id: 'aluno-esc', email: 'aluno-esc@test.com', roles: ['Aluno'] });
    const t = await login('aluno-esc@test.com');

    const upd = await request(app).put('/api/users/aluno-esc')
      .set('Authorization', `Bearer ${t}`)
      .send({ roles: ['Administrator'], programaId: 'ppg-1' });
    // A atualização do próprio perfil é aceita, mas papéis/programa são ignorados.
    expect(upd.status).toBe(200);
    expect(upd.body.roles).toEqual(['Aluno']);
    expect(upd.body.programaId ?? null).toBeNull();

    // Confirma relendo como admin: nada de escalonamento persistido.
    const reread = await asAdmin(request(app).get('/api/users/aluno-esc'));
    expect(reread.body.roles).toEqual(['Aluno']);
    expect(reread.body.programaId ?? null).toBeNull();
  });

  it('permite ao Admin alterar papéis de um usuário', async () => {
    await seedUser({ id: 'aluno-prom', email: 'aluno-prom@test.com', roles: ['Aluno'] });
    const upd = await asAdmin(request(app).put('/api/users/aluno-prom')).send({ roles: ['Gestor'] });
    expect(upd.status).toBe(200);
    expect(upd.body.roles).toEqual(['Gestor']);
  });
});

describe('users — senha provisória', () => {
  it('marca como provisória quando criado sem senha (login sinaliza a troca)', async () => {
    const create = await asAdmin(request(app).post('/api/users')).send({ email: 'prov@test.com', roles: ['Aluno'] });
    expect(create.status).toBe(201);

    const res = await request(app).post('/api/login').send({ username: 'prov@test.com', password: 'Mudar123' });
    expect(res.status).toBe(200);
    expect(res.body.senhaTemporaria).toBe(true);
  });

  it('limpa a flag quando o próprio usuário troca a senha', async () => {
    const create = await asAdmin(request(app).post('/api/users')).send({ email: 'prov2@test.com', roles: ['Aluno'] });
    const id = create.body.id;
    const t = await login('prov2@test.com', 'Mudar123');

    const upd = await request(app).put(`/api/users/${id}`)
      .set('Authorization', `Bearer ${t}`)
      .send({ password: 'minhaNovaSenha8' });
    expect(upd.status).toBe(200);

    const res = await request(app).post('/api/login').send({ username: 'prov2@test.com', password: 'minhaNovaSenha8' });
    expect(res.body.senhaTemporaria).toBe(false);
  });

  it('senha informada explicitamente na criação não é provisória', async () => {
    await asAdmin(request(app).post('/api/users'))
      .send({ email: 'prov3@test.com', roles: ['Aluno'], password: 'senhaForte9' });
    const res = await request(app).post('/api/login').send({ username: 'prov3@test.com', password: 'senhaForte9' });
    expect(res.body.senhaTemporaria).toBe(false);
  });
});

describe('users — exclusão', () => {
  it('admin remove usuário', async () => {
    await seedUser({ id: 'temp', email: 'temp@test.com', roles: ['Aluno'] });
    const del = await asAdmin(request(app).delete('/api/users/temp'));
    expect(del.status).toBe(200);
    const get = await asAdmin(request(app).get('/api/users/temp'));
    expect(get.status).toBe(404);
  });
});

// B.13 / G1 (Task 3): o perfil continua em users (cópia) e passa a ir também para
// pessoas (sexo/estrangeiro/nacionalidade/privacidade) e para vinculos (papel + dados).
describe('G1: escritas em dupla', () => {
  const programa = (id) => pool.query('INSERT INTO programas (id, nome, sigla) VALUES ($1, $1, $1)', [id]);
  const vincular = (id, pessoaId, papel, programaId) => pool.query(
    'INSERT INTO vinculos (id, programa_id, pessoa_id, papel, ativo, criado_em) VALUES ($1, $2, $3, $4, TRUE, now())',
    [id, programaId, pessoaId, papel]);
  const vinculosDe = async (email) => (await pool.query(
    `SELECT v.programa_id, v.papel, v.ativo, v.dados FROM vinculos v JOIN users u ON u.pessoa_id = v.pessoa_id
      WHERE u.email = $1 ORDER BY v.programa_id`, [email])).rows;
  const pessoaDe = async (pessoaId) => (await pool.query(
    `SELECT sexo, estrangeiro, nacionalidade, priv_mostrar_email, priv_mostrar_telefone FROM pessoas WHERE id = $1`,
    [pessoaId])).rows[0];
  const loginGestor = async (programaId) => {
    await asAdmin(request(app).post('/api/users')).send({
      email: `gestor-${programaId}@t.br`, password: 'senha123', roles: ['GestorPrograma'], programaId,
      perfil_geral: { nome: 'Gestor' } }).expect(201);
    return login(`gestor-${programaId}@t.br`);
  };

  it('PUT /users grava sexo, estrangeiro, nacionalidade e privacidade em pessoas; false também propaga', async () => {
    const { usuarioId, pessoaId } = await seedUserComPessoa({ id: 'u-g1', email: 'g1@t.br', nome: 'G1', roles: ['Aluno'] });
    await asAdmin(request(app).put(`/api/users/${usuarioId}`))
      .send({ privacidade: { mostrar_email: true, mostrar_telefone: true },
              perfil_aluno: { nivel: 'Mestrando', estrangeiro: true, nacionalidade: 'chilena', sexo: 'Feminino' } })
      .expect(200);
    expect(await pessoaDe(pessoaId)).toEqual({ sexo: 'Feminino', estrangeiro: true, nacionalidade: 'chilena',
      priv_mostrar_email: true, priv_mostrar_telefone: true });

    await asAdmin(request(app).put(`/api/users/${usuarioId}`))
      .send({ privacidade: { mostrar_email: false, mostrar_telefone: true },
              perfil_aluno: { nivel: 'Mestrando', estrangeiro: false, nacionalidade: 'chilena', sexo: 'Feminino' } })
      .expect(200);
    expect(await pessoaDe(pessoaId)).toMatchObject({ estrangeiro: false, priv_mostrar_email: false, priv_mostrar_telefone: true });
  });

  it('POST /users de professor com programas cria os vínculos docentes com o tipo do formulário', async () => {
    await programa('ppg-1');
    await asAdmin(request(app).post('/api/users'))
      .send({ email: 'novo@t.br', roles: ['Professor'], perfil_geral: { nome: 'Novo Prof' },
              perfil_professor: { tipo_professor: 'Colaborador', programas: ['ppg-1'] } })
      .expect(201);
    expect((await vinculosDe('novo@t.br')).map(({ papel, ativo }) => ({ papel, ativo })))
      .toEqual([{ papel: 'DOCENTE_COLABORADOR', ativo: true }]);
  });

  it('POST /users: papelVinculo e perfil_professor.programas no mesmo programa não duplicam o vínculo', async () => {
    await programa('ppg-a');
    await programa('ppg-b');
    // Admin: papelVinculo explícito vence o tipo do formulário.
    await asAdmin(request(app).post('/api/users'))
      .send({ email: 'dup-admin@t.br', roles: ['Professor'], programaId: 'ppg-a', papelVinculo: 'DOCENTE_COLABORADOR',
              perfil_professor: { tipo_professor: 'Permanente', programas: ['ppg-a'] } })
      .expect(201);
    expect((await vinculosDe('dup-admin@t.br')).map(({ programa_id, papel }) => ({ programa_id, papel })))
      .toEqual([{ programa_id: 'ppg-a', papel: 'DOCENTE_COLABORADOR' }]);

    // Gestor de Programa: o programa é forçado ao dele; só acrescenta.
    const gestor = await loginGestor('ppg-a');
    await request(app).post('/api/users').set('Authorization', `Bearer ${gestor}`)
      .send({ email: 'dup-gestor@t.br', roles: ['Professor'], papelVinculo: 'DOCENTE_PERMANENTE',
              perfil_professor: { tipo_professor: 'Permanente', programas: ['ppg-b'] } })
      .expect(201);
    expect((await vinculosDe('dup-gestor@t.br')).map(({ programa_id, papel }) => ({ programa_id, papel })))
      .toEqual([{ programa_id: 'ppg-a', papel: 'DOCENTE_PERMANENTE' }]);
  });

  it('POST /users: programa inexistente em perfil_professor.programas é ignorado (não quebra o cadastro)', async () => {
    await asAdmin(request(app).post('/api/users'))
      .send({ email: 'fantasma@t.br', roles: ['Professor'], perfil_professor: { programas: ['nao-existe'] } })
      .expect(201);
    expect(await vinculosDe('fantasma@t.br')).toEqual([]);
  });

  it('PUT com dado de vínculo em aluno sem vínculo responde 400 e não grava nada', async () => {
    const { usuarioId } = await seedUserComPessoa({ id: 'u-sv', email: 'sv@t.br', nome: 'SV', roles: ['Aluno'] });
    await asAdmin(request(app).put(`/api/users/${usuarioId}`))
      .send({ perfil_aluno: { nivel: 'Mestrando', entrada: '2024.1' } }).expect(400);
    const { rows: [u] } = await pool.query('SELECT perfil_aluno FROM users WHERE id = $1', [usuarioId]);
    expect(u.perfil_aluno?.entrada ?? null).toBeNull();
  });

  it('POST de aluno com dado de vínculo e sem programa responde 400 e não cria o usuário', async () => {
    await asAdmin(request(app).post('/api/users'))
      .send({ email: 'sem-prog@t.br', roles: ['Aluno'], perfil_aluno: { nivel: 'Mestrando', entrada: '2024.1' } })
      .expect(400);
    const { rows } = await pool.query(`SELECT 1 FROM users WHERE email = 'sem-prog@t.br'`);
    expect(rows).toEqual([]);
  });

  it('Admin: PUT grava dados/papel do aluno e reconcilia os programas do professor', async () => {
    await programa('ppg-a'); await programa('ppg-b'); await programa('ppg-c');
    const aluno = await seedUserComPessoa({ id: 'u-al', email: 'al@t.br', nome: 'Al', roles: ['Aluno'] });
    await vincular('v-al', aluno.pessoaId, 'DISCENTE_MESTRADO', 'ppg-a');
    await asAdmin(request(app).put('/api/users/u-al'))
      .send({ perfil_aluno: { nivel: 'Doutorando', entrada: '2025.1', situacao: 'Matriculado', qualificacao: '2020-10-29' } })
      .expect(200);
    const [va] = await vinculosDe('al@t.br');
    expect(va.papel).toBe('DISCENTE_DOUTORADO');
    expect(va.dados).toEqual({ entrada: '2025.1', situacao: 'Matriculado' });

    const prof = await seedUserComPessoa({ id: 'u-pr', email: 'pr@t.br', nome: 'Pr' });
    await vincular('v-pa', prof.pessoaId, 'DOCENTE_PERMANENTE', 'ppg-a');
    await vincular('v-pb', prof.pessoaId, 'DOCENTE_PERMANENTE', 'ppg-b');
    await asAdmin(request(app).put('/api/users/u-pr'))
      .send({ perfil_professor: { tipo_professor: 'Colaborador', programas: ['ppg-a', 'ppg-c'] } })
      .expect(200);
    expect((await vinculosDe('pr@t.br')).map(({ programa_id, papel, ativo }) => ({ programa_id, papel, ativo }))).toEqual([
      { programa_id: 'ppg-a', papel: 'DOCENTE_COLABORADOR', ativo: true },
      { programa_id: 'ppg-b', papel: 'DOCENTE_COLABORADOR', ativo: false },
      { programa_id: 'ppg-c', papel: 'DOCENTE_COLABORADOR', ativo: true },
    ]);
  });

  it('Gestor de Programa dono: PUT muda o tipo só no programa dele e não cria nem encerra vínculos', async () => {
    await programa('ppg-a'); await programa('ppg-b'); await programa('ppg-c');
    const prof = await seedUserComPessoa({ id: 'u-gp', email: 'gp@t.br', nome: 'Gp' });
    await pool.query(`UPDATE users SET programa_id = 'ppg-a' WHERE id = 'u-gp'`);
    await vincular('v-ga', prof.pessoaId, 'DOCENTE_PERMANENTE', 'ppg-a');
    await vincular('v-gb', prof.pessoaId, 'DOCENTE_PERMANENTE', 'ppg-b');
    const gestor = await loginGestor('ppg-a');
    await request(app).put('/api/users/u-gp').set('Authorization', `Bearer ${gestor}`)
      .send({ perfil_professor: { tipo_professor: 'Colaborador', programas: ['ppg-a', 'ppg-c'] } })
      .expect(200);
    expect((await vinculosDe('gp@t.br')).map(({ programa_id, papel, ativo }) => ({ programa_id, papel, ativo }))).toEqual([
      { programa_id: 'ppg-a', papel: 'DOCENTE_COLABORADOR', ativo: true },
      { programa_id: 'ppg-b', papel: 'DOCENTE_PERMANENTE', ativo: true },
    ]);
  });

  it('Auto-edição: não grava dado de vínculo (nem 400), mas sexo/estrangeiro/nacionalidade vão para pessoas', async () => {
    await programa('ppg-a');
    const aluno = await seedUserComPessoa({ id: 'u-self', email: 'self@t.br', nome: 'Self', roles: ['Aluno'] });
    await vincular('v-self', aluno.pessoaId, 'DISCENTE_MESTRADO', 'ppg-a');
    const t = await login('self@t.br');
    await request(app).put('/api/users/u-self').set('Authorization', `Bearer ${t}`)
      .send({ perfil_aluno: { nivel: 'Doutorando', entrada: '2025.1', estrangeiro: true, nacionalidade: 'chilena' } })
      .expect(200);
    const [v] = await vinculosDe('self@t.br');
    expect(v.papel).toBe('DISCENTE_MESTRADO');
    expect(v.dados).toBeNull();
    expect(await pessoaDe(aluno.pessoaId)).toMatchObject({ estrangeiro: true, nacionalidade: 'chilena' });

    const semVinculo = await seedUserComPessoa({ id: 'u-self2', email: 'self2@t.br', nome: 'Self2', roles: ['Aluno'] });
    const t2 = await login('self2@t.br');
    await request(app).put(`/api/users/${semVinculo.usuarioId}`).set('Authorization', `Bearer ${t2}`)
      .send({ perfil_aluno: { nivel: 'Mestrando', entrada: '2025.1' } })
      .expect(200);
  });
});
