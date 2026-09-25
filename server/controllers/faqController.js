import { sanitizeHtml, isPlainObject } from '../utils/sanitize.js';
import { faqRepo } from '../db/repositories.js';
import { filtrarPorEscopo } from '../utils/escopoPrograma.js';
import { serverError } from '../utils/httpError.js';

export const getFaqs = async (req, res) => {
  const all = await faqRepo.getAll();
  res.json(await filtrarPorEscopo(all, req.query));
};

export const getFaqById = async (req, res) => {
  const f = await faqRepo.getById(req.params.id);
  if (f) res.json(f);
  else res.status(404).json({ message: 'FAQ não encontrado' });
};

export const createFaq = async (req, res) => {
  if (!isPlainObject(req.body)) return res.status(400).json({ message: 'Dados inválidos.' });
  const data = { ...req.body };
  if (!data.title || !String(data.title).trim()) return res.status(400).json({ message: 'A pergunta é obrigatória.' });
  if (data.resposta) data.resposta = sanitizeHtml(data.resposta);
  if (!data.id) data.id = 'faq-' + Date.now().toString();
  try {
    res.status(201).json(await faqRepo.create(data, req.user?.id));
  } catch (e) {
    serverError(res, 'Erro ao criar FAQ.', e);
  }
};

export const updateFaq = async (req, res) => {
  if (!isPlainObject(req.body)) return res.status(400).json({ message: 'Dados inválidos.' });
  const data = { ...req.body };
  if (data.resposta) data.resposta = sanitizeHtml(data.resposta);
  const updated = await faqRepo.update(req.params.id, data, req.user?.id);
  if (updated) res.json(updated);
  else res.status(404).json({ message: 'FAQ não encontrado' });
};

export const deleteFaq = async (req, res) => {
  const ok = await faqRepo.remove(req.params.id);
  if (ok) res.json({ message: 'FAQ removido com sucesso' });
  else res.status(404).json({ message: 'FAQ não encontrado' });
};
