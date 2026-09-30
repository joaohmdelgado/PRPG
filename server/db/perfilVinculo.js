// B.13 / G1 (docs/analise-g1-users-credencial.md): o que era users.perfil_aluno /
// perfil_professor. Sexo, nacionalidade e estrangeiro são da pessoa (`pessoas`);
// o resto é do vínculo (`vinculos.dados`, papel). Este módulo é o único que
// converte entre o formato antigo da API e esse modelo.
import crypto from 'crypto';
import { query } from './pool.js';
import { hojeISO } from '../utils/datas.js';

export const PAPEIS_ALUNO = ['DISCENTE_MESTRADO', 'DISCENTE_DOUTORADO', 'DISCENTE_PROFISSIONAL', 'EGRESSO'];
export const PAPEIS_DOCENTE_TODOS = ['DOCENTE_PERMANENTE', 'DOCENTE_COLABORADOR', 'DOCENTE_VISITANTE'];

// Ordem em que os vínculos devem chegar a montarPerfil*: o "principal" é o
// primeiro que se encaixa, então quem lê (usersRepo) e quem grava (abaixo) usam a
// mesma ordem para falar do mesmo vínculo.
export const ORDEM_VINCULOS = 'criado_em, id';

const PAPEL_DE_NIVEL = { MESTRADO: 'DISCENTE_MESTRADO', DOUTORADO: 'DISCENTE_DOUTORADO' };
const NIVEL_DE_PAPEL = { DISCENTE_MESTRADO: 'MESTRADO', DISCENTE_DOUTORADO: 'DOUTORADO' };
const ROTULO_NIVEL = { MESTRADO: { matriculado: 'Mestrando', egresso: 'Mestre' }, DOUTORADO: { matriculado: 'Doutorando', egresso: 'Doutor' } };
const TIPO_DE_PAPEL = { DOCENTE_PERMANENTE: 'Permanente', DOCENTE_COLABORADOR: 'Colaborador', DOCENTE_VISITANTE: 'Visitante' };
const PAPEL_DE_TIPO = Object.fromEntries(Object.entries(TIPO_DE_PAPEL).map(([papel, tipo]) => [tipo, papel]));

// Data de qualificação que a importação do PROFIAP gravou para quase todos (69 de 73 no dev): não é dado.
const QUALIFICACAO_PLACEHOLDER = '2020-10-29';

const texto = (v) => (v == null ? '' : String(v));
const vazio = (v) => v == null || String(v).trim() === '';

// 'Mestrando' | 'Mestre' | 'Doutorando' | 'Doutor' -> 'MESTRADO' | 'DOUTORADO' | null
export const nivelDeRotulo = (rotulo) => {
  const s = texto(rotulo).toLowerCase();
  if (s.startsWith('mestr')) return 'MESTRADO';
  if (s.startsWith('doutor')) return 'DOUTORADO';
  return null;
};

// O payload do formulário traz dado de vínculo "de verdade"? (os defaults do
// formulário — nível Mestrando, situação Matriculado — não contam.)
export const temDadoDeVinculo = (perfil = {}) =>
  !vazio(perfil.entrada) || !vazio(perfil.qualificacao) || !vazio(perfil.defesa)
  || (!vazio(perfil.situacao) && perfil.situacao !== 'Matriculado');

// Vínculo "principal" do aluno: discente ativo; senão o primeiro vínculo de aluno.
export const vinculoPrincipalAluno = (vinculos) => {
  const alunos = vinculos.filter((v) => PAPEIS_ALUNO.includes(v.papel));
  return alunos.find((v) => v.ativo !== false && v.papel !== 'EGRESSO') || alunos[0] || null;
};

// Vínculo docente "principal": o primeiro ativo (é dele o tipo que a API mostra).
const docentesAtivos = (vinculos) => vinculos.filter((v) => PAPEIS_DOCENTE_TODOS.includes(v.papel) && v.ativo !== false);

// `pessoa`: { sexo, nacionalidade, estrangeiro }. `vinculos`: [{ programa_id, papel, ativo, dados }],
// na ordem ORDEM_VINCULOS.
export function montarPerfilAluno(pessoa, vinculos) {
  const v = vinculoPrincipalAluno(vinculos);
  const dados = v?.dados || {};
  let nivel = 'Mestrando';
  if (v?.papel === 'EGRESSO') nivel = ROTULO_NIVEL[dados.nivel]?.egresso || 'Mestre';
  else if (v) nivel = ROTULO_NIVEL[NIVEL_DE_PAPEL[v.papel] || 'MESTRADO'].matriculado;
  return {
    nivel,
    entrada: texto(dados.entrada),
    orientador_id: texto(dados.orientador_pessoa_id || dados.orientador_legado),
    qualificacao: texto(dados.qualificacao),
    defesa: texto(dados.defesa),
    situacao: dados.situacao || 'Matriculado',
    egresso: v?.papel === 'EGRESSO' || dados.egresso === true,
    estrangeiro: !!pessoa?.estrangeiro,
    nacionalidade: texto(pessoa?.nacionalidade),
    sexo: texto(pessoa?.sexo),
    uid_legado: dados.uid_legado ?? null,
    origem_import: dados.origem_import ?? null,
  };
}

