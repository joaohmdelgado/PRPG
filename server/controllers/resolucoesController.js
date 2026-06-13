import { sanitizeHtml, isPlainObject } from '../utils/sanitize.js';
import { resolucoesRepo } from '../db/repositories.js';

export const getResolucoes = async (req, res) => {
  res.json(await resolucoesRepo.getAll());
};

export const getResolucaoById = async (req, res) => {
  const r = await resolucoesRepo.getById(req.params.id);
  if (r) res.json(r);
  else res.status(404).json({ message: 'Resolução não encontrada' });
};

export const createResolucao = async (req, res) => {
  if (!isPlainObject(req.body)) {
    return res.status(400).json({ message: 'Dados inválidos.' });
  }
  const data = { ...req.body };
  if (data.desc) data.desc = sanitizeHtml(data.desc);
  if (!data.id) data.id = 'res-' + Date.now().toString();
  try {
    res.status(201).json(await resolucoesRepo.create(data));
  } catch (e) {
    res.status(500).json({ message: 'Erro ao criar resolução.', error: e.message });
  }
};

export const updateResolucao = async (req, res) => {
  if (!isPlainObject(req.body)) {
    return res.status(400).json({ message: 'Dados inválidos.' });
  }
  const data = { ...req.body };
  if (data.desc) data.desc = sanitizeHtml(data.desc);
  const updated = await resolucoesRepo.update(req.params.id, data);
  if (updated) res.json(updated);
  else res.status(404).json({ message: 'Resolução não encontrada' });
};

export const deleteResolucao = async (req, res) => {
  const ok = await resolucoesRepo.remove(req.params.id);
  if (ok) res.json({ message: 'Resolução removida com sucesso' });
  else res.status(404).json({ message: 'Resolução não encontrada' });
};
