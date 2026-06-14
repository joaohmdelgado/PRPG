import { isPlainObject } from '../utils/sanitize.js';
import { tesesRepo, usersRepo } from '../db/repositories.js';

const resolveUser = (u, fallbackId) =>
  u ? { id: u.id, nome: u.perfil_geral?.nome || u.email, email: u.email }
    : { id: fallbackId, nome: 'Usuário Desconhecido', email: '' };

export const getTeses = async (req, res) => {
  const teses = await tesesRepo.getAll();
  const users = await usersRepo.getAll();
  const byId = new Map(users.map((u) => [u.id, u]));
  res.json(teses.map((t) => ({ ...t, field_autor_resolved: resolveUser(byId.get(t.field_autor), t.field_autor) })));
};

export const getTeseById = async (req, res) => {
  const t = await tesesRepo.getById(req.params.id);
  if (t) res.json(t);
  else res.status(404).json({ message: 'Tese/Dissertação não encontrada' });
};

export const createTese = async (req, res) => {
  if (!isPlainObject(req.body)) return res.status(400).json({ message: 'Dados inválidos.' });
  const data = { ...req.body };
  if (!data.title || !String(data.title).trim()) return res.status(400).json({ message: 'O título é obrigatório.' });
  if (!data.id) data.id = 'tese-' + Date.now().toString();
  try {
    res.status(201).json(await tesesRepo.create(data, req.user?.id));
  } catch (e) {
    res.status(500).json({ message: 'Erro ao criar tese/dissertação.', error: e.message });
  }
};

export const updateTese = async (req, res) => {
  if (!isPlainObject(req.body)) return res.status(400).json({ message: 'Dados inválidos.' });
  const updated = await tesesRepo.update(req.params.id, req.body, req.user?.id);
  if (updated) res.json(updated);
  else res.status(404).json({ message: 'Tese/Dissertação não encontrada' });
};

export const deleteTese = async (req, res) => {
  const ok = await tesesRepo.remove(req.params.id);
  if (ok) res.json({ message: 'Tese/Dissertação removida com sucesso' });
  else res.status(404).json({ message: 'Tese/Dissertação não encontrada' });
};