export function montarPerfilProfessor(pessoa, vinculos) {
  const docentes = docentesAtivos(vinculos);
  const primeiro = docentes[0];
  const tipo = TIPO_DE_PAPEL[primeiro?.papel] || 'Permanente';
  const dados = primeiro?.dados || {};
  return {
    programas: [...new Set(docentes.map((v) => v.programa_id).filter(Boolean))],
    tipo,
    tipo_professor: tipo,
    estrangeiro: !!pessoa?.estrangeiro,
    nacionalidade: texto(pessoa?.nacionalidade),
    sexo: texto(pessoa?.sexo),
    uid_legado: dados.uid_legado ?? null,
    origem_import: dados.origem_import ?? null,
  };
}

export class PerfilSemVinculo extends Error {
  constructor() {
    super('Este aluno ainda não tem vínculo com um programa: vincule-o a um programa antes de informar entrada, situação, qualificação ou defesa.');
    this.status = 400;
    this.expose = true;
  }
}

// Resolve o orientador informado (pessoas.id, ou users.id -> pessoa) sem criar nada.
async function pessoaDoOrientador(id) {
  if (vazio(id)) return null;
  const { rows } = await query(
    `SELECT id FROM (
       SELECT id, 1 AS ordem FROM pessoas WHERE id = $1
       UNION ALL
       SELECT pessoa_id, 2 FROM users WHERE id = $1 AND pessoa_id IS NOT NULL) t
     ORDER BY ordem LIMIT 1`, [texto(id)]);
  return rows[0]?.id || null;
}

// Copia para `dados` as chaves de texto presentes em `perfil` (vazio apaga a chave;
// ausente não mexe).
function copiarTexto(dados, perfil, chaves) {
  for (const k of chaves) {
    if (perfil[k] === undefined) continue;
    if (vazio(perfil[k])) delete dados[k]; else dados[k] = texto(perfil[k]);
  }
}

// Grava em `vinculos` o que veio em perfil_aluno / perfil_professor. Chamado DEPOIS
// de o vínculo existir (cadastro, edição, importadores). `pessoas` (sexo,
// nacionalidade, estrangeiro) é gravado por pessoaDoUsuario.js, não aqui.
//   programaId: restringe aos vínculos daquele programa (importadores)
//   reconciliarProgramas: o array `perfil_professor.programas` cria/encerra vínculos docentes
//   podeRemover: só com reconciliarProgramas; false = só acrescenta (Gestor de Programa)
export async function gravarPerfilNosVinculos(pessoaId, { perfil_aluno, perfil_professor } = {},
  { programaId = null, reconciliarProgramas = false, podeRemover = true } = {}) {
  if (!pessoaId) return;
  if (perfil_aluno) await gravarAluno(pessoaId, perfil_aluno, programaId);
  if (perfil_professor) await gravarProfessor(pessoaId, perfil_professor, { programaId, reconciliarProgramas, podeRemover });
}

async function vinculosDa(pessoaId, papeis, programaId) {
  const { rows } = await query(
    `SELECT id, papel, ativo, dados, programa_id FROM vinculos
      WHERE pessoa_id = $1 AND papel = ANY($2::text[]) ${programaId ? 'AND programa_id = $3' : ''}
      ORDER BY ${ORDEM_VINCULOS}`,
    programaId ? [pessoaId, papeis, programaId] : [pessoaId, papeis]);
  return rows;
}

