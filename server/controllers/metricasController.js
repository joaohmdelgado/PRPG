import crypto from 'crypto';
import { isPlainObject } from '../utils/sanitize.js';
import { metricasRepo } from '../db/repositories.js';

// GET /api/metricas         -> todas
// GET /api/metricas?programa=<id> -> só de um programa
export const getMetricas = async (req, res) => {
  try {
    const { programa } = req.query;
    const data = programa ? await metricasRepo.getByPrograma(programa) : await metricasRepo.getAll();
    res.json(data);
  } catch (e) {
    res.status(500).json({ message: 'Erro ao buscar métricas', error: e.message });
  }
};

export const getMetricaById = async (req, res) => {
  const m = await metricasRepo.getById(req.params.id);
  if (m) res.json(m);
  else res.status(404).json({ message: 'Métrica não encontrada' });
};

export const createMetrica = async (req, res) => {
  try {
    if (!isPlainObject(req.body)) return res.status(400).json({ message: 'Dados inválidos.' });
    const data = { ...req.body };
    if (!data.programa_id) return res.status(400).json({ message: 'O programa é obrigatório.' });
    if (data.ano == null || data.ano === '') return res.status(400).json({ message: 'O ano é obrigatório.' });

    const existing = await metricasRepo.findByProgramaAno(data.programa_id, data.ano);
    if (existing) {
      return res.status(409).json({ message: 'Já existe um registro para este programa neste ano. Edite o existente.' });
    }

    if (!data.id) data.id = crypto.randomUUID();
    const created = await metricasRepo.create(data, req.user?.id);
    res.status(201).json(created);
  } catch (e) {
    res.status(500).json({ message: 'Erro ao criar métrica', error: e.message });
  }
};

export const updateMetrica = async (req, res) => {
  try {
    if (!isPlainObject(req.body)) return res.status(400).json({ message: 'Dados inválidos.' });
    const updated = await metricasRepo.update(req.params.id, req.body, req.user?.id);
    if (!updated) return res.status(404).json({ message: 'Métrica não encontrada' });
    res.json(updated);
  } catch (e) {
    if (e.code === '23505') {
      return res.status(409).json({ message: 'Já existe um registro para este programa neste ano.' });
    }
    res.status(500).json({ message: 'Erro ao atualizar métrica', error: e.message });
  }
};

export const deleteMetrica = async (req, res) => {
  const ok = await metricasRepo.remove(req.params.id);
  if (ok) res.json({ message: 'Métrica removida com sucesso' });
  else res.status(404).json({ message: 'Métrica não encontrada' });
};
