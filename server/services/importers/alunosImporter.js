import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { usersRepo, taxonomiaRefsRepo } from '../../db/repositories.js';
import { query } from '../../db/pool.js';
import { PAPEIS_DISCENTE } from '../../controllers/programasController.js';

// Importador de ALUNOS (discentes) a partir do export de usuários do site antigo
// (Drupal: array de objetos onde cada campo é uma lista de { value | uri | url | target_id }).
// Um aluno no sistema novo é um `users` com papel "Aluno", perfil_aluno preenchido,
// e um `vinculos` (papel discente/egresso) ligando-o ao programa.

const SENHA_PADRAO = 'Mudar123';

// Lê o primeiro item de um campo Drupal (lista) e devolve a chave pedida.
const first = (campo, chave = 'value') => {
  if (!Array.isArray(campo) || campo.length === 0) return '';
  const v = campo[0]?.[chave];
  return typeof v === 'string' ? v.trim() : v ?? '';
};

// ISO/data → 'YYYY-MM-DD' (padrão de data do projeto). Vazio quando ausente.
const soData = (v) => (typeof v === 'string' && v.length >= 10 ? v.slice(0, 10) : '');

// Nível canônico de perfil_aluno conforme o nível do export e o egresso.
// Mestrado → Mestrando/Mestre; Doutorado → Doutorando/Doutor.
const nivelCanonico = (nivelRaw, egresso) => {
  const dout = String(nivelRaw || '').toLowerCase().startsWith('dout');
  if (dout) return egresso ? 'Doutor' : 'Doutorando';
  return egresso ? 'Mestre' : 'Mestrando';
};

// Papel do vínculo discente conforme nível do export.
const papelDiscente = (nivelRaw) =>
  String(nivelRaw || '').toLowerCase().startsWith('dout') ? 'DISCENTE_DOUTORADO' : 'DISCENTE_MESTRADO';

// Converte um registro bruto do arquivo no formato normalizado do importador.
const map = (raw) => {
  const nome = first(raw.name);
  const email = first(raw.mail);
  if (!nome && !email) throw new Error('Registro sem nome e sem e-mail.');
  if (!email) throw new Error(`"${nome}" não possui e-mail — ignorado.`);

  const linhas_target_ids = Array.isArray(raw.field_linhas_pesquisa)
    ? raw.field_linhas_pesquisa.map((x) => String(x?.target_id ?? '').trim()).filter(Boolean)
    : [];

  return {
    nome,
    email: email.toLowerCase(),
    nivel_raw: first(raw.field_nivel) || 'Mestrado',
    sexo: first(raw.field_sexo),
    foto_url: first(raw.user_picture, 'url'),
    lattes: first(raw.field_lattes, 'uri'),
    orcid: first(raw.field_orcid, 'uri'),
    google_scholar: first(raw.field_google_scholar, 'uri'),
    publons: first(raw.field_publons, 'uri'),
    uid_legado: first(raw.uid) || null,
    egresso: !!first(raw.field_egresso),
    qualificacao: soData(first(raw.field_qualificacao)),
    defesa: soData(first(raw.field_defesa)),
    situacao_target_id: first(raw.field_situacao_aluno, 'target_id'),
    entrada_target_id: first(raw.field_entrada, 'target_id'),
    orientador_uid: first(raw.field_orientador, 'target_id'),
    linhas_target_ids,
  };
};

// Faz o parse do conteúdo do arquivo (Buffer/string) num array de registros brutos.
const parse = (buffer) => {
  let data;
  try {
    data = JSON.parse(buffer.toString('utf-8'));
  } catch {
    throw new Error('Arquivo inválido: não é um JSON válido.');
  }
  if (!Array.isArray(data)) {
    throw new Error('Arquivo inválido: esperado um array de alunos.');
  }
  return data;
};

// Resolve target_ids legados de linhas para IDs da tabela linhas_pesquisa,
// restringindo às linhas do próprio programa (igual ao importador de professores).
const resolverLinhasIds = async (programaId, target_ids) => {
  if (!target_ids || target_ids.length === 0) return [];
  const { rows } = await query(
    `SELECT id FROM linhas_pesquisa
     WHERE target_id = ANY($1::text[]) AND programa_id = $2`,
    [target_ids.map(String), programaId]
  );
  return rows.map((r) => r.id);
};

const vincularLinhas = async (userId, linhaIds) => {
  for (const id of linhaIds) {
    await query(
      'INSERT INTO user_linhas_pesquisa (user_id, linha_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [userId, id]
    );
  }
};

// Resolve o orientador: professor importado cujo perfil_professor.uid_legado
// corresponde ao target_id do field_orientador. Retorna users.id ou null.
const resolverOrientadorId = async (orientadorUid) => {
  if (!orientadorUid) return null;
  const { rows } = await query(
    `SELECT id FROM users WHERE perfil_professor->>'uid_legado' = $1 LIMIT 1`,
    [String(orientadorUid)]
  );
  return rows[0]?.id ?? null;
};

// Papel e estado do vínculo conforme a situação resolvida.
//   Egresso     → papel EGRESSO, ativo
//   Desistente  → papel discente pelo nível, INATIVO (não aparece como discente)
//   Matriculado → papel discente pelo nível, ativo
const vinculoParaSituacao = (situacao, nivelRaw, egressoFlag) => {
  if (situacao === 'Egresso' || egressoFlag) return { papel: 'EGRESSO', ativo: true };
  if (situacao === 'Desistente') return { papel: papelDiscente(nivelRaw), ativo: false };
  return { papel: papelDiscente(nivelRaw), ativo: true };
};

