import { newsRepo } from '../../db/repositories.js';
import { sanitizeHtml } from '../../utils/sanitize.js';

// Importador de NOTÍCIAS a partir do export de nós do site antigo
// (Drupal: array de objetos onde cada campo é uma lista de { value | url | target_id | ... }).
// Mapeia: Título, Data/Ano (created), Imagem (field_image), Conteúdo (body, HTML →
// array de parágrafos), Anexos (field_arquivo → links no fim do conteúdo),
// sempre vinculando a notícia ao programa de destino escolhido no painel.

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

// ISO completo → 'YYYY-MM-DD' (news.date é DATE desde a Fase R.5; a exibição
// por extenso é feita nas telas). Vazio quando ausente.
const formatarData = (iso) => {
  if (typeof iso !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(iso)) return '';
  return iso.slice(0, 10);
};

const anoDe = (iso) =>
  typeof iso === 'string' && iso.length >= 4 ? iso.slice(0, 4) : '';

// Converte o body HTML do Drupal num array de parágrafos. Cada item é renderizado
// pelo frontend dentro de um <p> (SafeHtml as="p"), preservando inline (strong, a…).
// Blocos (headings, listas, blockquote) viram parágrafos; <li> ganham marcador.
const htmlParaParagrafos = (html) => {
  if (!html) return [];
  let s = String(html);
  // Itens de lista viram parágrafos com marcador.
  s = s.replace(/<li[^>]*>/gi, '<p>• ').replace(/<\/li>/gi, '</p>');
  // Demais blocos abrem/fecham como parágrafos.
  s = s.replace(/<\/?(h[1-6]|ul|ol|blockquote|div)[^>]*>/gi, (m) =>
    m.startsWith('</') ? '</p>' : '<p>'
  );
  return s
    .split(/<\/p>/i)
    .map((seg) =>
      seg
        .replace(/<p[^>]*>/gi, '')        // remove a abertura de parágrafo
        .replace(/<br\s*\/?>/gi, ' ')     // <br> vira espaço
        .replace(/&nbsp;/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim()
    )
    .filter((p) => p && p !== '•');
};

// Nome legível a partir da URL de um anexo, ex.:
// ".../Edital-03-2026-versao-final.pdf" → "Edital 03 2026 versao final.pdf".
const nomeDoArquivo = (url) => {
  const base = decodeURIComponent(String(url || '').split('/').filter(Boolean).pop() || '');
  return base.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim() || 'documento';
};

// Texto puro (sem HTML) de um parágrafo, para compor o resumo.
const semHtml = (s) => String(s || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

// Resumo: primeiro parágrafo de texto, truncado em ~220 caracteres.
const montarExcerpt = (paragrafos) => {
  const txt = paragrafos.map(semHtml).find(Boolean) || '';
  if (txt.length <= 220) return txt;
  return `${txt.slice(0, 220).replace(/\s+\S*$/, '')}…`;
};

// Converte um registro bruto do arquivo no formato normalizado do importador.
const map = (raw) => {
  const title = first(raw.title);
  if (!title) throw new Error('Registro sem título — ignorado.');

  const arquivos = Array.isArray(raw.field_arquivo)
    ? raw.field_arquivo.map((a) => a?.url).filter(Boolean)
    : [];

  return {
    uuid: first(raw.uuid),
    title,
    criado: first(raw.created),
    image: first(raw.field_image, 'url') || null,
    imageCaption: first(raw.field_image, 'alt') || null,
    body: first(raw.body) || '',
    arquivos,
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
    throw new Error('Arquivo inválido: esperado um array de notícias.');
  }
  return data;
};

// ID determinístico (uuid do nó é globalmente estável → idempotência),
// com fallback no slug do título quando o uuid estiver ausente.
const montarId = (m) => `noticia-${slugify(m.uuid) || slugify(m.title)}`;

// Monta o array de conteúdo: parágrafos do body + um parágrafo por anexo (link).
const montarConteudo = (m) => {
  const paragrafos = htmlParaParagrafos(m.body).map(sanitizeHtml);
  for (const url of m.arquivos) {
    paragrafos.push(sanitizeHtml(`📎 <a href="${url}">${nomeDoArquivo(url)}</a>`));
  }
  return paragrafos;
};

// Indica se os campos relevantes mudaram (distingue atualizado de inalterado).
const mudou = (existente, dados) =>
  existente.title !== dados.title ||
  (existente.date ?? null) !== (dados.date ?? null) ||
  (existente.year ?? null) !== (dados.year ?? null) ||
  (existente.image ?? null) !== (dados.image ?? null) ||
  (existente.imageCaption ?? null) !== (dados.imageCaption ?? null) ||
  (existente.excerpt ?? null) !== (dados.excerpt ?? null) ||
  JSON.stringify(existente.content ?? []) !== JSON.stringify(dados.content ?? []) ||
  (existente.programaId ?? null) !== (dados.programaId ?? null);

// Importa um único registro já mapeado. Em dryRun apenas calcula a ação prevista.
// Retorna { acao, nome, email, mensagem } — "email" não se aplica e fica vazio.
const importOne = async (m, { programaId, actor, dryRun }) => {
  const id = montarId(m);
  const content = montarConteudo(m);

  const dados = {
    id,
    title: m.title,
    date: formatarData(m.criado) || null,
    year: anoDe(m.criado) || null,
    image: m.image,
    imageCaption: m.imageCaption,
    excerpt: montarExcerpt(content),
    content,
    programaId,
  };

  // Sufixo informativo para a coluna "Detalhe".
  const partes = [dados.year];
  if (m.arquivos.length > 0) partes.push(`${m.arquivos.length} anexo(s)`);
  if (!dados.image) partes.push('sem imagem');
  const info = partes.filter(Boolean).join(', ');
  const suf = info ? ` (${info})` : '';

  const existente = await newsRepo.getById(id);

  if (existente) {
    if (!mudou(existente, dados)) {
      return { acao: 'inalterado', nome: m.title, email: '', mensagem: `Já importada, sem mudanças${suf}.` };
    }
    if (dryRun) {
      return { acao: 'atualizado', nome: m.title, email: '', mensagem: `Será atualizada${suf}.` };
    }
    await newsRepo.update(id, dados, actor);
    return { acao: 'atualizado', nome: m.title, email: '', mensagem: `Notícia atualizada${suf}.` };
  }

  if (dryRun) {
    return { acao: 'criado', nome: m.title, email: '', mensagem: `Nova notícia será criada${suf}.` };
  }
  await newsRepo.create(dados, actor);
  return { acao: 'criado', nome: m.title, email: '', mensagem: `Notícia criada${suf}.` };
};

export default {
  id: 'noticias',
  label: 'Notícias',
  descricao: 'Importa notícias (título, data, imagem, conteúdo e anexos) do site antigo, vinculadas ao programa.',
  requiresPrograma: true,
  disponivel: true,
  parse,
  map,
  importOne,
};
