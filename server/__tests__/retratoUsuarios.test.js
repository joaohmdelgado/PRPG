import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';
import { pool } from '../db/pool.js';
import { resetDb, seedAdmin, seedUser, login, loginAdmin } from './helpers.js';

// B.13 / G1 — contrato da API de usuários.
//
// Escrito ANTES da virada das leituras (Task 5): o usersRepo ainda lê as cópias
// em `users`, e depois passa a montar o mesmo formato a partir de `pessoas` e dos
// vínculos. Este arquivo precisa ficar verde nos dois estados, SEM alteração —
// por isso só afirma o que os dois caminhos produzem (o usuário é criado pela API,
// como o painel faz, para passar pelas escritas em dupla para pessoas/vínculos).
// CPF vai só com dígitos: `pessoas` guarda normalizado.

const as = (token) => (req) => req.set('Authorization', `Bearer ${token}`);
const get = (token, url) => as(token)(request(app).get(url));

let adminToken;
let ids; // { aluno, egresso, prof, admin, gestor, aluno2 }

// Chaves que a lista (GET /api/users) e o detalhe (GET /api/users/:id) devem repetir igual.
const CHAVES_COMUNS = [
  'id', 'email', 'roles', 'perfil_geral', 'dados_academicos', 'privacidade',
  'perfil_aluno', 'perfil_professor', 'programaId',
];

async function criar(corpo) {
  const res = await as(adminToken)(request(app).post('/api/users')).send({ password: 'senha123', ...corpo });
  expect(res.status, JSON.stringify(res.body)).toBe(201);
  return res.body;
}

beforeAll(async () => {
  await resetDb();
  await seedAdmin();
  adminToken = await loginAdmin();
  await pool.query(`INSERT INTO programas (id, nome, sigla, slug) VALUES ('ppg-1', 'Programa Um', 'PPU', 'programa-um')`);

  const aluno = await criar({
    email: 'aluna@test.com', roles: ['Aluno'], programaId: 'ppg-1', papelVinculo: 'DISCENTE_DOUTORADO',
    perfil_geral: { nome: 'Aluna Doutoranda', cpf: '', siape: '', foto_url: '', telefones: ['8199999-0000'] },
    dados_academicos: { lattes: 'http://lattes.cnpq.br/1', orcid: '', google_scholar: '', publons: '' },
    privacidade: { mostrar_email: true, mostrar_telefone: false },
    perfil_aluno: {
      nivel: 'Doutorando', entrada: '2024.1', situacao: 'Cursando', qualificacao: '2026-03-10', defesa: '',
      egresso: false, estrangeiro: true, nacionalidade: 'chilena', sexo: 'Feminino',
    },
  });

  // Egresso: o vínculo EGRESSO entra por SQL (como a importação/ a tela de programa faz)
  // e o perfil é gravado por PUT.
  const egresso = await criar({
    email: 'egresso@test.com', roles: ['Aluno'], programaId: 'ppg-1',
    perfil_geral: { nome: 'Egresso Mestre', cpf: '', siape: '', foto_url: '', telefones: [] },
  });
  await pool.query(
    `INSERT INTO vinculos (id, programa_id, pessoa_id, papel, ativo, criado_em)
     VALUES ('vinc-egresso', 'ppg-1', $1, 'EGRESSO', FALSE, now())`, [egresso.pessoaId]);
  const putEgresso = await as(adminToken)(request(app).put(`/api/users/${egresso.id}`))
    .send({ perfil_aluno: { nivel: 'Mestre', egresso: true } });
  expect(putEgresso.status, JSON.stringify(putEgresso.body)).toBe(200);

  const prof = await criar({
    email: 'prof@test.com', roles: ['Professor'], programaId: 'ppg-1', papelVinculo: 'DOCENTE_COLABORADOR',
    perfil_geral: {
      nome: 'Prof. Colaborador', cpf: '11144477735', siape: '1234567',
      foto_url: '/uploads/prof.png', telefones: ['8188888-1111', '8188888-2222'],
    },
    dados_academicos: { lattes: 'http://lattes.cnpq.br/2', orcid: '0000-0002', google_scholar: 'gs-2', publons: 'pub-2' },
    privacidade: { mostrar_email: false, mostrar_telefone: true },
    perfil_professor: {
      programas: ['ppg-1'], tipo: 'Colaborador', tipo_professor: 'Colaborador',
      estrangeiro: false, nacionalidade: 'brasileira', sexo: 'Masculino',
    },
  });

  // Sem perfil: prova que perfil_aluno/perfil_professor são null para quem não tem o papel.
  await seedUser({ id: 'gestor-test', email: 'gestor@test.com', roles: ['Gestor'], perfil_geral: { nome: 'Gestor Teste' } });

  // Aluno sem nenhum dado de vínculo, com o que o formulário manda por padrão.
  const aluno2 = await criar({
    email: 'aluno2@test.com', roles: ['Aluno'],
    perfil_geral: { nome: 'Aluno Sem Programa', cpf: '', siape: '', foto_url: '', telefones: [] },
    perfil_aluno: { nivel: 'Mestrando', situacao: 'Matriculado' },
  });

  ids = { aluno: aluno.id, egresso: egresso.id, prof: prof.id, admin: 'admin-test', gestor: 'gestor-test', aluno2: aluno2.id };
}, 60000);

