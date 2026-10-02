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
import professoresImporter from '../services/importers/professoresImporter.js';
import alunosImporter from '../services/importers/alunosImporter.js';
import tesesImporter from '../services/importers/tesesImporter.js';
import { hojeISO } from '../utils/datas.js';

// Desde a Task 10 (FK) só existe a forma pessoas.id.
const FORMAS = ['pessoa'];
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
    await vincular('v-doc', gravado(forma, ana), 'DOCENTE_PERMANENTE');
    const antes = await asAdmin(request(app).get('/api/users/u-ana'));
    expect(antes.body.perfil_professor.programas).toEqual(['prog-1']);
    const r = await asAdmin(request(app).delete('/api/programas/prog-1/docentes/v-doc'));
    expect(r.status).toBe(200);
    const depois = await asAdmin(request(app).get('/api/users/u-ana'));
    expect(depois.body.perfil_professor.programas).toEqual([]);
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

describe.each(FORMAS)('B.11 grupos de pesquisa — líder gravado por %s', (forma) => {
  it('o líder sai com o id de login (o formulário compara com a lista de professores)', async () => {
    const ana = await seedUserComPessoa({ id: 'u-ana', email: 'ana@t.br', nome: 'Ana Líder' });
    const g = await asAdmin(request(app).post('/api/grupos-pesquisa')).send({ title: 'Grupo B11', body: { value: '', summary: '' } });
    await pool.query(
      `INSERT INTO vinculos (id, grupo_pesquisa_id, pessoa_id, papel, ativo) VALUES ('v-lid', $1, $2, 'LIDER_GRUPO_PESQUISA', TRUE)`,
      [g.body.id, gravado(forma, ana)]
    );
    const r = await asAdmin(request(app).get('/api/grupos-pesquisa'));
    expect(r.body.find((x) => x.id === g.body.id).lideres).toEqual([expect.objectContaining({ id: 'u-ana', nome: 'Ana Líder' })]);
  });
});

describe.each(FORMAS)('B.11 importadores legados — vínculo gravado por %s', (forma) => {
  const contar = async (like) => (await pool.query(
    'SELECT count(*)::int AS n FROM vinculos WHERE papel LIKE $1', [like]
  )).rows[0].n;

  it('professor já vinculado fica "inalterado", sem vínculo duplicado', async () => {
    const ana = await seedUserComPessoa({ id: 'u-ana', email: 'ana@t.br', nome: 'Ana' });
    await vincular('v-doc', gravado(forma, ana), 'DOCENTE_PERMANENTE');
    const m = professoresImporter.map({ name: [{ value: 'Ana' }], mail: [{ value: 'ana@t.br' }] });
    const r = await professoresImporter.importOne(m, { programaId: 'prog-1', actor: 'admin-test', dryRun: false });
    expect(r.acao).toBe('inalterado');
    expect(await contar('DOCENTE%')).toBe(1);
  });

  it('aluno reimportado reaproveita o vínculo existente', async () => {
    const bia = await seedUserComPessoa({ id: 'u-bia', email: 'bia@t.br', nome: 'Bia', roles: ['Aluno'] });
    await vincular('v-disc', gravado(forma, bia), 'DISCENTE_MESTRADO');
    const m = alunosImporter.map({ name: [{ value: 'Bia' }], mail: [{ value: 'bia@t.br' }] });
    await alunosImporter.importOne(m, { programaId: 'prog-1', actor: 'admin-test', dryRun: false });
    expect(await contar('DISCENTE%')).toBe(1);
  });
});

