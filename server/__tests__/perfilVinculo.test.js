import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { pool } from '../db/pool.js';
import { resetDb, seedAdmin, seedUserComPessoa } from './helpers.js';
import {
  montarPerfilAluno, montarPerfilProfessor, nivelDeRotulo, temDadoDeVinculo,
  gravarPerfilNosVinculos, PerfilSemVinculo,
} from '../db/perfilVinculo.js';

const pessoa = { sexo: 'Feminino', nacionalidade: 'brasileiro(a)', estrangeiro: false };

describe('montarPerfilAluno', () => {
  it('matriculado: o nível vem do papel', () => {
    const p = montarPerfilAluno(pessoa, [{ programa_id: 'p1', papel: 'DISCENTE_DOUTORADO', ativo: true,
      dados: { entrada: '2023.1', situacao: 'Matriculado', uid_legado: '7', origem_import: 'profiap' } }]);
    expect(p).toMatchObject({ nivel: 'Doutorando', entrada: '2023.1', situacao: 'Matriculado', egresso: false,
      sexo: 'Feminino', estrangeiro: false, uid_legado: '7', origem_import: 'profiap', qualificacao: '', defesa: '', orientador_id: '' });
  });
  it('egresso: o nível vem de dados.nivel', () => {
    const p = montarPerfilAluno(pessoa, [{ programa_id: 'p1', papel: 'EGRESSO', ativo: true, dados: { nivel: 'MESTRADO', egresso: true } }]);
    expect(p.nivel).toBe('Mestre');
    expect(p.egresso).toBe(true);
    expect(montarPerfilAluno(pessoa, [{ papel: 'EGRESSO', ativo: true, dados: { nivel: 'DOUTORADO' } }]).nivel).toBe('Doutor');
  });
  it('sem vínculo: defaults do formulário', () => {
    expect(montarPerfilAluno(pessoa, [])).toMatchObject({ nivel: 'Mestrando', situacao: 'Matriculado', entrada: '', egresso: false });
  });
  it('prefere o vínculo ativo de discente ao de egresso', () => {
    const p = montarPerfilAluno(pessoa, [
      { programa_id: 'a', papel: 'EGRESSO', ativo: true, dados: { nivel: 'MESTRADO' } },
      { programa_id: 'b', papel: 'DISCENTE_DOUTORADO', ativo: true, dados: {} }]);
    expect(p.nivel).toBe('Doutorando');
  });
  it('orientador: a pessoa resolvida vence o texto legado', () => {
    expect(montarPerfilAluno(pessoa, [{ papel: 'EGRESSO', ativo: true, dados: { orientador_legado: 'x', orientador_pessoa_id: 'pes-1' } }]).orientador_id).toBe('pes-1');
    expect(montarPerfilAluno(pessoa, [{ papel: 'EGRESSO', ativo: true, dados: { orientador_legado: 'x' } }]).orientador_id).toBe('x');
  });
  it('ignora vínculos que não são de aluno', () => {
    const p = montarPerfilAluno(pessoa, [{ papel: 'DOCENTE_PERMANENTE', ativo: true, dados: { entrada: 'nao' } }]);
    expect(p).toMatchObject({ nivel: 'Mestrando', entrada: '' });
  });
});

describe('montarPerfilProfessor', () => {
  it('programas = vínculos docentes ativos; tipo = papel', () => {
    const p = montarPerfilProfessor(pessoa, [
      { programa_id: 'p1', papel: 'DOCENTE_PERMANENTE', ativo: true, dados: { uid_legado: '3', origem_import: 'profiap' } },
      { programa_id: 'p2', papel: 'DOCENTE_COLABORADOR', ativo: false, dados: {} }]);
    expect(p).toMatchObject({ programas: ['p1'], tipo: 'Permanente', tipo_professor: 'Permanente', uid_legado: '3', origem_import: 'profiap', sexo: 'Feminino' });
  });
  it('visitante', () => {
    expect(montarPerfilProfessor(pessoa, [{ programa_id: 'p1', papel: 'DOCENTE_VISITANTE', ativo: true, dados: null }]).tipo).toBe('Visitante');
  });
  it('sem vínculo: programas vazio e tipo Permanente (default do formulário)', () => {
    expect(montarPerfilProfessor(pessoa, [])).toMatchObject({ programas: [], tipo: 'Permanente' });
  });
});

