import { sanitizeHtmlField, isPlainObject } from '../utils/sanitize.js';
import { newsRepo } from '../db/repositories.js';
import { escopoSql } from '../utils/escopoPrograma.js';
import { query } from '../db/pool.js';
import { serverError } from '../utils/httpError.js';
import { slugify, slugUnico } from '../utils/slug.js';
import { visivelPara, sqlVisivelPara, STATUS_PUBLICACAO } from '../utils/publicacao.js';
import { paginaDe, pediuPagina } from '../utils/listagem.js';

// Listagem (Fases F.2/F.3, P.2): filtro, ordem e página são feitos no banco —
// só a página pedida sai de lá — e o que o usuário pode ver (rascunho/agendado
// só para quem edita) entra na mesma consulta.
//   ?q=        busca em título e resumo (sem acento, sem caixa)
//   ?categoria= slug da categoria    ?ano=  ano    ?excluir= id (relacionadas)
//   ?destaque=1  só as marcadas como destaque    ?status=  RASCUNHO|PUBLICADO|ARQUIVADO
//   ?resumo=1  listagem enxuta: sem corpo, citação, tags nem legenda
// Colunas que a listagem do painel pode ordenar (?ordenar=&dir=) e a expressão
// SQL de cada uma (texto sem acento/caixa; vazio vai sempre para o fim).
const ORDENAVEIS_SQL = {
  title: "NULLIF(lower(busca_limpar(title)), '')",
  category: "NULLIF(lower(busca_limpar(category)), '')",
  date: 'date',
  status: 'status',
};
const ORDEM_PADRAO = 'date DESC NULLS LAST, id ASC';
const COLUNAS_RESUMO = 'id, title, category, category_slug, date, year, image, excerpt, author, programa_id, '
  + 'destaque, imagem_alt, status, publicado_em, criado_em, atualizado_em, criado_por, atualizado_por';
const resumirNoticia = ({ content, tags, quote, imageCaption, authorRole, ...resto }) => resto;
const contem = (coluna, n) => `strpos(lower(busca_limpar(${coluna})), lower(busca_limpar($${n}))) > 0`;

export const getNews = async (req, res) => {
  const q = req.query;
  const params = [];
  const base = [sqlVisivelPara(req.user, params), await escopoSql(q, params)];
  if (q.status && STATUS_PUBLICACAO.includes(q.status)) { params.push(q.status); base.push(`status = $${params.length}`); }

  const filtros = [...base];
  if (q.categoria) { params.push(String(q.categoria)); filtros.push(`category_slug = $${params.length}`); }
  if (q.ano) { params.push(String(q.ano)); filtros.push(`year = $${params.length}`); }
  if (q.excluir) { params.push(String(q.excluir)); filtros.push(`id <> $${params.length}`); }
  if (q.destaque === '1') filtros.push('destaque IS TRUE');
  if (q.q && String(q.q).trim()) {
    params.push(String(q.q).trim());
    filtros.push(`(${contem('title', params.length)} OR ${contem('excerpt', params.length)})`);
  }
  const where = filtros.join(' AND ');

  const campo = Object.hasOwn(ORDENAVEIS_SQL, q.ordenar) ? ORDENAVEIS_SQL[q.ordenar] : null;
  const ordem = campo ? `${campo} ${q.dir === 'desc' ? 'DESC' : 'ASC'} NULLS LAST, ${ORDEM_PADRAO}` : ORDEM_PADRAO;
  const resumo = q.resumo === '1';
  const colunas = resumo ? COLUNAS_RESUMO : '*';
  const paginado = pediuPagina(q);

  const total = paginado ? await newsRepo.contar({ where, params }) : null;
  const pagina = paginado ? paginaDe(q, total) : null;
  const itens = await newsRepo.listar({ colunas, where, params, ordem, ...(paginado ? { limit: pagina.limit, offset: pagina.offset } : {}) });
  const out = resumo ? itens.map(resumirNoticia) : itens;
  if (!paginado) return res.json(out);

  // Anos com notícia (antes de filtrar por ano/busca), para o seletor da página.
  res.json({ items: out, total, page: pagina.page, limit: pagina.limit, pages: pagina.pages, anos: await anosDisponiveis(req, q) });
};

// Anos do seletor: respeitam visibilidade, escopo e situação, mas não os
// demais filtros (categoria, ano, busca) — como o seletor sempre funcionou.
async function anosDisponiveis(req, q) {
  const params = [];
  const cond = [sqlVisivelPara(req.user, params), await escopoSql(q, params), "year IS NOT NULL AND year <> ''"];
  if (q.status && STATUS_PUBLICACAO.includes(q.status)) { params.push(q.status); cond.push(`status = $${params.length}`); }
  const { rows } = await query(`SELECT DISTINCT year FROM news WHERE ${cond.join(' AND ')} ORDER BY year DESC`, params);
  return rows.map((r) => r.year);
}

export const getNewsById = async (req, res) => {
  const article = await newsRepo.getById(req.params.id);
  if (article && visivelPara(req.user, article)) res.json(article);
  else res.status(404).json({ message: 'Notícia não encontrada' });
};

export const createNews = async (req, res) => {
  if (!isPlainObject(req.body)) {
    return res.status(400).json({ message: 'Dados inválidos.' });
  }
  const data = { ...req.body };
  if (!data.title || !String(data.title).trim()) {
    return res.status(400).json({ message: 'O título é obrigatório.' });
  }
  if (data.content) data.content = sanitizeHtmlField(data.content);
  if (!data.id) {
    // Título repetido ganha sufixo (-2, -3...) em vez de colidir na PK.
    data.id = await slugUnico(slugify(data.title) || 'noticia', async (s) => !!(await newsRepo.getById(s)));
  }
  try {
    res.status(201).json(await newsRepo.create(data, req.user?.id));
  } catch (e) {
    serverError(res, 'Erro ao criar notícia.', e);
  }
};

export const updateNews = async (req, res) => {
  if (!isPlainObject(req.body)) {
    return res.status(400).json({ message: 'Dados inválidos.' });
  }
  const data = { ...req.body };
  if (data.content) data.content = sanitizeHtmlField(data.content);
  const updated = await newsRepo.update(req.params.id, data, req.user?.id);
  if (updated) res.json(updated);
  else res.status(404).json({ message: 'Notícia não encontrada' });
};

export const deleteNews = async (req, res) => {
  const ok = await newsRepo.remove(req.params.id);
  if (ok) res.json({ message: 'Notícia removida com sucesso' });
  else res.status(404).json({ message: 'Notícia não encontrada' });
};
