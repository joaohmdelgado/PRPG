import { sanitizeHtmlField, isPlainObject } from '../utils/sanitize.js';
import { newsRepo } from '../db/repositories.js';
import { filtrarPorEscopo } from '../utils/escopoPrograma.js';
import { serverError } from '../utils/httpError.js';
import { slugify, slugUnico } from '../utils/slug.js';
import { filtrarVisiveis, visivelPara } from '../utils/publicacao.js';
import { responderLista, filtrarTexto } from '../utils/listagem.js';

// Listagem (Fase F.2/F.3): só o que o usuário pode ver (rascunho/agendado só
// para quem edita), filtros no servidor e paginação opcional.
//   ?q=        busca em título e resumo
//   ?categoria= slug da categoria    ?ano=  ano    ?excluir= id (relacionadas)
//   ?destaque=1  só as marcadas como destaque
//   ?resumo=1  sem o corpo (content) — a listagem não o exibe
export const getNews = async (req, res) => {
  const q = req.query;
  let items = filtrarVisiveis(await filtrarPorEscopo(await newsRepo.getAll(), q), req.user, q);
  if (q.categoria) items = items.filter((n) => n.categorySlug === q.categoria);
  if (q.ano) items = items.filter((n) => String(n.year) === String(q.ano));
  if (q.excluir) items = items.filter((n) => n.id !== q.excluir);
  if (q.destaque === '1') items = items.filter((n) => n.destaque);
  items = filtrarTexto(items, q.q, ['title', 'excerpt']);
  responderLista(res, items, q, { resumir: ({ content, ...resto }) => resto });
};

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
