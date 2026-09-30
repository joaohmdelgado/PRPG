import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';
import { pool } from '../db/pool.js';
import { usersRepo } from '../db/repositories.js';
import { resetDb, seedAdmin, seedUser, seedUserComPessoa, loginAdmin, login } from './helpers.js';
import {
  joinPessoa, pessoaReal, doUsuario, idsDaMesmaPessoa, nomePessoa,
} from '../db/identidadeVinculo.js';
import { resolverPessoa } from '../services/prazos.js';

// B.11 (docs/analise-fk-vinculos-pessoa-id-b3.md). Durante a transição cada
// caso roda com o vínculo gravado pelo users.id (legado) e pelo pessoas.id; a
// Task 10 (FK) deixa só 'pessoa'.
const FORMAS = ['usuario', 'pessoa'];
const gravado = (forma, pessoa) => (forma === 'usuario' ? pessoa.usuarioId : pessoa.pessoaId);
const vincular = (id, pessoaIdGravado, papel, programaId = 'prog-1') => pool.query(
  `INSERT INTO vinculos (id, programa_id, pessoa_id, papel, ativo, criado_em) VALUES ($1, $2, $3, $4, TRUE, now())`,
  [id, programaId, pessoaIdGravado, papel]
);

let token;
beforeEach(async () => {
  await resetDb();
  await seedAdmin();
  await pool.query(`INSERT INTO programas (id, nome, sigla, slug) VALUES ('prog-1', 'Programa Um', 'PU', 'pu')`);
  token = await loginAdmin();
});
afterAll(async () => { await pool.end(); });
const asAdmin = (req) => req.set('Authorization', `Bearer ${token}`);

describe.each(FORMAS)('B.11 identidadeVinculo — vínculo gravado por %s', (forma) => {
  it('joinPessoa acha login e pessoa; pessoaReal devolve o pessoas.id', async () => {
    const ana = await seedUserComPessoa({ id: 'u-ana', email: 'ana@t.br', nome: 'Ana' });
    await vincular('v1', gravado(forma, ana), 'DOCENTE_PERMANENTE');
    const { rows } = await pool.query(
      `SELECT u.id AS usuario_id, p.id AS pessoa_id, ${pessoaReal('v.pessoa_id')} AS real, ${nomePessoa()} AS nome
         FROM vinculos v ${joinPessoa('v.pessoa_id')}`
    );
    expect(rows).toEqual([{ usuario_id: 'u-ana', pessoa_id: ana.pessoaId, real: ana.pessoaId, nome: 'Ana' }]);
  });

  it('doUsuario casa o vínculo com o usuário', async () => {
    const ana = await seedUserComPessoa({ id: 'u-ana', email: 'ana@t.br', nome: 'Ana' });
    await vincular('v1', gravado(forma, ana), 'DOCENTE_PERMANENTE');
    const { rows } = await pool.query(
      `SELECT v.id FROM vinculos v JOIN users u ON ${doUsuario('v.pessoa_id')} WHERE u.id = 'u-ana'`
    );
    expect(rows.map((r) => r.id)).toEqual(['v1']);
  });
});

describe('B.11 identidadeVinculo — casos fixos', () => {
  it('pessoa sem login: usuario nulo, nome da pessoa', async () => {
    await pool.query(`INSERT INTO pessoas (id, nome) VALUES ('pes-sem', 'Sem Login')`);
    await vincular('v1', 'pes-sem', 'SECRETARIO');
    const { rows } = await pool.query(
      `SELECT u.id AS usuario_id, ${nomePessoa()} AS nome FROM vinculos v ${joinPessoa('v.pessoa_id')}`
    );
    expect(rows).toEqual([{ usuario_id: null, nome: 'Sem Login' }]);
  });

  it('idsDaMesmaPessoa parte de qualquer um dos dois ids', async () => {
    const ana = await seedUserComPessoa({ id: 'u-ana', email: 'ana@t.br', nome: 'Ana' });
    const esperado = [ana.pessoaId, 'u-ana'].sort();
    expect((await idsDaMesmaPessoa('u-ana')).sort()).toEqual(esperado);
    expect((await idsDaMesmaPessoa(ana.pessoaId)).sort()).toEqual(esperado);
    expect(await idsDaMesmaPessoa('ninguem')).toEqual(['ninguem']);
    expect(await idsDaMesmaPessoa(null)).toEqual([]);
  });
});

