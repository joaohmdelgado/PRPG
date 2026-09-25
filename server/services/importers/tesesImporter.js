import { tesesRepo } from '../../db/repositories.js';
import { query } from '../../db/pool.js';
import { resolverOuCriarPessoa } from '../../db/pessoasRepo.js';
import { slugify } from '../../utils/slug.js';

// Importador de TESES e DISSERTAÇÕES a partir do export de nós do site antigo
// (Drupal: array de objetos onde cada campo é uma lista de { value | url | target_id | ... }).
// Armazena: Título, Data/Ano, Tipo (Tese/Dissertação), Arquivo (URL do PDF) e Autor,
// sempre vinculando ao programa de destino escolhido no painel.
//
// Fase D (Legado Drupal): o Autor não guarda mais um users.id (nem, pior,
// às vezes um nome solto) — autor_pessoa_id é sempre um pessoas.id de verdade.
// Quando o aluno já foi importado (perfil_aluno.uid_legado), resolvemos o
// usuário e daí a pessoa (users.pessoa_id); senão criamos uma pessoa mínima
// com o nome derivado do slug do export (resolverOuCriarPessoa).

// Lê o primeiro item de um campo Drupal (lista) e devolve a chave pedida.
const first = (campo, chave = 'value') => {
  if (!Array.isArray(campo) || campo.length === 0) return '';
  const v = campo[0]?.[chave];
  if (v == null) return '';
  return typeof v === 'string' ? v.trim() : v;
};

// Transforma texto em slug seguro para compor IDs (a-z, 0-9 e hífen).
// Remove o prefixo redundante de tipo do título (o tipo é guardado em separado),
// ex.: "Dissertação - Foo" → "Foo"; "Tese – Bar" → "Bar"; "Dissertacao- Baz" → "Baz".
const limparTitulo = (titulo) =>
  String(titulo || '')
    .replace(/^\s*(disserta[çc][ãa]o|tese)\s*[-–—]\s*/i, '')
    .trim();

// ISO/data → 'YYYY-MM-DD' (padrão de data do projeto). Vazio quando ausente.
const soData = (v) => (typeof v === 'string' && v.length >= 10 ? v.slice(0, 10) : '');

// Normaliza o tipo para o vocabulário do formulário ("Tese" | "Dissertação").
const normalizarTipo = (v) => {
  const s = String(v || '').toLowerCase();
  if (s.startsWith('tese')) return 'Tese';
  if (s.startsWith('disserta')) return 'Dissertação';
  return String(v || '').trim();
};

// Deriva um nome legível a partir do slug da URL do autor,
// ex.: "/pt-br/authenticated/wagner-jose-feitosa-da-costa" → "Wagner Jose Feitosa Da Costa".
const nomeDoSlug = (url) => {
  const seg = String(url || '').split('/').filter(Boolean).pop() || '';
  return seg
    .split('-')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
    .trim();
};

// Converte um registro bruto do arquivo no formato normalizado do importador.
const map = (raw) => {
  const titulo = limparTitulo(first(raw.title));
  if (!titulo) throw new Error('Registro sem título — ignorado.');

  return {
    uuid: first(raw.uuid),
    title: titulo,
    ano: soData(first(raw.field_ano)) || null,
    arquivoUrl: first(raw.field_arquivo, 'url') || null,
    tipo: normalizarTipo(first(raw.field_tipo_td)) || null,
    autor_uid: first(raw.field_autor, 'target_id') || null,
    autor_nome: nomeDoSlug(first(raw.field_autor, 'url')),
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
    throw new Error('Arquivo inválido: esperado um array de teses/dissertações.');
  }
  return data;
};

// Monta o ID determinístico (o uuid do nó é globalmente estável → idempotência),
// com fallback no slug do título quando o uuid estiver ausente.
const montarId = (m) => `tese-${slugify(m.uuid) || slugify(m.title)}`;

