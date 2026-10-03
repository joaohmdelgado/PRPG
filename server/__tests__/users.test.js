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

// B.13 / G1 (Task 3): o perfil vai para pessoas (sexo/estrangeiro/nacionalidade/
// privacidade) e para vinculos (papel + dados); a cópia em users acabou na Task 8.
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

// B.13 / G1 (Task 5): usersRepo lê de `pessoas` e dos vínculos e monta o formato
// antigo da API. O que o contrato (retratoUsuarios.test.js) não cobre.
describe('G1: leitura montada a partir de pessoas e vínculos', () => {
  const programa = (id) => pool.query('INSERT INTO programas (id, nome, sigla) VALUES ($1, $1, $1)', [id]);
  const vincular = (id, pessoaId, papel, programaId, { ativo = true, criadoEm = '2024-01-01T00:00:00Z', dados = null } = {}) =>
    pool.query(
      `INSERT INTO vinculos (id, programa_id, pessoa_id, papel, ativo, criado_em, dados)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)`,
      [id, programaId, pessoaId, papel, ativo, criadoEm, dados && JSON.stringify(dados)]);
  const dadosDe = async (id) => (await pool.query('SELECT dados FROM vinculos WHERE id = $1', [id])).rows[0].dados;
  const perfilAluno = async (id) => (await asAdmin(request(app).get(`/api/users/${id}`)).expect(200)).body.perfil_aluno;

  it('nome, telefones e links vêm de `pessoas` (o que a tela de Estrutura/planilha gravou lá aparece)', async () => {
    const { body: u } = await asAdmin(request(app).post('/api/users'))
      .send({ email: 'lido@t.br', roles: ['Gestor'], perfil_geral: { nome: 'Nome Antigo', telefones: ['81 0'] } })
      .expect(201);
    await pool.query(
      `UPDATE pessoas SET nome = 'Nome Na Pessoa', telefones = '81 1, 81 2', lattes = 'http://lattes/9', foto_url = '/uploads/f.png'
        WHERE id = $1`, [u.pessoaId]);
    const { body } = await asAdmin(request(app).get(`/api/users/${u.id}`)).expect(200);
    expect(body.perfil_geral).toMatchObject({ nome: 'Nome Na Pessoa', telefones: ['81 1', '81 2'], foto_url: '/uploads/f.png' });
    expect(body.dados_academicos.lattes).toBe('http://lattes/9');
    const res = await request(app).post('/api/login').send({ username: 'lido@t.br', password: 'Mudar123' });
    expect(res.body.nome).toBe('Nome Na Pessoa');
  });

  it('CPF duplicado é achado pelo CPF da pessoa (409), mesmo que o login nunca o tenha recebido', async () => {
    const { body: u } = await asAdmin(request(app).post('/api/users'))
      .send({ email: 'cpf-pessoa@t.br', roles: ['Aluno'], perfil_geral: { nome: 'Tem CPF' } }).expect(201);
    await pool.query(`UPDATE pessoas SET cpf = '11144477735' WHERE id = $1`, [u.pessoaId]);
    const res = await asAdmin(request(app).post('/api/users'))
      .send({ email: 'outro@t.br', roles: ['Aluno'], perfil_geral: { nome: 'Outro', cpf: '111.444.777-35' } });
    expect(res.status).toBe(409);
    expect(res.body).toMatchObject({ conflict: 'cpf', existing: { id: u.id, nome: 'Tem CPF' } });
  });

  it('Gestor de Programa vê o mesmo conjunto: os do programa e os vinculados a ele, sem repetir', async () => {
    await programa('ppg-a'); await programa('ppg-b');
    const dono = await seedUserComPessoa({ id: 'u-dono', email: 'dono@t.br', nome: 'Dono', roles: ['Aluno'] });
    const vinc = await seedUserComPessoa({ id: 'u-vinc', email: 'vinc@t.br', nome: 'Vinc', roles: ['Aluno'] });
    const fora = await seedUserComPessoa({ id: 'u-fora', email: 'fora@t.br', nome: 'Fora', roles: ['Aluno'] });
    await pool.query(`UPDATE users SET programa_id = 'ppg-a' WHERE id = 'u-dono'`);
    await pool.query(`UPDATE users SET programa_id = 'ppg-b' WHERE id IN ('u-vinc', 'u-fora')`);
    await vincular('v-d', dono.pessoaId, 'DISCENTE_MESTRADO', 'ppg-a');
    await vincular('v-v1', vinc.pessoaId, 'EGRESSO', 'ppg-a', { ativo: false });
    await vincular('v-v2', vinc.pessoaId, 'DISCENTE_DOUTORADO', 'ppg-a');
    await vincular('v-f', fora.pessoaId, 'DISCENTE_MESTRADO', 'ppg-b');
    await asAdmin(request(app).post('/api/users')).send({
      email: 'gestor-a@t.br', password: 'senha123', roles: ['GestorPrograma'], programaId: 'ppg-a',
      perfil_geral: { nome: 'Gestor A' } }).expect(201);
    const token = await login('gestor-a@t.br');
    const { body } = await request(app).get('/api/users').set('Authorization', `Bearer ${token}`).expect(200);
    const emails = body.map((u) => u.email);
    expect([...emails].sort()).toEqual(['dono@t.br', 'gestor-a@t.br', 'vinc@t.br']);
  });

  it('dois vínculos de aluno (egresso antigo + discente ativo): a API mostra e o PUT grava o mesmo, o discente', async () => {
    await programa('ppg-a'); await programa('ppg-b');
    const al = await seedUserComPessoa({ id: 'u-2v', email: '2v@t.br', nome: 'Dois', roles: ['Aluno'] });
    await vincular('v-egr', al.pessoaId, 'EGRESSO', 'ppg-a',
      { ativo: false, criadoEm: '2019-01-01T00:00:00Z', dados: { nivel: 'MESTRADO', entrada: '2017.1', egresso: true } });
    await vincular('v-dis', al.pessoaId, 'DISCENTE_DOUTORADO', 'ppg-b',
      { criadoEm: '2024-01-01T00:00:00Z', dados: { entrada: '2024.1', situacao: 'Cursando' } });
    expect(await perfilAluno('u-2v')).toMatchObject({ nivel: 'Doutorando', entrada: '2024.1', situacao: 'Cursando', egresso: false });

    await asAdmin(request(app).put('/api/users/u-2v'))
      .send({ perfil_aluno: { nivel: 'Doutorando', entrada: '2024.2', situacao: 'Cursando' } }).expect(200);
    expect(await dadosDe('v-dis')).toMatchObject({ entrada: '2024.2' });
    expect(await dadosDe('v-egr')).toEqual({ nivel: 'MESTRADO', entrada: '2017.1', egresso: true });
    expect(await perfilAluno('u-2v')).toMatchObject({ nivel: 'Doutorando', entrada: '2024.2' });
  });

  it('dois egressos criados no mesmo instante: o desempate por id é o mesmo na leitura e na gravação', async () => {
    await programa('ppg-a'); await programa('ppg-b');
    const al = await seedUserComPessoa({ id: 'u-emp', email: 'emp@t.br', nome: 'Empate', roles: ['Aluno'] });
    const mesmo = '2020-06-01T00:00:00Z';
    // 'v-z' entra primeiro; pela ordem (criado_em, id) o principal é 'v-a'.
    await vincular('v-z', al.pessoaId, 'EGRESSO', 'ppg-a', { ativo: false, criadoEm: mesmo, dados: { nivel: 'MESTRADO', entrada: '2010.1' } });
    await vincular('v-a', al.pessoaId, 'EGRESSO', 'ppg-b', { ativo: false, criadoEm: mesmo, dados: { nivel: 'DOUTORADO', entrada: '2015.1' } });
    expect(await perfilAluno('u-emp')).toMatchObject({ nivel: 'Doutor', entrada: '2015.1', egresso: true });

    await asAdmin(request(app).put('/api/users/u-emp'))
      .send({ perfil_aluno: { nivel: 'Doutor', entrada: '2016.1', egresso: true } }).expect(200);
    expect(await dadosDe('v-a')).toMatchObject({ entrada: '2016.1' });
    expect(await dadosDe('v-z')).toEqual({ nivel: 'MESTRADO', entrada: '2010.1' });
    expect(await perfilAluno('u-emp')).toMatchObject({ nivel: 'Doutor', entrada: '2016.1' });
  });
});