afterAll(async () => {
  await pool.end();
});

describe('GET /api/users/:id e GET /api/users', () => {
  async function retrato(id) {
    const detalhe = await get(adminToken, `/api/users/${id}`);
    expect(detalhe.status).toBe(200);
    const lista = await get(adminToken, '/api/users');
    expect(lista.status).toBe(200);
    expect(Array.isArray(lista.body)).toBe(true);
    const naLista = lista.body.find((u) => u.id === id);
    expect(naLista).toBeTruthy();
    return { detalhe: detalhe.body, naLista };
  }

  function mesmasChaves(detalhe, naLista) {
    for (const k of CHAVES_COMUNS) expect(naLista[k], `chave ${k}`).toEqual(detalhe[k]);
    expect(Object.keys(detalhe)).not.toContain('password_hash');
    expect(Object.keys(naLista)).not.toContain('password_hash');
    expect(JSON.stringify(detalhe)).not.toMatch(/password/i);
  }

  it('aluno doutorando: perfil geral, dados acadêmicos, privacidade e perfil_aluno', async () => {
    const { detalhe, naLista } = await retrato(ids.aluno);
    expect(detalhe).toMatchObject({
      email: 'aluna@test.com',
      roles: ['Aluno'],
      perfil_geral: { nome: 'Aluna Doutoranda', cpf: '', siape: '', foto_url: '', telefones: ['8199999-0000'] },
      dados_academicos: { lattes: 'http://lattes.cnpq.br/1', orcid: '', google_scholar: '', publons: '' },
      privacidade: { mostrar_email: true, mostrar_telefone: false },
      perfil_aluno: {
        nivel: 'Doutorando', entrada: '2024.1', situacao: 'Cursando', qualificacao: '2026-03-10', defesa: '',
        egresso: false, estrangeiro: true, nacionalidade: 'chilena', sexo: 'Feminino',
      },
      perfil_professor: null,
      programaId: 'ppg-1',
    });
    expect(Array.isArray(detalhe.perfil_geral.telefones)).toBe(true);
    mesmasChaves(detalhe, naLista);
  });

  it('egresso: nível Mestre e egresso verdadeiro', async () => {
    const { detalhe, naLista } = await retrato(ids.egresso);
    expect(detalhe.roles).toEqual(['Aluno']);
    expect(detalhe.perfil_aluno).toMatchObject({ nivel: 'Mestre', egresso: true });
    expect(detalhe.perfil_professor).toBeNull();
    expect(detalhe.perfil_geral.telefones).toEqual([]);
    mesmasChaves(detalhe, naLista);
  });

  it('professor colaborador: perfil_professor com programas e tipo, sem perfil_aluno', async () => {
    const { detalhe, naLista } = await retrato(ids.prof);
    expect(detalhe).toMatchObject({
      email: 'prof@test.com',
      roles: ['Professor'],
      perfil_geral: {
        nome: 'Prof. Colaborador', cpf: '11144477735', siape: '1234567',
        foto_url: '/uploads/prof.png', telefones: ['8188888-1111', '8188888-2222'],
      },
      dados_academicos: { lattes: 'http://lattes.cnpq.br/2', orcid: '0000-0002', google_scholar: 'gs-2', publons: 'pub-2' },
      privacidade: { mostrar_email: false, mostrar_telefone: true },
      perfil_professor: {
        programas: ['ppg-1'], tipo: 'Colaborador', tipo_professor: 'Colaborador',
        estrangeiro: false, nacionalidade: 'brasileira', sexo: 'Masculino',
      },
      perfil_aluno: null,
      programaId: 'ppg-1',
    });
    mesmasChaves(detalhe, naLista);
  });

  it('Administrator e Gestor: perfil_aluno e perfil_professor são null', async () => {
    for (const [chave, nome, papel] of [['admin', 'Admin Teste', 'Administrator'], ['gestor', 'Gestor Teste', 'Gestor']]) {
      const { detalhe, naLista } = await retrato(ids[chave]);
      expect(detalhe.roles).toEqual([papel]);
      expect(detalhe.perfil_aluno).toBeNull();
      expect(detalhe.perfil_professor).toBeNull();
      expect(detalhe.perfil_geral.nome).toBe(nome);
      expect(detalhe.programaId).toBeNull();
      mesmasChaves(detalhe, naLista);
    }
  });

  it('aluno cadastrado com os padrões do formulário: perfil_aluno traz Mestrando/Matriculado', async () => {
    const { detalhe, naLista } = await retrato(ids.aluno2);
    expect(detalhe.perfil_aluno).not.toBeNull();
    expect(detalhe.perfil_aluno).toMatchObject({ nivel: 'Mestrando', situacao: 'Matriculado' });
    expect(detalhe.perfil_professor).toBeNull();
    mesmasChaves(detalhe, naLista);
  });

  it('cadastro sem perfil_aluno: aluno continua com um perfil (hoje {}, depois os padrões Mestrando/Matriculado)', async () => {
    const criado = await criar({
      email: 'semperfil@test.com', roles: ['Aluno'],
      perfil_geral: { nome: 'Aluno Sem Perfil', cpf: '', siape: '', foto_url: '', telefones: [] },
    });
    const { body } = await get(adminToken, `/api/users/${criado.id}`);
    expect(body.perfil_aluno).not.toBeNull();
    expect(typeof body.perfil_aluno).toBe('object');
    // O formato de hoje ({}) e o montado a partir dos vínculos (padrões) não podem trazer outro nível/situação.
    expect(body.perfil_aluno.nivel ?? 'Mestrando').toBe('Mestrando');
    expect(body.perfil_aluno.situacao ?? 'Matriculado').toBe('Matriculado');
    expect(body.perfil_professor).toBeNull();
  });

  it('a própria pessoa lê o detalhe sem hash de senha', async () => {
    const res = await get(await login('aluna@test.com'), `/api/users/${ids.aluno}`);
    expect(res.status).toBe(200);
    expect(res.body.perfil_geral.nome).toBe('Aluna Doutoranda');
    expect(Object.keys(res.body)).not.toContain('password_hash');
  });
});