// Garante o vínculo discente entre o usuário e o programa, no papel/estado dados.
// Reativa/ajusta um vínculo discente existente em vez de duplicar.
const garantirVinculo = async (programaId, pessoaId, papel, ativo) => {
  const existente = (
    await query(
      'SELECT id FROM vinculos WHERE programa_id=$1 AND pessoa_id=$2 AND papel=ANY($3::text[]) ORDER BY ativo DESC LIMIT 1',
      [programaId, pessoaId, PAPEIS_DISCENTE]
    )
  ).rows[0];
  if (existente) {
    await query('UPDATE vinculos SET ativo=$2, papel=$3 WHERE id=$1', [existente.id, ativo, papel]);
    return;
  }
  await query(
    `INSERT INTO vinculos (id, programa_id, pessoa_id, papel, ativo, criado_em)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [crypto.randomUUID(), programaId, pessoaId, papel, ativo, new Date().toISOString()]
  );
};

// Monta o objeto perfil_aluno a partir do registro mapeado + valores resolvidos.
const montarPerfilAluno = (m, { situacao, entrada, orientadorId }) => ({
  nivel: nivelCanonico(m.nivel_raw, m.egresso),
  entrada: entrada || '',
  orientador_id: orientadorId || '',
  qualificacao: m.qualificacao || '',
  defesa: m.defesa || '',
  situacao: situacao || 'Matriculado',
  egresso: m.egresso,
  estrangeiro: false,
  nacionalidade: '',
  sexo: m.sexo || '',
  uid_legado: m.uid_legado,
  origem_import: 'profiap',
});

// Importa um único registro já mapeado. As resoluções (situação, entrada,
// orientador, linhas) rodam também em dryRun para que a pré-visualização mostre
// o resultado real; apenas as gravações ficam fora do dryRun.
const importOne = async (m, { programaId, actor, dryRun }) => {
  const existente = await usersRepo.findByEmail(m.email);

  const situacao = (await taxonomiaRefsRepo.resolve('situacao_aluno', m.situacao_target_id, programaId)) || 'Matriculado';
  const entrada = await taxonomiaRefsRepo.resolve('entrada', m.entrada_target_id, programaId);
  const orientadorId = await resolverOrientadorId(m.orientador_uid);
  const linhaIds = await resolverLinhasIds(programaId, m.linhas_target_ids);
  const perfilAluno = montarPerfilAluno(m, { situacao, entrada, orientadorId });
  const { papel, ativo } = vinculoParaSituacao(situacao, m.nivel_raw, m.egresso);

  const detalhes = [];
  if (entrada) detalhes.push(`entrada ${entrada}`);
  else if (m.entrada_target_id) detalhes.push('entrada não mapeada');
  detalhes.push(situacao.toLowerCase());
  if (orientadorId) detalhes.push('orientador vinculado');
  else if (m.orientador_uid) detalhes.push('orientador não encontrado');
  if (linhaIds.length > 0) detalhes.push(`${linhaIds.length} linha(s)`);
  const det = detalhes.join(', ');

  if (dryRun) {
    if (existente) {
      const jaAluno = (existente.roles || []).includes('Aluno');
      return {
        acao: 'atualizado', nome: m.nome, email: m.email,
        mensagem: `${jaAluno ? 'Aluno existente' : 'Vira aluno'} — ${det}.`,
      };
    }
    return { acao: 'criado', nome: m.nome, email: m.email, mensagem: `Novo aluno — ${det}.` };
  }

  if (existente) {
    const jaAluno = (existente.roles || []).includes('Aluno');
    const merged = {
      ...existente,
      roles: jaAluno ? existente.roles : [...(existente.roles || []), 'Aluno'],
      // Preserva perfil_aluno anterior, sobrescrevendo com os dados importados.
      perfil_aluno: { ...(existente.perfil_aluno || {}), ...perfilAluno },
      atualizado_em: new Date().toISOString(),
    };
    await usersRepo.update(existente.id, merged, actor);
    if (linhaIds.length > 0) await vincularLinhas(existente.id, linhaIds);
    await garantirVinculo(programaId, existente.id, papel, ativo);
    return { acao: 'atualizado', nome: m.nome, email: m.email, mensagem: `Atualizado (${detalhes.join(', ')}).` };
  }

  const password_hash = await bcrypt.hash(SENHA_PADRAO, await bcrypt.genSalt(10));
  const novo = {
    id: crypto.randomUUID(),
    email: m.email,
    password_hash,
    roles: ['Aluno'],
    programaId,
    privacidade: { mostrar_email: false, mostrar_telefone: false },
    perfil_geral: { nome: m.nome, cpf: '', siape: '', foto_url: m.foto_url || '', telefones: [] },
    dados_academicos: {
      lattes: m.lattes || '', orcid: m.orcid || '',
      google_scholar: m.google_scholar || '', publons: m.publons || '',
    },
    perfil_aluno: perfilAluno,
    perfil_professor: null,
    criado_em: new Date().toISOString(),
    atualizado_em: new Date().toISOString(),
  };
  const created = await usersRepo.create(novo, actor);
  if (linhaIds.length > 0) await vincularLinhas(created.id, linhaIds);
  await garantirVinculo(programaId, created.id, papel, ativo);
  return { acao: 'criado', nome: m.nome, email: m.email, mensagem: `Aluno criado (${detalhes.join(', ')}).` };
};

export default {
  id: 'alunos',
  label: 'Alunos',
  descricao: 'Importa discentes (alunos) a partir do export de usuários do site antigo. Importe os professores antes, para os orientadores serem vinculados.',
  requiresPrograma: true,
  disponivel: true,
  parse,
  map,
  importOne,
};
