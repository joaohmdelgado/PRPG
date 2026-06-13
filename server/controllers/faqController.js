import { sanitizeHtml, isPlainObject } from '../utils/sanitize.js';
import { faqRepo } from '../db/repositories.js';

export const getFaqs = async (req, res) => {
  res.json(await faqRepo.getAll());
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
  if (data.field_resposta) data.field_resposta = sanitizeHtml(data.field_resposta);
  if (!data.id) data.id = 'faq-' + Date.now().toString();
  try {
    res.status(201).json(await faqRepo.create(data));
  } catch (e) {
    res.status(500).json({ message: 'Erro ao criar FAQ.', error: e.message });
  }
};

export const updateFaq = async (req, res) => {
  if (!isPlainObject(req.body)) return res.status(400).json({ message: 'Dados inválidos.' });
  const data = { ...req.body };
  if (data.field_resposta) data.field_resposta = sanitizeHtml(data.field_resposta);
  const updated = await faqRepo.update(req.params.id, data);
  if (updated) res.json(updated);
  else res.status(404).json({ message: 'FAQ não encontrado' });
};

export const deleteFaq = async (req, res) => {
  const ok = await faqRepo.remove(req.params.id);
  if (ok) res.json({ message: 'FAQ removido com sucesso' });
  else res.status(404).json({ message: 'FAQ não encontrado' });
};
