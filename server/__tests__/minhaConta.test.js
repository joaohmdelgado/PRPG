import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';
import { pool } from '../db/pool.js';
import { resetDb, seedAdmin, seedUser, login, loginAdmin } from './helpers.js';

// Fase U.1 — /api/minha-conta: a própria conta de aluno e professor.

let adminToken;
let alunoToken;
let aluno2Token;
let profToken;

const as = (token) => (req) => req.set('Authorization', `Bearer ${token}`);

beforeEach(async () => {
  await resetDb();
  await seedAdmin();
  adminToken = await loginAdmin();
  await seedUser({
    id: 'aluno-1', email: 'aluno@test.com', roles: ['Aluno'],
    perfil_geral: { nome: 'João da Silva', cpf: '111.222.333-44' },
  });
  await seedUser({
    id: 'aluno-2', email: 'aluno2@test.com', roles: ['Aluno'],
    perfil_geral: { nome: 'Maria Souza', cpf: '555.666.777-88' },
  });
  await seedUser({
    id: 'prof-1', email: 'prof@test.com', roles: ['Professor'],
    perfil_geral: { nome: 'Prof. Ana' },
  });
  alunoToken = await login('aluno@test.com');
  aluno2Token = await login('aluno2@test.com');
  profToken = await login('prof@test.com');
});

afterAll(async () => {
  await pool.end();
});

async function periodoAberto() {
  const res = await as(adminToken)(request(app).post('/api/editais')).send({
    title: 'Proficiência Teste', proficiencia: true,
    field_periodo: { data_inicio: '2000-01-01', data_fim: '2999-12-31' },
  });
  return res.body.id;
}

async function inscrever(token) {
  const res = await as(token)(request(app).post('/api/proficiencia/inscricoes'))
    .send({ nivel: 'Mestrado', linguas: ['Inglês'], comprovanteResidenciaUrl: '/uploads/c.pdf' });
  expect(res.status).toBe(201);
  return res.body.id;
}

describe('GET /api/minha-conta', () => {
  it('exige login', async () => {
    const res = await request(app).get('/api/minha-conta');
    expect(res.status).toBe(401);
  });

  it('devolve os dados da própria pessoa, com o CPF mascarado e sem hash de senha', async () => {
    const res = await as(alunoToken)(request(app).get('/api/minha-conta'));
    expect(res.status).toBe(200);
    expect(res.body.conta.email).toBe('aluno@test.com');
    expect(res.body.conta.nome).toBe('João da Silva');
    expect(res.body.conta.cpfMascarado).toBe('***.222.333-**');
    expect(JSON.stringify(res.body)).not.toMatch(/password|111\.222\.333-44/);
    expect(res.body.inscricoes).toEqual([]);
    expect(res.body.relatorias).toEqual([]);
  });

  it('lista só as inscrições da própria pessoa, sem os comprovantes', async () => {
    await periodoAberto();
    const id1 = await inscrever(alunoToken);
    await inscrever(aluno2Token);

    const res = await as(alunoToken)(request(app).get('/api/minha-conta'));
    expect(res.body.inscricoes).toHaveLength(1);
    expect(res.body.inscricoes[0]).toMatchObject({ id: id1, nivel: 'Mestrado', linguas: ['Inglês'], status: 'INSCRITO' });
    expect(res.body.inscricoes[0].periodo).toBe('Proficiência Teste');
    expect(JSON.stringify(res.body.inscricoes)).not.toMatch(/comprovante|uploads/i);
  });

  it('lista as relatorias ativas de quem é relator', async () => {
    const proc = await as(adminToken)(request(app).post('/api/camara/processos'))
      .send({ numero: '23082.000001/2026-11', assunto: 'Credenciamento de docente' });
    expect(proc.status).toBe(201);
    await pool.query(
      `INSERT INTO camara_relatorias (id, processo_id, relator_id, relator_nome, prazo_devolucao, ativa)
       VALUES ('rel-1', $1, (SELECT pessoa_id FROM users WHERE id = 'prof-1'), 'Prof. Ana', '2000-01-10', TRUE)`,
      [proc.body.id]
    );
    const res = await as(profToken)(request(app).get('/api/minha-conta'));
    expect(res.body.relatorias).toHaveLength(1);
    expect(res.body.relatorias[0]).toMatchObject({ numero: '23082.000001/2026-11', prazo: '2000-01-10', atrasada: true });

    // Outra pessoa não vê a relatoria.
    const outra = await as(alunoToken)(request(app).get('/api/minha-conta'));
    expect(outra.body.relatorias).toEqual([]);
  });
});

