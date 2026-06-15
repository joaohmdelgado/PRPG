import { sanitizeHtml, isPlainObject } from '../utils/sanitize.js';
import { resolucoesRepo } from '../db/repositories.js';
import { query } from '../db/pool.js';

const resolveProgramaId = async (param) => {
  if (!param) return null;
  const { rows } = await query('SELECT id FROM programas WHERE id = $1 OR slug = $1 LIMIT 1', [param]);
  return rows[0]?.id ?? param;
};

export const getResolucoes = async (req, res) => {
  const all = await resolucoesRepo.getAll();
  if (req.query.programa) {
    const pid = await resolveProgramaId(req.query.programa);
    return res.json(all.filter((r) => r.programaId === pid));
  }
  res.json(all);
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
    res.status(201).json(await resolucoesRepo.create(data, req.user?.id));
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
  const updated = await resolucoesRepo.update(req.params.id, data, req.user?.id);
  if (updated) res.json(updated);
  else res.status(404).json({ message: 'Resolução não encontrada' });
};

export const deleteResolucao = async (req, res) => {
  const ok = await resolucoesRepo.remove(req.params.id);
  if (ok) res.json({ message: 'Resolução removida com sucesso' });
  else res.status(404).json({ message: 'Resolução não encontrada' });
};