// B.13 / G1 (Task 3): os importadores legados gravam também vinculos.dados
// (uid_legado + origem_import) e pessoas; orientador e autor de tese são
// resolvidos por vinculos.dados, não por users.perfil_*.
describe('B.13 importadores legados — vinculos.dados e pessoas', () => {
  const opts = { programaId: 'prog-1', actor: 'admin-test', dryRun: false };
  const vinculoDe = async (email) => (await pool.query(
    `SELECT v.papel, v.ativo, v.dados, v.pessoa_id FROM vinculos v JOIN users u ON u.pessoa_id = v.pessoa_id
      WHERE u.email = $1 AND v.programa_id = 'prog-1'`, [email])).rows;
  const pessoaDoEmail = async (email) => (await pool.query(
    'SELECT p.* FROM pessoas p JOIN users u ON u.pessoa_id = p.id WHERE u.email = $1', [email])).rows[0];
  const importarProfessor = (uid, email = `prof${uid}@t.br`) => professoresImporter.importOne(professoresImporter.map({
    uid: [{ value: uid }], name: [{ value: `Prof ${uid}` }], mail: [{ value: email }],
    field_sexo: [{ value: 'Masculino' }], field_tipo_professor: [{ value: 'Colaborador' }],
  }), opts);

  it('professor novo: dados com uid_legado + origem, sexo em pessoas', async () => {
    await importarProfessor(103);
    const [v] = await vinculoDe('prof103@t.br');
    expect(v).toMatchObject({ papel: 'DOCENTE_COLABORADOR', ativo: true, dados: { uid_legado: '103', origem_import: 'profiap' } });
    expect((await pessoaDoEmail('prof103@t.br')).sexo).toBe('Masculino');
  });

  it('professor já cadastrado que ganha o programa: dados com o uid do export', async () => {
    await seedUserComPessoa({ id: 'u-ex', email: 'ex@t.br', nome: 'Ex' });
    await importarProfessor(104, 'ex@t.br');
    const [v] = await vinculoDe('ex@t.br');
    expect(v.dados).toEqual({ uid_legado: '104', origem_import: 'profiap' });
  });

  it('aluno: dados do vínculo, orientador resolvido pela pessoa do professor, placeholder de qualificação descartado', async () => {
    await importarProfessor(103);
    const prof = await pessoaDoEmail('prof103@t.br');
    await alunosImporter.importOne(alunosImporter.map({
      uid: [{ value: 501 }], name: [{ value: 'Aluna' }], mail: [{ value: 'aluna@t.br' }],
      field_sexo: [{ value: 'Feminino' }], field_nivel: [{ value: 'Doutorado' }],
      field_orientador: [{ target_id: 103 }],
      field_qualificacao: [{ value: '2020-10-29T00:00:00' }], field_defesa: [{ value: '2024-05-10T00:00:00' }],
    }), opts);
    const [v] = await vinculoDe('aluna@t.br');
    expect(v.papel).toBe('DISCENTE_DOUTORADO');
    expect(v.dados).toEqual({ uid_legado: '501', origem_import: 'profiap', situacao: 'Matriculado',
      defesa: '2024-05-10', egresso: false, orientador_pessoa_id: prof.id });
    expect((await pessoaDoEmail('aluna@t.br')).sexo).toBe('Feminino');
  });

  it('aluno egresso: o nível vai para dados.nivel', async () => {
    await alunosImporter.importOne(alunosImporter.map({
      uid: [{ value: 502 }], name: [{ value: 'Egressa' }], mail: [{ value: 'egressa@t.br' }],
      field_nivel: [{ value: 'Mestrado' }], field_egresso: [{ value: true }],
    }), opts);
    const [v] = await vinculoDe('egressa@t.br');
    expect(v.papel).toBe('EGRESSO');
    expect(v.dados).toMatchObject({ nivel: 'MESTRADO', egresso: true, uid_legado: '502' });
  });

  it('aluno reimportado não apaga o "estrangeiro" que a pessoa já tinha (o export não traz esse dado)', async () => {
    const bia = await seedUserComPessoa({ id: 'u-bia', email: 'bia@t.br', nome: 'Bia', roles: ['Aluno'] });
    await pool.query('UPDATE pessoas SET estrangeiro = TRUE, nacionalidade = $2 WHERE id = $1', [bia.pessoaId, 'chilena']);
    await alunosImporter.importOne(alunosImporter.map({ uid: [{ value: 503 }], name: [{ value: 'Bia' }], mail: [{ value: 'bia@t.br' }] }), opts);
    expect(await pessoaDoEmail('bia@t.br')).toMatchObject({ estrangeiro: true, nacionalidade: 'chilena' });
    const [v] = await vinculoDe('bia@t.br');
    expect(v.dados).toMatchObject({ uid_legado: '503', origem_import: 'profiap' });
  });

  it('tese: o autor é a pessoa cujo vínculo tem o uid do export', async () => {
    await alunosImporter.importOne(alunosImporter.map({
      uid: [{ value: 601 }], name: [{ value: 'Autora' }], mail: [{ value: 'autora@t.br' }],
    }), opts);
    const autora = await pessoaDoEmail('autora@t.br');
    const r = await tesesImporter.importOne(tesesImporter.map({
      uuid: [{ value: 'tese-uuid-1' }], title: [{ value: 'Tese Um' }], field_tipo_td: [{ value: 'Tese' }],
      field_autor: [{ target_id: 601, url: '/pt-br/authenticated/autora' }],
    }), opts);
    expect(r.acao).toBe('criado');
    const { rows: [t] } = await pool.query(`SELECT autor_pessoa_id FROM teses_dissertacoes WHERE id = 'tese-tese-uuid-1'`);
    expect(t.autor_pessoa_id).toBe(autora.id);

    // uid que não é de ninguém: pessoa mínima pelo nome do slug (não cai em users).
    await tesesImporter.importOne(tesesImporter.map({
      uuid: [{ value: 'tese-uuid-2' }], title: [{ value: 'Tese Dois' }],
      field_autor: [{ target_id: 999, url: '/pt-br/authenticated/fulano-de-tal' }],
    }), opts);
    const { rows: [t2] } = await pool.query(
      `SELECT p.nome FROM teses_dissertacoes t JOIN pessoas p ON p.id = t.autor_pessoa_id WHERE t.id = 'tese-tese-uuid-2'`);
    expect(t2.nome).toBe('Fulano De Tal');
  });
});

