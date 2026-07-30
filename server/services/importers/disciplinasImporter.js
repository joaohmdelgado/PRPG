import { disciplinasRepo } from '../../db/repositories.js';
import { query } from '../../db/pool.js';
import { sanitizeHtml } from '../../utils/sanitize.js';

// Importador de DISCIPLINAS a partir do export de nós do site antigo
// (Drupal: array de objetos onde cada campo é uma lista de { value | url | ... }).
// Armazena: Título, Carga Horária, Ementa (URL do PDF) e Tipo de disciplina,
// sempre vinculando ao programa de destino escolhido no painel.

// Lê o primeiro item de um campo Drupal (lista) e devolve a chave pedida.
const first = (campo, chave = 'value') => {
  if (!Array.isArray(campo) || campo.length === 0) return '';
  const v = campo[0]?.[chave];
  if (v == null) return '';
  return typeof v === 'string' ? v.trim() : v;
};

// Transforma texto em slug seguro para compor IDs (a-z, 0-9 e hífen).
const slugify = (s) =>
  String(s || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

// Extrai o código da disciplina (texto antes de " - " no título), ex.: "ADMP0001".
const extrairCodigo = (titulo) => {
  const m = String(titulo || '').split(' - ')[0];
  return m && m !== titulo ? m.trim() : '';
};

// Converte um registro bruto do arquivo no formato normalizado do importador.
const map = (raw) => {
  const title = first(raw.title);
  if (!title) throw new Error('Registro sem título — ignorado.');

  const carga = first(raw.field_carga_horaria);
  const ementaUrl = first(raw.field_ementa, 'url');
  const tipo = first(raw.field_tipo_disciplina);
  const codigo = extrairCodigo(title);

  return {
    codigo,
    title,
    cargaHoraria: carga === '' ? null : String(carga),
    ementaUrl: ementaUrl ? String(ementaUrl) : null,
    tipoDisciplina: tipo ? String(tipo) : null,
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
    throw new Error('Arquivo inválido: esperado um array de disciplinas.');
  }
  return data;
};

// Carrega a sigla/slug do programa para compor IDs estáveis e escopados ao programa,
// evitando colisões entre programas que reusem o mesmo código de disciplina.
const prefixoPrograma = async (programaId) => {
  const { rows } = await query('SELECT sigla, slug FROM programas WHERE id = $1', [programaId]);
  const p = rows[0] || {};
  return slugify(p.sigla || p.slug || programaId) || 'prog';
};

// Monta o ID determinístico da disciplina dentro de um programa.
const montarId = (prefixo, m) => {
  const base = slugify(m.codigo) || slugify(m.title);
  return `disc-${prefixo}-${base}`;
};

// Indica se os campos relevantes mudaram (para distinguir atualizado de inalterado).
const mudou = (existente, m, programaId) =>
  existente.title !== m.title ||
  (existente.cargaHoraria ?? null) !== m.cargaHoraria ||
  (existente.ementaUrl ?? null) !== (m.ementaUrl ? sanitizeHtml(m.ementaUrl) : null) ||
  (existente.tipoDisciplina ?? null) !== m.tipoDisciplina ||
  (existente.programaId ?? null) !== programaId;

// Importa um único registro já mapeado. Em dryRun apenas calcula a ação prevista.
// Retorna { acao, nome, email, mensagem } — "email" não se aplica e fica vazio.
const importOne = async (m, { programaId, actor, dryRun }) => {
  const prefixo = await prefixoPrograma(programaId);
  const id = montarId(prefixo, m);
  // Sufixo informativo para a coluna "Detalhe" (tipo + carga horária).
  const info = [m.tipoDisciplina, m.cargaHoraria ? `${m.cargaHoraria}h` : null]
    .filter(Boolean).join(', ');
  const suf = info ? ` (${info})` : '';

  const existente = await disciplinasRepo.getById(id);

  const dados = {
    id,
    title: m.title,
    cargaHoraria: m.cargaHoraria,
    ementaUrl: m.ementaUrl ? sanitizeHtml(m.ementaUrl) : null,
    tipoDisciplina: m.tipoDisciplina,
    programaId,
  };

  if (existente) {
    if (!mudou(existente, m, programaId)) {
      return { acao: 'inalterado', nome: m.title, email: '', mensagem: `Já importada, sem mudanças${suf}.` };
    }
    if (dryRun) {
      return { acao: 'atualizado', nome: m.title, email: '', mensagem: `Será atualizada${suf}.` };
    }
    await disciplinasRepo.update(id, dados, actor);
    return { acao: 'atualizado', nome: m.title, email: '', mensagem: `Disciplina atualizada${suf}.` };
  }

  if (dryRun) {
    return { acao: 'criado', nome: m.title, email: '', mensagem: `Nova disciplina será criada${suf}.` };
  }
  await disciplinasRepo.create(dados, actor);
  return { acao: 'criado', nome: m.title, email: '', mensagem: `Disciplina criada${suf}.` };
};

export default {
  id: 'disciplinas',
  label: 'Disciplinas',
  descricao: 'Importa disciplinas (título, carga horária, ementa e tipo) do site antigo, vinculadas ao programa.',
  requiresPrograma: true,
  disponivel: true,
  parse,
  map,
  importOne,
};