describe('B.11 D-B11b — usersRepo leva os dados da pessoa para `pessoas`', () => {
  const pessoaDe = async (usuarioId) => (await pool.query(
    'SELECT p.* FROM pessoas p JOIN users u ON u.pessoa_id = p.id WHERE u.id = $1', [usuarioId]
  )).rows[0];

  it('cadastrar cria e liga a pessoa, com CPF normalizado e sem copiar o e-mail de login', async () => {
    const u = await seedUser({ id: 'u-novo', email: 'novo@gmail.com', perfil_geral: { nome: 'Novo', cpf: '529.982.247-25' } });
    expect(u.pessoaId).toBeTruthy();
    expect(await pessoaDe('u-novo')).toMatchObject({
      id: u.pessoaId, nome: 'Novo', cpf: '52998224725', cpf_valido: true, email_institucional: null,
    });
  });

  it('cadastrar com o CPF de uma pessoa sem login liga a ela e só preenche o que falta', async () => {
    await pool.query(`INSERT INTO pessoas (id, nome, cpf) VALUES ('pes-imp', 'NOME DA PLANILHA', '52998224725')`);
    const u = await seedUser({
      id: 'u-imp', email: 'imp@t.br', perfil_geral: { nome: 'Nome do Painel', cpf: '529.982.247-25', foto_url: '/uploads/f.jpg' },
    });
    expect(u.pessoaId).toBe('pes-imp');
    expect(await pessoaDe('u-imp')).toMatchObject({ nome: 'NOME DA PLANILHA', foto_url: '/uploads/f.jpg' });
  });

  it('editar leva só o que mudou e nunca apaga valor preenchido em `pessoas`', async () => {
    const u = await seedUser({ id: 'u-ed', email: 'ed@t.br', perfil_geral: { nome: 'Antes' } });
    await pool.query(
      `UPDATE pessoas SET foto_url = '/uploads/estrutura.jpg', lattes = 'http://lattes/1' WHERE id = $1`, [u.pessoaId]
    );
    await usersRepo.update('u-ed', {
      perfil_geral: { ...u.perfil_geral, nome: 'Depois', foto_url: '' },
      dados_academicos: { lattes: '' },
    });
    expect(await pessoaDe('u-ed')).toMatchObject({
      nome: 'Depois', foto_url: '/uploads/estrutura.jpg', lattes: 'http://lattes/1',
    });
  });

  it('usuário antigo sem pessoa ganha uma na próxima gravação', async () => {
    await seedUser({ id: 'u-velho', email: 'velho@t.br', perfil_geral: { nome: 'Velho' } });
    await pool.query('UPDATE users SET pessoa_id = NULL WHERE id = $1', ['u-velho']);
    const atualizado = await usersRepo.update('u-velho', { roles: ['Aluno', 'Professor'] });
    expect(atualizado.pessoaId).toBeTruthy();
    expect(await pessoaDe('u-velho')).toMatchObject({ nome: 'Velho' });
  });
});

describe.each(FORMAS)('B.11 programas — vínculo gravado por %s', (forma) => {
  let ana;
  beforeEach(async () => {
    ana = await seedUserComPessoa({ id: 'u-ana', email: 'ana@t.br', nome: 'Ana Docente' });
  });

  it('lista pública e do painel mostram o docente; usuario_id só no painel', async () => {
    await vincular('v-doc', gravado(forma, ana), 'DOCENTE_PERMANENTE');
    const pub = await request(app).get('/api/programas/slug/pu/pessoas');
    expect(pub.body).toEqual([expect.objectContaining({ id: 'v-doc', nome: 'Ana Docente', pessoa_id: ana.pessoaId })]);
    expect(pub.body[0].usuario_id).toBeUndefined();
    const adm = await asAdmin(request(app).get('/api/programas/prog-1/docentes'));
    expect(adm.body).toEqual([expect.objectContaining({ id: 'v-doc', nome: 'Ana Docente', pessoa_id: ana.pessoaId, usuario_id: 'u-ana' })]);
  });

  it('discentes e comissões idem', async () => {
    await vincular('v-disc', gravado(forma, ana), 'DISCENTE_DOUTORADO');
    await vincular('v-com', gravado(forma, ana), 'COMISSAO_CPG');
    const pub = await request(app).get('/api/programas/slug/pu/discentes');
    expect(pub.body).toEqual([expect.objectContaining({ id: 'v-disc', nome: 'Ana Docente' })]);
    const disc = await asAdmin(request(app).get('/api/programas/prog-1/discentes'));
    expect(disc.body).toEqual([expect.objectContaining({ id: 'v-disc', usuario_id: 'u-ana' })]);
    const com = await asAdmin(request(app).get('/api/programas/prog-1/comissoes'));
    expect(com.body).toEqual([expect.objectContaining({ id: 'v-com', usuario_id: 'u-ana', nome: 'Ana Docente' })]);
  });

  it('vincular de novo a mesma pessoa pelo id de login dá 409', async () => {
    await vincular('v-doc', gravado(forma, ana), 'DOCENTE_PERMANENTE');
    const r = await asAdmin(request(app).post('/api/programas/prog-1/docentes'))
      .send({ pessoa_id: 'u-ana', papel: 'DOCENTE_COLABORADOR' });
    expect(r.status).toBe(409);
  });

  it('salvar o programa com o mesmo coordenador não encerra o mandato', async () => {
    await vincular('v-coord', gravado(forma, ana), 'COORDENADOR_ATUAL');
    await asAdmin(request(app).put('/api/programas/prog-1')).send({ coordenador_atual: { pessoa_id: 'u-ana', portaria: 'P2' } });
    const r = await asAdmin(request(app).get('/api/programas/prog-1'));
    expect(r.body.coordenador_atual).toMatchObject({ usuario_id: 'u-ana', pessoa_id: ana.pessoaId, portaria: 'P2', nome: 'Ana Docente' });
    expect(r.body.historico_coordenadores).toEqual([]);
  });

  it('o público não recebe usuario_id do coordenador', async () => {
    await vincular('v-coord', gravado(forma, ana), 'COORDENADOR_ATUAL');
    const r = await request(app).get('/api/programas/prog-1');
    expect(r.body.coordenador_atual.nome).toBe('Ana Docente');
    expect(r.body.coordenador_atual.usuario_id).toBeUndefined();
  });

  it('remover o docente tira o programa do perfil_professor do usuário', async () => {
    await pool.query(`UPDATE users SET perfil_professor = '{"programas": ["prog-1"]}' WHERE id = 'u-ana'`);
    await vincular('v-doc', gravado(forma, ana), 'DOCENTE_PERMANENTE');
    const r = await asAdmin(request(app).delete('/api/programas/prog-1/docentes/v-doc'));
    expect(r.status).toBe(200);
    const { rows } = await pool.query(`SELECT perfil_professor FROM users WHERE id = 'u-ana'`);
    expect(rows[0].perfil_professor.programas).toEqual([]);
  });
});