describe('B.11 escritas gravam pessoas.id', () => {
  let ana;
  beforeEach(async () => {
    ana = await seedUserComPessoa({ id: 'u-ana', email: 'ana@t.br', nome: 'Ana' });
  });

  it('docente, discente e comissão', async () => {
    await asAdmin(request(app).post('/api/programas/prog-1/docentes')).send({ pessoa_id: 'u-ana', papel: 'DOCENTE_PERMANENTE' });
    await asAdmin(request(app).post('/api/programas/prog-1/discentes')).send({ pessoa_id: 'u-ana', papel: 'DISCENTE_DOUTORADO' });
    await asAdmin(request(app).post('/api/programas/prog-1/comissoes')).send({ pessoa_id: 'u-ana', papel: 'COMISSAO_CPG' });
    const { rows } = await pool.query(`SELECT DISTINCT pessoa_id FROM vinculos WHERE programa_id = 'prog-1'`);
    expect(rows).toEqual([{ pessoa_id: ana.pessoaId }]);
  });

  it('coordenação pelo formulário do programa', async () => {
    await asAdmin(request(app).put('/api/programas/prog-1')).send({ coordenador_atual: { pessoa_id: 'u-ana', portaria: 'P1' } });
    const { rows } = await pool.query(`SELECT pessoa_id FROM vinculos WHERE papel = 'COORDENADOR_ATUAL'`);
    expect(rows).toEqual([{ pessoa_id: ana.pessoaId }]);
  });

  it('cadastro de usuário já vinculado ao programa', async () => {
    const r = await asAdmin(request(app).post('/api/users')).send({
      email: 'novo@t.br', roles: ['Aluno'], programaId: 'prog-1', papelVinculo: 'DISCENTE_MESTRADO', perfil_geral: { nome: 'Novo' },
    });
    expect(r.status).toBe(201);
    const { rows } = await pool.query(
      `SELECT v.pessoa_id, u.pessoa_id AS esperado FROM vinculos v JOIN users u ON u.id = $1 WHERE v.papel = 'DISCENTE_MESTRADO'`,
      [r.body.id]
    );
    expect(rows[0].pessoa_id).toBe(rows[0].esperado);
  });

  it('relatoria da Câmara', async () => {
    const proc = await asAdmin(request(app).post('/api/camara/processos')).send({ numero: '23082.000010/2026-11', assunto: 'B.11' });
    const r = await asAdmin(request(app).post(`/api/camara/processos/${proc.body.id}/relatorias`)).send({ relatorId: 'u-ana', relatorNome: 'Ana' });
    expect(r.status).toBeLessThan(300);
    const { rows } = await pool.query('SELECT relator_id FROM camara_relatorias');
    expect(rows).toEqual([{ relator_id: ana.pessoaId }]);
  });

  it('líderes de grupo, sem mudar o id que o formulário recebe', async () => {
    const g = await asAdmin(request(app).post('/api/grupos-pesquisa')).send({ title: 'G', body: { value: '', summary: '' }, liderIds: ['u-ana'] });
    expect(g.body.lideres).toEqual([expect.objectContaining({ id: 'u-ana' })]);
    const { rows } = await pool.query(`SELECT pessoa_id FROM vinculos WHERE papel = 'LIDER_GRUPO_PESQUISA'`);
    expect(rows).toEqual([{ pessoa_id: ana.pessoaId }]);
  });

  it('id que não é de ninguém responde 400 e não grava nada', async () => {
    const a = await asAdmin(request(app).post('/api/programas/prog-1/docentes')).send({ pessoa_id: 'ninguem', papel: 'DOCENTE_PERMANENTE' });
    const b = await asAdmin(request(app).put('/api/programas/prog-1')).send({ coordenador_atual: { pessoa_id: 'ninguem' } });
    const c = await asAdmin(request(app).post('/api/grupos-pesquisa')).send({ title: 'G2', liderIds: ['ninguem'] });
    expect([a.status, b.status, c.status]).toEqual([400, 400, 400]);
    expect((await pool.query('SELECT count(*)::int AS n FROM vinculos')).rows[0].n).toBe(0);
    const grupos = await asAdmin(request(app).get('/api/grupos-pesquisa'));
    expect(grupos.body.some((x) => x.title === 'G2')).toBe(false);
  });
});

