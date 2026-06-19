import { taxonomiaRefsRepo } from '../db/repositories.js';

const isPrpgAdmin = (user) => user?.roles?.includes('Administrator') || user?.roles?.includes('Gestor');
const isProgramaScoped = (user) => user?.roles?.includes('GestorPrograma') && !isPrpgAdmin(user);

const CAMPOS_VALIDOS = ['entrada', 'situacao_aluno'];

export const getTaxonomiaRefs = async (req, res) => {
  try {
    const campo = req.query.campo || null;
    let programaId = req.query.programa_id || null;
    // Gestor de programa enxerga as do seu programa + as globais.
    if (isProgramaScoped(req.user) && req.user.programaId) {
      programaId = req.user.programaId;
    }
    const rows = await taxonomiaRefsRepo.getAll({ campo, programaId });
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar referências de taxonomia', error: error.message });
  }
};

export const getTaxonomiaRefById = async (req, res) => {
  try {
    const row = await taxonomiaRefsRepo.getById(req.params.id);
    if (!row) return res.status(404).json({ message: 'Referência não encontrada' });
    if (isProgramaScoped(req.user) && req.user.programaId &&
        row.programa_id && row.programa_id !== req.user.programaId) {
      return res.status(403).json({ message: 'Você só pode acessar referências do seu programa.' });
    }
    res.json(row);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar referência', error: error.message });
  }
};

export const createTaxonomiaRef = async (req, res) => {
  try {
    let { campo, valor, programa_id, target_id } = req.body || {};
    if (!campo?.trim() || !CAMPOS_VALIDOS.includes(campo.trim())) {
      return res.status(400).json({ message: 'Campo inválido.' });
    }
    if (!valor?.trim()) return res.status(400).json({ message: 'Valor é obrigatório.' });

    // Gestor de programa só cria refs do SEU programa (nunca globais).
    if (isProgramaScoped(req.user)) {
      if (!req.user.programaId) return res.status(403).json({ message: 'Gestor sem programa vinculado.' });
      programa_id = req.user.programaId;
    }

    const row = await taxonomiaRefsRepo.create({ campo, valor, programa_id, target_id });
    res.status(201).json(row);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ message: 'Já existe uma referência com esse target_id neste campo/programa.' });
    }
    res.status(500).json({ message: 'Erro ao criar referência', error: error.message });
  }
};

export const updateTaxonomiaRef = async (req, res) => {
  try {
    const existente = await taxonomiaRefsRepo.getById(req.params.id);
    if (!existente) return res.status(404).json({ message: 'Referência não encontrada' });

    if (isProgramaScoped(req.user) && req.user.programaId &&
        existente.programa_id !== req.user.programaId) {
      return res.status(403).json({ message: 'Você só pode editar referências do seu programa.' });
    }

    let { campo, valor, programa_id, target_id } = req.body || {};
    if (!campo?.trim() || !CAMPOS_VALIDOS.includes(campo.trim())) {
      return res.status(400).json({ message: 'Campo inválido.' });
    }
    if (!valor?.trim()) return res.status(400).json({ message: 'Valor é obrigatório.' });

    if (isProgramaScoped(req.user)) {
      programa_id = req.user.programaId;
    }

    const row = await taxonomiaRefsRepo.update(req.params.id, { campo, valor, programa_id, target_id });
    res.json(row);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ message: 'Já existe uma referência com esse target_id neste campo/programa.' });
    }
    res.status(500).json({ message: 'Erro ao atualizar referência', error: error.message });
  }
};

export const deleteTaxonomiaRef = async (req, res) => {
  try {
    const existente = await taxonomiaRefsRepo.getById(req.params.id);
    if (!existente) return res.status(404).json({ message: 'Referência não encontrada' });

    if (isProgramaScoped(req.user) && req.user.programaId &&
        existente.programa_id !== req.user.programaId) {
      return res.status(403).json({ message: 'Você só pode remover referências do seu programa.' });
    }

    const ok = await taxonomiaRefsRepo.remove(req.params.id);
    if (!ok) return res.status(404).json({ message: 'Referência não encontrada' });
    res.json({ message: 'Referência removida.' });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao remover referência', error: error.message });
  }
};
