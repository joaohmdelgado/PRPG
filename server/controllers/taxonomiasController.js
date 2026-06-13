import { isPlainObject } from '../utils/sanitize.js';
import { taxonomiasRepo } from '../db/repositories.js';

export const getTaxonomias = async (req, res) => {
  try {
    res.json(await taxonomiasRepo.getAll());
  } catch (e) {
    res.status(500).json({ message: 'Erro ao buscar taxonomias' });
  }
};

export const updateTaxonomias = async (req, res) => {
  try {
    if (!isPlainObject(req.body)) return res.status(400).json({ message: 'Dados inválidos.' });
    res.json(await taxonomiasRepo.replaceAll(req.body));
  } catch (e) {
    res.status(500).json({ message: 'Erro ao atualizar taxonomias' });
  }
};