describe('GET /api/users?q=', () => {
  it('acha o usuário por parte do nome e não traz os outros', async () => {
    const res = await get(adminToken, '/api/users?q=Doutorand');
    expect(res.status).toBe(200);
    const achados = res.body.map((u) => u.id);
    expect(achados).toContain(ids.aluno);
    expect(achados).not.toContain(ids.prof);
    expect(achados).not.toContain(ids.admin);
  });

  it('acha o professor por parte do nome, na forma paginada (?page)', async () => {
    const res = await get(adminToken, '/api/users?q=Colaborador&page=1&limit=10');
    expect(res.status).toBe(200);
    expect(res.body.items.map((u) => u.id)).toEqual([ids.prof]);
    expect(res.body.total).toBe(1);
    expect(res.body.items[0].perfil_professor).toMatchObject({ tipo: 'Colaborador', programas: ['ppg-1'] });
  });
});

describe('GET /api/users/resumo', () => {
  it('lista só id e nome de administradores e gestores', async () => {
    const res = await get(adminToken, '/api/users/resumo');
    expect(res.status).toBe(200);
    expect(res.body).toEqual(expect.arrayContaining([
      { id: 'admin-test', nome: 'Admin Teste' },
      { id: 'gestor-test', nome: 'Gestor Teste' },
    ]));
    const achados = res.body.map((r) => r.id);
    expect(achados).not.toContain(ids.aluno);
    expect(achados).not.toContain(ids.prof);
    for (const r of res.body) expect(Object.keys(r).sort()).toEqual(['id', 'nome']);
  });

  it('é vedado a aluno e a quem não está logado', async () => {
    expect((await get(await login('aluna@test.com'), '/api/users/resumo')).status).toBe(403);
    expect((await request(app).get('/api/users/resumo')).status).toBe(401);
  });
});