// O formulário tem UM perfil de aluno; ele é o do vínculo principal (o mesmo que
// montarPerfilAluno mostra). Gravar em todos os vínculos de aluno copiaria a entrada/
// o nível do doutorado atual para o egresso do mestrado, por exemplo.
async function gravarAluno(pessoaId, perfil, programaId) {
  const v = vinculoPrincipalAluno(await vinculosDa(pessoaId, PAPEIS_ALUNO, programaId));
  if (!v) {
    if (temDadoDeVinculo(perfil)) throw new PerfilSemVinculo();
    return;
  }
  const dados = { ...(v.dados || {}) };
  copiarTexto(dados, perfil, ['entrada', 'situacao', 'qualificacao', 'defesa', 'uid_legado', 'origem_import']);
  if (dados.qualificacao === QUALIFICACAO_PLACEHOLDER) delete dados.qualificacao;
  if (perfil.egresso !== undefined) dados.egresso = !!perfil.egresso;

  // orientador_id: users.id ou pessoas.id -> orientador_pessoa_id; o que não resolve
  // fica como texto (orientador_legado, é o que a API devolve e o formulário reenvia);
  // vazio limpa; ausente não mexe.
  if (perfil.orientador_id !== undefined) {
    delete dados.orientador_pessoa_id;
    delete dados.orientador_legado;
    if (!vazio(perfil.orientador_id)) {
      const orientador = await pessoaDoOrientador(perfil.orientador_id);
      if (orientador) dados.orientador_pessoa_id = orientador;
      else dados.orientador_legado = texto(perfil.orientador_id);
    }
  }

  // Nível: no discente é o papel (Mestrando <-> Doutorando); "Mestre"/"Doutor" NÃO
  // transformam um matriculado em egresso (isso é outra operação). No egresso, o
  // papel não diz o nível: vai para dados.nivel.
  const nivel = nivelDeRotulo(perfil.nivel);
  const rotuloEgresso = /^(mestre|doutor)$/i.test(texto(perfil.nivel).trim());
  let papel = v.papel;
  if (nivel) {
    if (v.papel === 'EGRESSO') dados.nivel = nivel;
    else if (NIVEL_DE_PAPEL[v.papel] && !rotuloEgresso) papel = PAPEL_DE_NIVEL[nivel];
  }
  await query('UPDATE vinculos SET dados = $2::jsonb, papel = $3 WHERE id = $1',
    [v.id, JSON.stringify(dados), papel]);
}

async function gravarProfessor(pessoaId, perfil, { programaId, reconciliarProgramas, podeRemover }) {
  const papelTipo = PAPEL_DE_TIPO[perfil.tipo_professor || perfil.tipo] || null;
  const vinculos = await vinculosDa(pessoaId, PAPEIS_DOCENTE_TODOS, programaId);
  const ativos = docentesAtivos(vinculos);
  const principal = ativos[0] || vinculos[0];

  // uid_legado/origem_import: chave da importação de UM site; só no vínculo principal
  // (o que a API mostra), não espalhada pelos outros programas.
  if (principal && (perfil.uid_legado !== undefined || perfil.origem_import !== undefined)) {
    const dados = { ...(principal.dados || {}) };
    copiarTexto(dados, perfil, ['uid_legado', 'origem_import']);
    await query('UPDATE vinculos SET dados = $2::jsonb WHERE id = $1', [principal.id, JSON.stringify(dados)]);
  }

  // Tipo: o formulário mostra o tipo do primeiro vínculo ativo e o reenvia a cada
  // gravação. Só é mudança quando difere dele; aí vale para os vínculos ATIVOS (os
  // encerrados são histórico). Reenviar o mesmo tipo não achata um docente
  // Permanente num programa e Colaborador noutro.
  if (papelTipo && ativos.length && papelTipo !== ativos[0].papel) {
    await query('UPDATE vinculos SET papel = $2 WHERE id = ANY($1::text[])', [ativos.map((a) => a.id), papelTipo]);
  }
  if (!reconciliarProgramas || !Array.isArray(perfil.programas)) return;

  const pedidos = [...new Set(perfil.programas.filter(Boolean))];
  const todos = await vinculosDa(pessoaId, PAPEIS_DOCENTE_TODOS, null);
  const ativosComPrograma = todos.filter((t) => t.ativo !== false && t.programa_id);
  // Programa novo: o tipo do formulário; sem ele, o do vínculo principal.
  const papelMostrado = papelTipo || ativos[0]?.papel || null;
  for (const pid of pedidos) {
    if (ativosComPrograma.some((a) => a.programa_id === pid)) continue;
    const inativo = todos.find((t) => t.programa_id === pid);
    if (inativo) {
      await query('UPDATE vinculos SET ativo = TRUE, data_fim_mandato = NULL, papel = COALESCE($2, papel) WHERE id = $1',
        [inativo.id, papelMostrado]);
    } else {
      await query(
        `INSERT INTO vinculos (id, programa_id, pessoa_id, papel, ativo, criado_em) VALUES ($1,$2,$3,$4,TRUE,now())`,
        [crypto.randomUUID(), pid, pessoaId, papelMostrado || 'DOCENTE_PERMANENTE']);
    }
  }
  if (podeRemover) {
    for (const a of ativosComPrograma) {
      if (!pedidos.includes(a.programa_id)) {
        await query('UPDATE vinculos SET ativo = FALSE, data_fim_mandato = COALESCE(data_fim_mandato, $2::date) WHERE id = $1', [a.id, hojeISO()]);
      }
    }
  }
}
