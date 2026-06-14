import { isPlainObject } from '../utils/sanitize.js';
import { portariasRepo } from '../db/repositories.js';

export const getPortarias = async (req, res) => {
  res.json(await portariasRepo.getAll());
};

export const getPortariaById = async (req, res) => {
  const p = await portariasRepo.getById(req.params.id);
  if (p) res.json(p);
  else res.status(404).json({ message: 'Portaria não encontrada' });
};

export const createPortaria = async (req, res) => {
  if (!isPlainObject(req.body)) {
    return res.status(400).json({ message: 'Dados inválidos.' });
  }
  const data = { ...req.body };
  if (!data.title || !String(data.title).trim()) {
    return res.status(400).json({ message: 'O título é obrigatório.' });
  }
  if (!data.id) data.id = 'portaria-' + Date.now().toString();
  try {
    res.status(201).json(await portariasRepo.create(data, req.user?.id));
  } catch (e) {
    res.status(500).json({ message: 'Erro ao criar portaria.', error: e.message });
  }
};

export const updatePortaria = async (req, res) => {
  if (!isPlainObject(req.body)) {
    return res.status(400).json({ message: 'Dados inválidos.' });
  }
  const updated = await portariasRepo.update(req.params.id, req.body, req.user?.id);
  if (updated) res.json(updated);
  else res.status(404).json({ message: 'Portaria não encontrada' });
};

export const deletePortaria = async (req, res) => {
  const ok = await portariasRepo.remove(req.params.id);
  if (ok) res.json({ message: 'Portaria removida com sucesso' });
  else res.status(404).json({ message: 'Portaria não encontrada' });
};