describe('B.11 D-B11c — excluir usuário mantém o histórico', () => {
  it('encerra os vínculos ativos, preserva egresso, pessoa e relatoria', async () => {
    const ana = await seedUserComPessoa({ id: 'u-ana', email: 'ana@t.br', nome: 'Ana' });
    await vincular('v-doc', ana.pessoaId, 'DOCENTE_PERMANENTE');
    await vincular('v-egr', ana.pessoaId, 'EGRESSO');
    const proc = await asAdmin(request(app).post('/api/camara/processos')).send({ numero: '23082.000011/2026-11', assunto: 'B.11' });
    await pool.query(
      `INSERT INTO camara_relatorias (id, processo_id, relator_id, relator_nome, ativa) VALUES ('rel-1', $1, $2, 'Ana', TRUE)`,
      [proc.body.id, ana.pessoaId]
    );

    const del = await asAdmin(request(app).delete('/api/users/u-ana'));
    expect(del.status).toBe(200);

    const { rows } = await pool.query('SELECT id, ativo, data_fim_mandato FROM vinculos ORDER BY id');
    expect(rows).toEqual([
      { id: 'v-doc', ativo: false, data_fim_mandato: hojeISO() },
      { id: 'v-egr', ativo: true, data_fim_mandato: null },
    ]);
    expect((await pool.query('SELECT count(*)::int AS n FROM pessoas WHERE id = $1', [ana.pessoaId])).rows[0].n).toBe(1);
    expect((await pool.query('SELECT relator_id, ativa FROM camara_relatorias')).rows).toEqual([{ relator_id: ana.pessoaId, ativa: true }]);
    expect((await request(app).get('/api/programas/slug/pu/pessoas')).body).toEqual([]);
  });
});