// Resolve o autor para um usuário existente cujo perfil_aluno/perfil_professor tenha
// uid_legado igual ao target_id do export. Retorna users.id ou null.
const resolverAutorUserId = async (autorUid) => {
  if (!autorUid) return null;
  const { rows } = await query(
    `SELECT id FROM users
     WHERE perfil_aluno->>'uid_legado' = $1
        OR perfil_professor->>'uid_legado' = $1
     LIMIT 1`,
    [String(autorUid)]
  );
  return rows[0]?.id ?? null;
};

// Indica se os campos relevantes mudaram (para distinguir atualizado de inalterado).
const mudou = (existente, dados) =>
  existente.title !== dados.title ||
  (existente.ano ?? null) !== dados.ano ||
  (existente.arquivoUrl ?? null) !== dados.arquivoUrl ||
  (existente.tipo ?? null) !== dados.tipo ||
  (existente.autorPessoaId ?? null) !== dados.autorPessoaId ||
  (existente.programaId ?? null) !== dados.programaId;

// Importa um único registro já mapeado. Em dryRun apenas calcula a ação prevista.
// Retorna { acao, nome, email, mensagem } — "email" não se aplica e fica vazio.
const importOne = async (m, { programaId, actor, dryRun }) => {
  const id = montarId(m);
  const autorUserId = await resolverAutorUserId(m.autor_uid);
  // Aluno já cadastrado: resolve a pessoa por trás do usuário. Senão, cria uma
  // pessoa mínima com o nome derivado do export (nunca guarda nome solto).
  // Em dryRun não cria nada — só verifica se já existiria uma pessoa (preview).
  let autorPessoaId = null;
  if (!dryRun) {
    autorPessoaId = autorUserId
      ? await resolverOuCriarPessoa({ pessoaId: autorUserId })
      : await resolverOuCriarPessoa({ nome: m.autor_nome });
  } else if (autorUserId) {
    const { rows } = await query('SELECT pessoa_id FROM users WHERE id = $1', [autorUserId]);
    autorPessoaId = rows[0]?.pessoa_id || null;
  }

  const dados = {
    id,
    title: m.title,
    ano: m.ano,
    arquivoUrl: m.arquivoUrl,
    tipo: m.tipo,
    autorPessoaId,
    programaId,
  };

  // Sufixo informativo para a coluna "Detalhe".
  const partes = [m.tipo, m.ano ? m.ano.slice(0, 4) : null];
  partes.push(autorUserId ? 'autor vinculado a usuário' : (m.autor_nome ? 'autor cadastrado sem login' : null));
  const info = partes.filter(Boolean).join(', ');
  const suf = info ? ` (${info})` : '';
  const nome = m.autor_nome || m.title;

  const existente = await tesesRepo.getById(id);

  if (existente) {
    if (!mudou(existente, dados)) {
      return { acao: 'inalterado', nome, email: '', mensagem: `Já importada, sem mudanças${suf}.` };
    }
    if (dryRun) {
      return { acao: 'atualizado', nome, email: '', mensagem: `Será atualizada${suf}.` };
    }
    await tesesRepo.update(id, dados, actor);
    return { acao: 'atualizado', nome, email: '', mensagem: `Tese/dissertação atualizada${suf}.` };
  }

  if (dryRun) {
    return { acao: 'criado', nome, email: '', mensagem: `Nova tese/dissertação será criada${suf}.` };
  }
  await tesesRepo.create(dados, actor);
  return { acao: 'criado', nome, email: '', mensagem: `Tese/dissertação criada${suf}.` };
};

export default {
  id: 'teses',
  label: 'Teses e Dissertações',
  descricao: 'Importa teses/dissertações (título, ano, tipo, PDF e autor) do site antigo, vinculadas ao programa. Importe os alunos antes para vincular os autores.',
  requiresPrograma: true,
  disponivel: true,
  parse,
  map,
  importOne,
};