describe('POST /api/login', () => {
  it('devolve o nome do perfil geral e os papéis', async () => {
    const res = await request(app).post('/api/login').send({ username: 'aluna@test.com', password: 'senha123' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      username: 'aluna@test.com', roles: ['Aluno'], nome: 'Aluna Doutoranda', programaId: 'ppg-1', senhaTemporaria: false,
    });
    expect(typeof res.body.token).toBe('string');
    expect(Object.keys(res.body)).not.toContain('password_hash');
  });

  it('usa o e-mail no lugar do nome quando não há nome', async () => {
    await seedUser({ id: 'sem-nome', email: 'semnome@test.com', roles: ['Gestor'] });
    const res = await request(app).post('/api/login').send({ username: 'semnome@test.com', password: 'senha123' });
    expect(res.status).toBe(200);
    expect(res.body.nome).toBe('semnome@test.com');
  });

  it('recusa senha errada', async () => {
    const res = await request(app).post('/api/login').send({ username: 'aluna@test.com', password: 'errada' });
    expect(res.status).toBe(401);
  });
});

describe('página pública de docentes do programa', () => {
  it('GET /api/programas/slug/:slug/pessoas traz nome e Lattes do docente', async () => {
    const res = await request(app).get('/api/programas/slug/programa-um/pessoas');
    expect(res.status).toBe(200);
    const docente = res.body.find((m) => m.nome === 'Prof. Colaborador');
    expect(docente).toBeTruthy();
    expect(docente).toMatchObject({
      papel: 'DOCENTE_COLABORADOR', lattes: 'http://lattes.cnpq.br/2', orcid: '0000-0002',
      google_scholar: 'gs-2', foto_url: '/uploads/prof.png',
    });
    // dados sensíveis nunca saem na página pública
    expect(JSON.stringify(res.body)).not.toMatch(/11144477735|1234567|prof@test\.com|8188888/);
    // só docentes: o aluno não aparece
    expect(res.body.map((m) => m.nome)).not.toContain('Aluna Doutoranda');
  });
});

// Por último: altera a conta do aluno.
describe('/api/minha-conta', () => {
  it('GET devolve nome, telefones, Lattes e privacidade do aluno', async () => {
    const res = await get(await login('aluna@test.com'), '/api/minha-conta');
    expect(res.status).toBe(200);
    expect(res.body.conta).toMatchObject({
      id: ids.aluno, email: 'aluna@test.com', roles: ['Aluno'], nome: 'Aluna Doutoranda',
      telefones: ['8199999-0000'], lattes: 'http://lattes.cnpq.br/1', orcid: '', googleScholar: '',
      privacidade: { mostrarEmail: true, mostrarTelefone: false },
    });
    expect(JSON.stringify(res.body)).not.toMatch(/password/i);
  });

  it('GET do professor mostra o CPF só mascarado', async () => {
    const res = await get(await login('prof@test.com'), '/api/minha-conta');
    expect(res.status).toBe(200);
    expect(res.body.conta).toMatchObject({
      nome: 'Prof. Colaborador', siape: '1234567', cpfMascarado: '***.444.777-**',
      telefones: ['8188888-1111', '8188888-2222'],
      privacidade: { mostrarEmail: false, mostrarTelefone: true },
    });
    expect(JSON.stringify(res.body)).not.toContain('11144477735');
  });

  it('PUT altera telefone e Lattes, e o GET /api/users/:id reflete a mudança sem mexer no resto', async () => {
    const token = await login('aluna@test.com');
    const res = await as(token)(request(app).put('/api/minha-conta')).send({
      telefones: ['81977770000', '8133334444'],
      lattes: 'http://lattes.cnpq.br/novo',
      privacidade: { mostrarTelefone: true },
    });
    expect(res.status).toBe(200);
    expect(res.body.conta).toMatchObject({
      telefones: ['81977770000', '8133334444'], lattes: 'http://lattes.cnpq.br/novo',
      privacidade: { mostrarEmail: true, mostrarTelefone: true },
    });

    const depois = await get(adminToken, `/api/users/${ids.aluno}`);
    expect(depois.body.perfil_geral.telefones).toEqual(['81977770000', '8133334444']);
    expect(depois.body.dados_academicos.lattes).toBe('http://lattes.cnpq.br/novo');
    expect(depois.body.privacidade).toEqual({ mostrar_email: true, mostrar_telefone: true });
    // nome e perfil de aluno seguem iguais
    expect(depois.body.perfil_geral.nome).toBe('Aluna Doutoranda');
    expect(depois.body.perfil_aluno).toMatchObject({ nivel: 'Doutorando', entrada: '2024.1', estrangeiro: true, nacionalidade: 'chilena' });
    expect(depois.body.roles).toEqual(['Aluno']);
  });
});