// B.13 / G1 (Task 8): `users` é só a credencial. A pessoa nasce antes do login e
// recebe o dado de pessoa direto; nada mais é copiado para users.perfil_*/acad_*.
describe('G1: users só credencial', () => {
  const copiaEmUsers = async (email) => (await pool.query(
    `SELECT perfil_nome, perfil_cpf, perfil_telefones, acad_lattes, perfil_aluno, perfil_professor, pessoa_id
       FROM users WHERE email = $1`, [email])).rows[0];
  const pessoa = async (id) => (await pool.query(
    'SELECT nome, cpf, telefones, lattes, foto_url, estrangeiro FROM pessoas WHERE id = $1', [id])).rows[0];

  it('o cadastro não grava dado de pessoa em users (só em pessoas)', async () => {
    await asAdmin(request(app).post('/api/users'))
      .send({ email: 'sp@t.br', roles: ['Gestor'], perfil_geral: { nome: 'Só Pessoa', telefones: ['81 9'] },
              dados_academicos: { lattes: 'http://l' } }).expect(201);
    const u = await copiaEmUsers('sp@t.br');
    expect(u.perfil_nome).toBeNull();
    expect(u.acad_lattes).toBeNull();
    expect(u.perfil_telefones ?? []).toEqual([]);
    expect(u.pessoa_id).not.toBeNull();
    expect(await pessoa(u.pessoa_id)).toMatchObject({ nome: 'Só Pessoa', telefones: '81 9', lattes: 'http://l' });
  });

  it('a edição não reescreve a cópia: o nome novo vai só para pessoas', async () => {
    const { body: criado } = await asAdmin(request(app).post('/api/users'))
      .send({ email: 'ed@t.br', roles: ['Aluno'], perfil_geral: { nome: 'Antes' } }).expect(201);
    await asAdmin(request(app).put(`/api/users/${criado.id}`))
      .send({ perfil_geral: { ...criado.perfil_geral, nome: 'Depois' }, perfil_aluno: { nivel: 'Mestrando', sexo: 'Feminino' } })
      .expect(200);
    const u = await copiaEmUsers('ed@t.br');
    expect(u).toMatchObject({ perfil_nome: null, acad_lattes: null, perfil_aluno: null, perfil_professor: null });
    expect((await pessoa(u.pessoa_id)).nome).toBe('Depois');
  });

  it('cadastro com o CPF de uma pessoa sem login reaproveita a pessoa e só preenche o vazio', async () => {
    await pool.query(`INSERT INTO pessoas (id, nome, cpf, estrangeiro) VALUES ('pes-plan', 'NOME DA PLANILHA', '52998224725', TRUE)`);
    const { body } = await asAdmin(request(app).post('/api/users')).send({
      email: 'reuso@t.br', roles: ['Aluno'],
      perfil_geral: { nome: 'Nome do Painel', cpf: '529.982.247-25', foto_url: '/uploads/r.jpg' },
      perfil_aluno: { nivel: 'Mestrando', estrangeiro: false },
    }).expect(201);
    expect(body.pessoaId).toBe('pes-plan');
    // soVazios: nome e o "estrangeiro" (boolean) da pessoa não são sobrescritos; a foto (vazia) é preenchida.
    expect(await pessoa('pes-plan')).toMatchObject({ nome: 'NOME DA PLANILHA', foto_url: '/uploads/r.jpg', estrangeiro: true });
    expect((await copiaEmUsers('reuso@t.br')).perfil_cpf).toBeNull();
    expect((await pool.query('SELECT count(*)::int AS n FROM pessoas WHERE cpf = $1', ['52998224725'])).rows[0].n).toBe(1);

    // Numa edição, `estrangeiro: false` explícito é valor e propaga.
    await asAdmin(request(app).put(`/api/users/${body.id}`))
      .send({ perfil_aluno: { nivel: 'Mestrando', estrangeiro: false } }).expect(200);
    expect((await pessoa('pes-plan')).estrangeiro).toBe(false);
  });
});