describe('helpers', () => {
  it('nivelDeRotulo', () => {
    expect(nivelDeRotulo('Mestrando')).toBe('MESTRADO');
    expect(nivelDeRotulo('Mestre')).toBe('MESTRADO');
    expect(nivelDeRotulo('Doutorando')).toBe('DOUTORADO');
    expect(nivelDeRotulo('Doutor')).toBe('DOUTORADO');
    expect(nivelDeRotulo('')).toBeNull();
    expect(nivelDeRotulo(undefined)).toBeNull();
  });
  it('temDadoDeVinculo ignora os defaults do formulário', () => {
    expect(temDadoDeVinculo({ nivel: 'Mestrando', situacao: 'Matriculado', entrada: '', qualificacao: '', defesa: '' })).toBe(false);
    expect(temDadoDeVinculo({ sexo: 'Feminino', estrangeiro: true, nacionalidade: 'chilena' })).toBe(false);
    expect(temDadoDeVinculo({ entrada: '2023.1' })).toBe(true);
    expect(temDadoDeVinculo({ qualificacao: '2024-05-01' })).toBe(true);
    expect(temDadoDeVinculo({ defesa: '2025-02-01' })).toBe(true);
    expect(temDadoDeVinculo({ situacao: 'Trancado' })).toBe(true);
  });
});