describe('declarações', () => {
  async function avaliada(nota = 8) {
    await periodoAberto();
    const id = await inscrever(alunoToken);
    await as(adminToken)(request(app).put(`/api/proficiencia/inscricoes/${id}/nota`)).send({ nota });
    return id;
  }

  it('só aparecem depois que a secretaria emite, e o PDF é baixável pela própria pessoa', async () => {
    const id = await avaliada();

    const antes = await as(alunoToken)(request(app).get('/api/minha-conta'));
    expect(antes.body.declaracoes).toEqual([]);
    // Não dá para provocar a emissão pelo lado do aluno.
    const tentativa = await as(alunoToken)(request(app).get(`/api/minha-conta/declaracoes/${id}/pdf`));
    expect(tentativa.status).toBe(404);

    const emitida = await as(adminToken)(request(app).get(`/api/proficiencia/inscricoes/${id}/declaracao`));
    expect(emitida.status).toBe(200);

    const depois = await as(alunoToken)(request(app).get('/api/minha-conta'));
    expect(depois.body.declaracoes).toHaveLength(1);
    expect(depois.body.declaracoes[0]).toMatchObject({ rotulo: 'Proficiência em língua estrangeira', inscricaoId: id, revogada: false });
    expect(depois.body.inscricoes[0].declaracaoEmitida).toBe(true);

    const pdf = await as(alunoToken)(request(app).get(`/api/minha-conta/declaracoes/${id}/pdf`));
    expect(pdf.status).toBe(200);
    expect(pdf.headers['content-type']).toMatch(/application\/pdf/);
  });

  it('outra pessoa não vê nem baixa a declaração alheia', async () => {
    const id = await avaliada();
    await as(adminToken)(request(app).get(`/api/proficiencia/inscricoes/${id}/declaracao`));

    const lista = await as(aluno2Token)(request(app).get('/api/minha-conta'));
    expect(lista.body.declaracoes).toEqual([]);
    const pdf = await as(aluno2Token)(request(app).get(`/api/minha-conta/declaracoes/${id}/pdf`));
    expect(pdf.status).toBe(404);
  });

  it('declaração revogada não é baixada', async () => {
    const id = await avaliada();
    await as(adminToken)(request(app).get(`/api/proficiencia/inscricoes/${id}/declaracao`));
    await pool.query("UPDATE declaracoes SET revogada_em = now() WHERE entidade_id = $1", [id]);
    const pdf = await as(alunoToken)(request(app).get(`/api/minha-conta/declaracoes/${id}/pdf`));
    expect(pdf.status).toBe(404);
  });
});

describe('PUT /api/minha-conta', () => {
  it('atualiza contato, links acadêmicos e privacidade', async () => {
    const res = await as(profToken)(request(app).put('/api/minha-conta')).send({
      telefones: ['(81) 99999-0000', '  ', '(81) 3320-6000'],
      lattes: 'http://lattes.cnpq.br/123', orcid: 'https://orcid.org/0000-0000-0000-0000',
      privacidade: { mostrarEmail: true },
    });
    expect(res.status).toBe(200);
    expect(res.body.conta.telefones).toEqual(['(81) 99999-0000', '(81) 3320-6000']);
    expect(res.body.conta.lattes).toBe('http://lattes.cnpq.br/123');
    expect(res.body.conta.privacidade.mostrarEmail).toBe(true);
    expect(res.body.conta.privacidade.mostrarTelefone).toBe(false);
  });

  it('não deixa trocar nome, CPF, e-mail nem papéis', async () => {
    const res = await as(alunoToken)(request(app).put('/api/minha-conta')).send({
      nome: 'Outro Nome', cpf: '000', email: 'x@x.com', roles: ['Administrator'], telefones: ['1'],
    });
    expect(res.status).toBe(200);
    expect(res.body.conta.nome).toBe('João da Silva');
    expect(res.body.conta.email).toBe('aluno@test.com');
    expect(res.body.conta.roles).toEqual(['Aluno']);
    const painel = await as(alunoToken)(request(app).get('/api/users'));
    expect(painel.status).toBe(403);
  });

  it('rejeita link que não é http(s) e telefones demais', async () => {
    const link = await as(alunoToken)(request(app).put('/api/minha-conta')).send({ lattes: 'javascript:alert(1)' });
    expect(link.status).toBe(400);
    const tels = await as(alunoToken)(request(app).put('/api/minha-conta')).send({ telefones: ['1', '2', '3', '4', '5', '6'] });
    expect(tels.status).toBe(400);
  });
});

describe('PUT /api/minha-conta/senha', () => {
  it('troca a senha exigindo a atual', async () => {
    const errada = await as(alunoToken)(request(app).put('/api/minha-conta/senha'))
      .send({ senhaAtual: 'nao-e-essa', novaSenha: 'NovaSenha123' });
    expect(errada.status).toBe(403);

    const curta = await as(alunoToken)(request(app).put('/api/minha-conta/senha'))
      .send({ senhaAtual: 'senha123', novaSenha: 'curta' });
    expect(curta.status).toBe(400);

    const ok = await as(alunoToken)(request(app).put('/api/minha-conta/senha'))
      .send({ senhaAtual: 'senha123', novaSenha: 'NovaSenha123' });
    expect(ok.status).toBe(200);

    expect(await login('aluno@test.com', 'NovaSenha123')).toBeTruthy();
    const antiga = await request(app).post('/api/login').send({ username: 'aluno@test.com', password: 'senha123' });
    expect(antiga.status).toBe(401);
  });
});
