import { linhasPesquisaRepo } from '../db/repositories.js';

export const getLinhas = async (req, res) => {
  try {
    const rows = await linhasPesquisaRepo.getAll(req.query.programa_id || null);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar linhas de pesquisa', error: error.message });
  }
};

export const getLinhaById = async (req, res) => {
  try {
    const row = await linhasPesquisaRepo.getById(req.params.id);
    if (!row) return res.status(404).json({ message: 'Linha não encontrada' });
    res.json(row);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar linha', error: error.message });
  }
};

export const createLinha = async (req, res) => {
  try {
    const { nome, programa_id, target_id } = req.body || {};
    if (!nome?.trim()) return res.status(400).json({ message: 'Nome é obrigatório' });
    const row = await linhasPesquisaRepo.create({ nome, programa_id, target_id });
    res.status(201).json(row);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao criar linha', error: error.message });
  }
};

export const updateLinha = async (req, res) => {
  try {
    const { nome, programa_id, target_id } = req.body || {};
    if (!nome?.trim()) return res.status(400).json({ message: 'Nome é obrigatório' });
    const row = await linhasPesquisaRepo.update(req.params.id, { nome, programa_id, target_id });
    if (!row) return res.status(404).json({ message: 'Linha não encontrada' });
    res.json(row);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao atualizar linha', error: error.message });
  }
};

export const deleteLinha = async (req, res) => {
  try {
    const ok = await linhasPesquisaRepo.remove(req.params.id);
    if (!ok) return res.status(404).json({ message: 'Linha não encontrada' });
    res.json({ message: 'Linha removida.' });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao remover linha', error: error.message });
  }
};