// B.13 / G1 (Task 9): as linhas de pesquisa são da pessoa (user_linhas_pesquisa.pessoa_id), não do login.
describe('G1: linhas de pesquisa por pessoa', () => {
  const criarLinhas = async () => (await pool.query(
    `INSERT INTO linhas_pesquisa (nome) VALUES ('Linha A'), ('Linha B'), ('Linha C') RETURNING id`)).rows.map((r) => r.id);
  const linhasDaPessoa = async (pessoaId) => (await pool.query(
    'SELECT linha_id FROM user_linhas_pesquisa WHERE pessoa_id = $1 ORDER BY linha_id', [pessoaId])).rows.map((r) => r.linha_id);

  it('PUT grava por pessoa, GET devolve as linhas e dois usuários não se misturam', async () => {
    const [a, b, c] = await criarLinhas();
    const ana = await seedUserComPessoa({ id: 'u-ana', email: 'ana@t.br', nome: 'Ana', roles: ['Aluno'] });
    const beto = await seedUserComPessoa({ id: 'u-beto', email: 'beto@t.br', nome: 'Beto', roles: ['Aluno'] });
    await asAdmin(request(app).put('/api/users/u-ana')).send({ linhas_pesquisa_ids: [a, b] }).expect(200);
    await asAdmin(request(app).put('/api/users/u-beto')).send({ linhas_pesquisa_ids: [c] }).expect(200);

    const { rows } = await pool.query('SELECT DISTINCT pessoa_id FROM user_linhas_pesquisa ORDER BY pessoa_id');
    expect(rows.map((r) => r.pessoa_id).sort()).toEqual([ana.pessoaId, beto.pessoaId].sort());
    expect(await linhasDaPessoa(ana.pessoaId)).toEqual([a, b]);
    expect(await linhasDaPessoa(beto.pessoaId)).toEqual([c]);

    const { body } = await asAdmin(request(app).get('/api/users/u-ana')).expect(200);
    expect(body.linhas_pesquisa.map((l) => l.nome)).toEqual(['Linha A', 'Linha B']);

    // Trocar as linhas de um não mexe nas do outro; lista vazia limpa.
    await asAdmin(request(app).put('/api/users/u-ana')).send({ linhas_pesquisa_ids: [b] }).expect(200);
    expect(await linhasDaPessoa(ana.pessoaId)).toEqual([b]);
    expect(await linhasDaPessoa(beto.pessoaId)).toEqual([c]);
    await asAdmin(request(app).put('/api/users/u-beto')).send({ linhas_pesquisa_ids: [] }).expect(200);
    expect(await linhasDaPessoa(beto.pessoaId)).toEqual([]);
    expect((await asAdmin(request(app).get('/api/users/u-beto')).expect(200)).body.linhas_pesquisa).toEqual([]);
  });

  it('POST com linhas_pesquisa_ids grava na pessoa do novo usuário', async () => {
    const [a] = await criarLinhas();
    const { body } = await asAdmin(request(app).post('/api/users'))
      .send({ email: 'novo@t.br', roles: ['Aluno'], perfil_geral: { nome: 'Novo' }, linhas_pesquisa_ids: [a] })
      .expect(201);
    expect(body.pessoaId).toBeTruthy();
    expect(await linhasDaPessoa(body.pessoaId)).toEqual([a]);
  });
});
