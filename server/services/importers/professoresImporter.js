import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { usersRepo } from '../../db/repositories.js';
import { query } from '../../db/pool.js';
import { PAPEIS_DOCENTE } from '../../controllers/programasController.js';

// Importador de PROFESSORES a partir do export de usuários do site antigo
// (Drupal: array de objetos onde cada campo é uma lista de { value | uri | url }).
// Um professor no sistema novo é um `users` com papel "Professor", perfil_professor
// vinculado ao programa, e um `vinculos` (papel docente) ligando-o ao programa.

const SENHA_PADRAO = 'Mudar123';

// Lê o primeiro item de um campo Drupal (lista) e devolve a chave pedida.
const first = (campo, chave = 'value') => {
  if (!Array.isArray(campo) || campo.length === 0) return '';
  const v = campo[0]?.[chave];
  return typeof v === 'string' ? v.trim() : v ?? '';
};

// "Permanente" → DOCENTE_PERMANENTE; "Colaborador" → DOCENTE_COLABORADOR.
const papelDocente = (tipo) =>
  String(tipo || '').toLowerCase().startsWith('colab') ? 'DOCENTE_COLABORADOR' : 'DOCENTE_PERMANENTE';

// Converte um registro bruto do arquivo no formato normalizado do importador.
// Lança Error com mensagem amigável quando o registro é inválido.
const map = (raw) => {
  const nome = first(raw.name);
  const email = first(raw.mail);
  if (!nome && !email) throw new Error('Registro sem nome e sem e-mail.');
  if (!email) throw new Error(`"${nome}" não possui e-mail — ignorado.`);

  return {
    nome,
    email: email.toLowerCase(),
    tipo: first(raw.field_tipo_professor) || 'Permanente',
    sexo: first(raw.field_sexo),
    foto_url: first(raw.user_picture, 'url'),
    lattes: first(raw.field_lattes, 'uri'),
    orcid: first(raw.field_orcid, 'uri'),
    google_scholar: first(raw.field_google_scholar, 'uri'),
    publons: first(raw.field_publons, 'uri'),
    uid_legado: first(raw.uid) || null,
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
    throw new Error('Arquivo inválido: esperado um array de professores.');
  }
  return data;
};

// Garante o vínculo docente (papel permanente/colaborador) entre o usuário e o programa.
const garantirVinculo = async (programaId, pessoaId, papel) => {
  const existente = (
    await query(
      'SELECT id FROM vinculos WHERE programa_id=$1 AND pessoa_id=$2 AND papel=ANY($3::text[]) AND ativo=TRUE',
      [programaId, pessoaId, PAPEIS_DOCENTE]
    )
  ).rows[0];
  if (existente) return false;
  await query(
    `INSERT INTO vinculos (id, programa_id, pessoa_id, papel, ativo, criado_em)
     VALUES ($1,$2,$3,$4,TRUE,$5)`,
    [crypto.randomUUID(), programaId, pessoaId, papel, new Date().toISOString()]
  );
  return true;
};

// Importa um único registro já mapeado. Em dryRun apenas calcula a ação prevista.
// Retorna { acao, nome, email, mensagem }.
const importOne = async (m, { programaId, actor, dryRun }) => {
  const papel = papelDocente(m.tipo);
  const existente = await usersRepo.findByEmail(m.email);

  if (existente) {
    const jaProfessor = (existente.roles || []).includes('Professor');
    const programas = existente.perfil_professor?.programas || [];
    const jaNoPrograma = programas.includes(programaId);
    if (jaProfessor && jaNoPrograma) {
      return { acao: 'inalterado', nome: m.nome, email: m.email, mensagem: 'Já cadastrado neste programa.' };
    }
    if (dryRun) {
      return { acao: 'atualizado', nome: m.nome, email: m.email, mensagem: 'Será vinculado a este programa.' };
    }
    const merged = {
      ...existente,
      roles: jaProfessor ? existente.roles : [...(existente.roles || []), 'Professor'],
      perfil_professor: {
        ...(existente.perfil_professor || {}),
        programas: jaNoPrograma ? programas : [...programas, programaId],
      },
      atualizado_em: new Date().toISOString(),
    };
    await usersRepo.update(existente.id, merged, actor);
    await garantirVinculo(programaId, existente.id, papel);
    return { acao: 'atualizado', nome: m.nome, email: m.email, mensagem: 'Vinculado a este programa.' };
  }

  if (dryRun) {
    return { acao: 'criado', nome: m.nome, email: m.email, mensagem: 'Novo professor será criado.' };
  }

  const password_hash = await bcrypt.hash(SENHA_PADRAO, await bcrypt.genSalt(10));
  const novo = {
    id: crypto.randomUUID(),
    email: m.email,
    password_hash,
    roles: ['Professor'],
    programaId,
    privacidade: { mostrar_email: false, mostrar_telefone: false },
    perfil_geral: { nome: m.nome, cpf: '', siape: '', foto_url: m.foto_url || '', telefones: [] },
    dados_academicos: {
      lattes: m.lattes || '', orcid: m.orcid || '',
      google_scholar: m.google_scholar || '', publons: m.publons || '', linhas_pesquisa: [],
    },
    perfil_aluno: null,
    perfil_professor: {
      programas: [programaId],
      tipo: m.tipo,
      sexo: m.sexo || '',
      origem_import: 'profiap',
      uid_legado: m.uid_legado,
    },
    criado_em: new Date().toISOString(),
    atualizado_em: new Date().toISOString(),
  };
  const created = await usersRepo.create(novo, actor);
  await garantirVinculo(programaId, created.id, papel);
  return { acao: 'criado', nome: m.nome, email: m.email, mensagem: 'Professor criado.' };
};

export default {
  id: 'professores',
  label: 'Professores',
  descricao: 'Importa professores (docentes) a partir do export de usuários do site antigo.',
  requiresPrograma: true,
  disponivel: true,
  parse,
  map,
  importOne,
};