describe('gravarPerfilNosVinculos', () => {
  beforeEach(async () => { await resetDb(); await seedAdmin(); });
  afterAll(async () => { await pool.end(); });

  const vinc = async (id) => (await pool.query('SELECT papel, ativo, dados, data_fim_mandato FROM vinculos WHERE id = $1', [id])).rows[0];
  const aluno = async (id) => seedUserComPessoa({ id, email: `${id}@t.br`, nome: `Aluno ${id}`, roles: ['Aluno'] });

  it('aluno: grava entrada/situação em vinculos.dados; nível de discente troca o papel; Mestre/Doutor não', async () => {
    const { pessoaId } = await aluno('u1');
    await pool.query(`INSERT INTO vinculos (id, pessoa_id, papel, ativo) VALUES ('v1', $1, 'DISCENTE_MESTRADO', TRUE)`, [pessoaId]);
    await gravarPerfilNosVinculos(pessoaId, { perfil_aluno: { nivel: 'Doutorando', entrada: '2024.1', situacao: 'Trancado' } });
    expect(await vinc('v1')).toMatchObject({ papel: 'DISCENTE_DOUTORADO', dados: { entrada: '2024.1', situacao: 'Trancado' } });
    await gravarPerfilNosVinculos(pessoaId, { perfil_aluno: { nivel: 'Mestre' } });
    expect((await vinc('v1')).papel).toBe('DISCENTE_DOUTORADO'); // "Mestre" não converte matriculado em egresso
    await gravarPerfilNosVinculos(pessoaId, { perfil_aluno: { nivel: 'Doutor' } });
    const v = await vinc('v1');
    expect(v.papel).toBe('DISCENTE_DOUTORADO');
    expect(v.dados.nivel).toBeUndefined(); // o nível do matriculado é o papel, não dados.nivel
    await gravarPerfilNosVinculos(pessoaId, { perfil_aluno: { nivel: 'Mestrando', entrada: '' } });
    expect(await vinc('v1')).toMatchObject({ papel: 'DISCENTE_MESTRADO', dados: { situacao: 'Trancado' } });
    expect((await vinc('v1')).dados.entrada).toBeUndefined(); // vazio apaga a chave
  });

  it('discente profissional: o nível não troca o papel', async () => {
    const { pessoaId } = await aluno('u1p');
    await pool.query(`INSERT INTO vinculos (id, pessoa_id, papel, ativo) VALUES ('v1p', $1, 'DISCENTE_PROFISSIONAL', TRUE)`, [pessoaId]);
    await gravarPerfilNosVinculos(pessoaId, { perfil_aluno: { nivel: 'Doutorando' } });
    expect((await vinc('v1p')).papel).toBe('DISCENTE_PROFISSIONAL');
  });

  it('egresso: o nível vai para dados.nivel e o papel continua EGRESSO', async () => {
    const { pessoaId } = await aluno('u-eg');
    await pool.query(`INSERT INTO vinculos (id, pessoa_id, papel, ativo, dados) VALUES ('ve', $1, 'EGRESSO', TRUE, '{"nivel":"MESTRADO"}')`, [pessoaId]);
    await gravarPerfilNosVinculos(pessoaId, { perfil_aluno: { nivel: 'Doutor', egresso: true, defesa: '2023-03-03' } });
    expect(await vinc('ve')).toMatchObject({ papel: 'EGRESSO', dados: { nivel: 'DOUTORADO', egresso: true, defesa: '2023-03-03' } });
  });

  it('aluno sem vínculo: 400 só com dado de vínculo de verdade', async () => {
    const { pessoaId } = await aluno('u2');
    await expect(gravarPerfilNosVinculos(pessoaId, { perfil_aluno: { nivel: 'Mestrando', situacao: 'Matriculado', entrada: '', qualificacao: '', defesa: '' } })).resolves.toBeUndefined();
    await expect(gravarPerfilNosVinculos(pessoaId, { perfil_aluno: { sexo: 'Feminino', estrangeiro: true, nacionalidade: 'chilena' } })).resolves.toBeUndefined();
    await expect(gravarPerfilNosVinculos(pessoaId, { perfil_aluno: { entrada: '2024.1' } })).rejects.toBeInstanceOf(PerfilSemVinculo);
    await expect(gravarPerfilNosVinculos(pessoaId, { perfil_aluno: { situacao: 'Trancado' } })).rejects.toBeInstanceOf(PerfilSemVinculo);
    await expect(gravarPerfilNosVinculos(pessoaId, { perfil_aluno: { defesa: '2025-01-01' } })).rejects.toMatchObject({ status: 400, expose: true });
    // um vínculo docente não conta como vínculo de aluno
    await pool.query(`INSERT INTO vinculos (id, pessoa_id, papel, ativo) VALUES ('vd2', $1, 'DOCENTE_PERMANENTE', TRUE)`, [pessoaId]);
    await expect(gravarPerfilNosVinculos(pessoaId, { perfil_aluno: { entrada: '2024.1' } })).rejects.toBeInstanceOf(PerfilSemVinculo);
  });

  it('descarta a qualificação placeholder 2020-10-29 e guarda uid_legado com origem_import', async () => {
    const { pessoaId } = await aluno('u-q');
    await pool.query(`INSERT INTO vinculos (id, pessoa_id, papel, ativo) VALUES ('vq', $1, 'DISCENTE_MESTRADO', TRUE)`, [pessoaId]);
    await gravarPerfilNosVinculos(pessoaId, { perfil_aluno: { qualificacao: '2020-10-29', uid_legado: 158, origem_import: 'profiap' } });
    const { dados } = await vinc('vq');
    expect(dados).toEqual({ uid_legado: '158', origem_import: 'profiap' });
    await gravarPerfilNosVinculos(pessoaId, { perfil_aluno: { qualificacao: '2024-06-10' } });
    expect((await vinc('vq')).dados.qualificacao).toBe('2024-06-10');
  });

  it('orientador_id aceita users.id ou pessoas.id; texto que não resolve fica em orientador_legado; vazio limpa', async () => {
    const { pessoaId } = await aluno('u-o');
    const { usuarioId: orientUser, pessoaId: orientPessoa } = await seedUserComPessoa({ id: 'u-orient', email: 'o@t.br', nome: 'Orientador' });
    const { pessoaId: outraPessoa } = await seedUserComPessoa({ id: 'u-orient2', email: 'o2@t.br', nome: 'Outro' });
    await pool.query(`INSERT INTO vinculos (id, pessoa_id, papel, ativo) VALUES ('vo', $1, 'DISCENTE_MESTRADO', TRUE)`, [pessoaId]);

    await gravarPerfilNosVinculos(pessoaId, { perfil_aluno: { orientador_id: orientUser } });
    expect((await vinc('vo')).dados).toEqual({ orientador_pessoa_id: orientPessoa });

    await gravarPerfilNosVinculos(pessoaId, { perfil_aluno: { orientador_id: outraPessoa } });
    expect((await vinc('vo')).dados).toEqual({ orientador_pessoa_id: outraPessoa });

    await gravarPerfilNosVinculos(pessoaId, { perfil_aluno: { orientador_id: 'uid-drupal-99' } });
    expect((await vinc('vo')).dados).toEqual({ orientador_legado: 'uid-drupal-99' });

    // ida e volta pelo formato da API não perde o orientador
    const volta = montarPerfilAluno({}, [{ papel: 'DISCENTE_MESTRADO', ativo: true, dados: (await vinc('vo')).dados }]);
    await gravarPerfilNosVinculos(pessoaId, { perfil_aluno: volta });
    expect((await vinc('vo')).dados.orientador_legado).toBe('uid-drupal-99');

    await gravarPerfilNosVinculos(pessoaId, { perfil_aluno: { orientador_id: orientUser } });
    await gravarPerfilNosVinculos(pessoaId, { perfil_aluno: { orientador_id: '' } });
    const { dados } = await vinc('vo');
    expect(dados.orientador_pessoa_id).toBeUndefined();
    expect(dados.orientador_legado).toBeUndefined();

    // ausente (undefined) não mexe
    await gravarPerfilNosVinculos(pessoaId, { perfil_aluno: { orientador_id: orientUser } });
    await gravarPerfilNosVinculos(pessoaId, { perfil_aluno: { entrada: '2024.1' } });
    expect((await vinc('vo')).dados.orientador_pessoa_id).toBe(orientPessoa);
  });

  it('aluno com dois vínculos: grava só no principal (o que a API mostra), não no egresso antigo', async () => {
    const { pessoaId } = await aluno('u-2v');
    await pool.query(`INSERT INTO programas (id, nome, sigla) VALUES ('pa','A','PA'), ('pb','B','PB')`);
    await pool.query(`INSERT INTO vinculos (id, pessoa_id, programa_id, papel, ativo, dados) VALUES
      ('v-eg', $1, 'pa', 'EGRESSO', TRUE, '{"nivel":"MESTRADO","entrada":"2018.1"}'),
      ('v-dd', $1, 'pb', 'DISCENTE_DOUTORADO', TRUE, '{}')`, [pessoaId]);
    await gravarPerfilNosVinculos(pessoaId, { perfil_aluno: { nivel: 'Doutorando', entrada: '2023.1', situacao: 'Matriculado' } });
    expect(await vinc('v-eg')).toMatchObject({ papel: 'EGRESSO', dados: { nivel: 'MESTRADO', entrada: '2018.1' } });
    expect(await vinc('v-dd')).toMatchObject({ papel: 'DISCENTE_DOUTORADO', dados: { entrada: '2023.1', situacao: 'Matriculado' } });
  });

  it('programaId restringe aos vínculos daquele programa (importadores)', async () => {
    const { pessoaId } = await aluno('u-pg');
    await pool.query(`INSERT INTO programas (id, nome, sigla) VALUES ('pa','A','PA'), ('pb','B','PB')`);
    await pool.query(`INSERT INTO vinculos (id, pessoa_id, programa_id, papel, ativo) VALUES
      ('v-a', $1, 'pa', 'DISCENTE_MESTRADO', TRUE), ('v-b', $1, 'pb', 'DISCENTE_MESTRADO', TRUE)`, [pessoaId]);
    await gravarPerfilNosVinculos(pessoaId, { perfil_aluno: { entrada: '2022.2', uid_legado: '9', origem_import: 'profiap' } }, { programaId: 'pb' });
    expect((await vinc('v-a')).dados).toBeNull();
    expect((await vinc('v-b')).dados).toEqual({ entrada: '2022.2', uid_legado: '9', origem_import: 'profiap' });
    // sem vínculo de aluno naquele programa: mesma regra do 400
    await pool.query(`INSERT INTO programas (id, nome, sigla) VALUES ('pc','C','PC')`);
    await expect(gravarPerfilNosVinculos(pessoaId, { perfil_aluno: { entrada: '2022.2' } }, { programaId: 'pc' })).rejects.toBeInstanceOf(PerfilSemVinculo);
  });

  it('professor: tipo vira papel; programas cria/encerra vínculos (Gestor de Programa só acrescenta)', async () => {
    const { pessoaId } = await seedUserComPessoa({ id: 'u3', email: 'u3@t.br', nome: 'Doc' });
    await pool.query(`INSERT INTO programas (id, nome, sigla) VALUES ('pa','A','PA'), ('pb','B','PB')`);
    await pool.query(`INSERT INTO vinculos (id, pessoa_id, programa_id, papel, ativo) VALUES ('va', $1, 'pa', 'DOCENTE_PERMANENTE', TRUE)`, [pessoaId]);
    await gravarPerfilNosVinculos(pessoaId, { perfil_professor: { tipo_professor: 'Colaborador', programas: ['pa', 'pb'] } }, { reconciliarProgramas: true });
    const { rows } = await pool.query(`SELECT programa_id, papel, ativo FROM vinculos WHERE pessoa_id = $1 ORDER BY programa_id`, [pessoaId]);
    expect(rows).toEqual([
      { programa_id: 'pa', papel: 'DOCENTE_COLABORADOR', ativo: true },
      { programa_id: 'pb', papel: 'DOCENTE_COLABORADOR', ativo: true }]);
    await gravarPerfilNosVinculos(pessoaId, { perfil_professor: { programas: ['pb'] } }, { reconciliarProgramas: true, podeRemover: false });
    expect((await vinc('va')).ativo).toBe(true);
    await gravarPerfilNosVinculos(pessoaId, { perfil_professor: { programas: ['pb'] } }, { reconciliarProgramas: true });
    const va = await vinc('va');
    expect(va.ativo).toBe(false);
    expect(va.data_fim_mandato).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    // voltar ao programa reativa o vínculo encerrado (não cria outro)
    await gravarPerfilNosVinculos(pessoaId, { perfil_professor: { tipo_professor: 'Visitante', programas: ['pa', 'pb'] } }, { reconciliarProgramas: true });
    expect(await vinc('va')).toMatchObject({ ativo: true, data_fim_mandato: null, papel: 'DOCENTE_VISITANTE' });
    const { rows: [{ n }] } = await pool.query(`SELECT count(*)::int AS n FROM vinculos WHERE pessoa_id = $1`, [pessoaId]);
    expect(n).toBe(2);
  });

  it('professor sem reconciliarProgramas: o array de programas não cria nem encerra vínculo', async () => {
    const { pessoaId } = await seedUserComPessoa({ id: 'u4', email: 'u4@t.br', nome: 'Doc4' });
    await pool.query(`INSERT INTO programas (id, nome, sigla) VALUES ('pa','A','PA'), ('pb','B','PB')`);
    await pool.query(`INSERT INTO vinculos (id, pessoa_id, programa_id, papel, ativo) VALUES ('va4', $1, 'pa', 'DOCENTE_PERMANENTE', TRUE)`, [pessoaId]);
    await gravarPerfilNosVinculos(pessoaId, { perfil_professor: { programas: ['pb'] } });
    const { rows } = await pool.query(`SELECT id, ativo FROM vinculos WHERE pessoa_id = $1`, [pessoaId]);
    expect(rows).toEqual([{ id: 'va4', ativo: true }]);
  });

  it('professor em dois programas com papéis diferentes: reenviar o tipo mostrado não muda nada; histórico encerrado não é reescrito', async () => {
    const { pessoaId } = await seedUserComPessoa({ id: 'u5', email: 'u5@t.br', nome: 'Doc5' });
    await pool.query(`INSERT INTO programas (id, nome, sigla) VALUES ('pa','A','PA'), ('pb','B','PB'), ('pc','C','PC')`);
    await pool.query(`INSERT INTO vinculos (id, pessoa_id, programa_id, papel, ativo, criado_em, dados) VALUES
      ('v5a', $1, 'pa', 'DOCENTE_PERMANENTE', TRUE, now() - interval '2 days', '{"uid_legado":"3","origem_import":"profiap"}'),
      ('v5b', $1, 'pb', 'DOCENTE_COLABORADOR', TRUE, now() - interval '1 day', NULL),
      ('v5c', $1, 'pc', 'DOCENTE_PERMANENTE', FALSE, now() - interval '3 days', NULL)`, [pessoaId]);
    const { rows: vs } = await pool.query(`SELECT programa_id, papel, ativo, dados FROM vinculos WHERE pessoa_id = $1 ORDER BY criado_em, id`, [pessoaId]);
    const mostrado = montarPerfilProfessor({}, vs);
    expect(mostrado).toMatchObject({ tipo_professor: 'Permanente', programas: ['pa', 'pb'], uid_legado: '3' });
    await gravarPerfilNosVinculos(pessoaId, { perfil_professor: mostrado }, { reconciliarProgramas: true });
    expect(await vinc('v5a')).toMatchObject({ papel: 'DOCENTE_PERMANENTE', ativo: true, dados: { uid_legado: '3', origem_import: 'profiap' } });
    expect(await vinc('v5b')).toMatchObject({ papel: 'DOCENTE_COLABORADOR', ativo: true, dados: null });
    expect(await vinc('v5c')).toMatchObject({ papel: 'DOCENTE_PERMANENTE', ativo: false });
    // trocar o tipo no formulário vale para os vínculos ativos, não para o encerrado
    await gravarPerfilNosVinculos(pessoaId, { perfil_professor: { ...mostrado, tipo_professor: 'Visitante' } }, { reconciliarProgramas: true });
    expect((await vinc('v5a')).papel).toBe('DOCENTE_VISITANTE');
    expect((await vinc('v5b')).papel).toBe('DOCENTE_VISITANTE');
    expect((await vinc('v5c')).papel).toBe('DOCENTE_PERMANENTE');
  });
});