describe.each(FORMAS)('B.11 usuários e escopo — vínculo gravado por %s', (forma) => {
  beforeEach(async () => {
    const ana = await seedUserComPessoa({ id: 'u-ana', email: 'ana@t.br', nome: 'Ana Aluna', roles: ['Aluno'] });
    await vincular('v-disc', gravado(forma, ana), 'DISCENTE_MESTRADO');
  });

  it('a lista de usuários mostra o programa do vínculo', async () => {
    const r = await asAdmin(request(app).get('/api/users'));
    expect(r.body.find((u) => u.id === 'u-ana').programas_vinculo).toEqual([{ id: 'prog-1', sigla: 'PU', nome: 'Programa Um' }]);
  });

  it('o gestor do programa vê o aluno vinculado', async () => {
    await seedUser({ id: 'gp', email: 'gp@t.br', roles: ['GestorPrograma'] });
    await pool.query(`UPDATE users SET programa_id = 'prog-1' WHERE id = 'gp'`);
    const gp = await login('gp@t.br');
    const lista = await request(app).get('/api/users').set('Authorization', `Bearer ${gp}`);
    expect(lista.body.map((u) => u.id)).toContain('u-ana');
    const um = await request(app).get('/api/users/u-ana').set('Authorization', `Bearer ${gp}`);
    expect(um.status).toBe(200);
  });

  it('a proficiência reconhece o aluno matriculado', async () => {
    const r = await request(app).post('/api/proficiencia/verificar-aluno').send({ nome: 'Ana Aluna' });
    expect(r.body).toEqual({ encontrado: true });
  });
});

describe.each(FORMAS)('B.11 Câmara e notificações — gravado por %s', (forma) => {
  let ana;
  beforeEach(async () => {
    ana = await seedUserComPessoa({ id: 'u-ana', email: 'ana@t.br', nome: 'Ana Relatora' });
  });

  it('"Meus processos" traz a relatoria de quem está logado', async () => {
    const proc = await asAdmin(request(app).post('/api/camara/processos')).send({ numero: '23082.000009/2026-11', assunto: 'Teste B.11' });
    await pool.query(
      `INSERT INTO camara_relatorias (id, processo_id, relator_id, relator_nome, ativa) VALUES ('rel-1', $1, $2, 'Ana Relatora', TRUE)`,
      [proc.body.id, gravado(forma, ana)]
    );
    const t = await login('ana@t.br');
    const r = await request(app).get('/api/camara/meus-processos').set('Authorization', `Bearer ${t}`);
    expect(r.body.map((p) => p.numero)).toEqual(['23082.000009/2026-11']);
  });

  it('resolverPessoa cai no e-mail de login quando não há institucional', async () => {
    expect(await resolverPessoa(gravado(forma, ana))).toEqual({ nome: 'Ana Relatora', email: 'ana@t.br' });
  });
});

describe('B.11 pós-doutorado — pessoa com login', () => {
  it('nome da pessoa e e-mail de login', async () => {
    await seedUserComPessoa({ id: 'u-pd', email: 'pd@t.br', nome: 'Pós Doc' });
    const r = await asAdmin(request(app).post('/api/pos-doutorado')).send({
      pessoaId: 'u-pd', supervisorNome: 'Supervisor', projetoTitulo: 'Projeto', programaId: 'prog-1',
    });
    expect(r.status).toBe(201);
    expect(r.body).toMatchObject({ nome: 'Pós Doc', email: 'pd@t.br' });
  });
});
