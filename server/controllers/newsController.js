import { sanitizeHtmlField, isPlainObject } from '../utils/sanitize.js';
import { newsRepo } from '../db/repositories.js';
import { filtrarPorEscopo } from '../utils/escopoPrograma.js';
import { serverError } from '../utils/httpError.js';
import { slugify, slugUnico } from '../utils/slug.js';

export const getNews = async (req, res) => {
  const all = await newsRepo.getAll();
  res.json(await filtrarPorEscopo(all, req.query));
};

export const getNewsById = async (req, res) => {
  const article = await newsRepo.getById(req.params.id);
  if (article) res.json(article);
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
