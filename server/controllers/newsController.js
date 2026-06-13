import { sanitizeHtmlField, isPlainObject } from '../utils/sanitize.js';
import { newsRepo } from '../db/repositories.js';

export const getNews = async (req, res) => {
  res.json(await newsRepo.getAll());
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
    data.id = String(data.title).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
  }
  try {
    res.status(201).json(await newsRepo.create(data));
  } catch (e) {
    res.status(500).json({ message: 'Erro ao criar notícia.', error: e.message });
  }
};

export const updateNews = async (req, res) => {
  if (!isPlainObject(req.body)) {
    return res.status(400).json({ message: 'Dados inválidos.' });
  }
  const data = { ...req.body };
  if (data.content) data.content = sanitizeHtmlField(data.content);
  const updated = await newsRepo.update(req.params.id, data);
  if (updated) res.json(updated);
  else res.status(404).json({ message: 'Notícia não encontrada' });
};

export const deleteNews = async (req, res) => {
  const ok = await newsRepo.remove(req.params.id);
  if (ok) res.json({ message: 'Notícia removida com sucesso' });
  else res.status(404).json({ message: 'Notícia não encontrada' });
};
