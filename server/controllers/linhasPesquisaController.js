import { linhasPesquisaRepo } from '../db/repositories.js';

const isPrpgAdmin = (user) => user?.roles?.includes('Administrator') || user?.roles?.includes('Gestor');
const isProgramaScoped = (user) => user?.roles?.includes('GestorPrograma') && !isPrpgAdmin(user);

export const getLinhas = async (req, res) => {
  try {
    let programa_id = req.query.programa_id || null;
    if (isProgramaScoped(req.user) && req.user.programaId) {
      programa_id = req.user.programaId;
    }
    const rows = await linhasPesquisaRepo.getAll(programa_id);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar linhas de pesquisa', error: error.message });
  }
};

export const getLinhaById = async (req, res) => {
  try {
    const row = await linhasPesquisaRepo.getById(req.params.id);
    if (!row) return res.status(404).json({ message: 'Linha não encontrada' });
    if (isProgramaScoped(req.user) && req.user.programaId && row.programa_id !== req.user.programaId) {
      return res.status(403).json({ message: 'Você só pode acessar linhas do seu programa.' });
    }
    res.json(row);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar linha', error: error.message });
  }
};

export const createLinha = async (req, res) => {
  try {
    let { nome, programa_id, target_id } = req.body || {};
    if (!nome?.trim()) return res.status(400).json({ message: 'Nome é obrigatório' });

    if (isProgramaScoped(req.user)) {
      if (!req.user.programaId) return res.status(403).json({ message: 'Gestor sem programa vinculado.' });
      programa_id = req.user.programaId;
    }

    const row = await linhasPesquisaRepo.create({ nome, programa_id, target_id });
    res.status(201).json(row);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao criar linha', error: error.message });
  }
};

export const updateLinha = async (req, res) => {
  try {
    const linha = await linhasPesquisaRepo.getById(req.params.id);
    if (!linha) return res.status(404).json({ message: 'Linha não encontrada' });

    if (isProgramaScoped(req.user) && req.user.programaId && linha.programa_id !== req.user.programaId) {
      return res.status(403).json({ message: 'Você só pode editar linhas do seu programa.' });
    }

    let { nome, programa_id, target_id } = req.body || {};
    if (!nome?.trim()) return res.status(400).json({ message: 'Nome é obrigatório' });

    if (isProgramaScoped(req.user)) {
      programa_id = req.user.programaId;
    }

    const row = await linhasPesquisaRepo.update(req.params.id, { nome, programa_id, target_id });
    res.json(row);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao atualizar linha', error: error.message });
  }
};

export const deleteLinha = async (req, res) => {
  try {
    const linha = await linhasPesquisaRepo.getById(req.params.id);
    if (!linha) return res.status(404).json({ message: 'Linha não encontrada' });

    if (isProgramaScoped(req.user)) {
      return res.status(403).json({ message: 'Gestor de programa não pode deletar linhas de pesquisa.' });
    }

    const ok = await linhasPesquisaRepo.remove(req.params.id);
    if (!ok) return res.status(404).json({ message: 'Linha não encontrada' });
    res.json({ message: 'Linha removida.' });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao remover linha', error: error.message });
  }
};
