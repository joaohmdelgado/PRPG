import { isPlainObject } from '../utils/sanitize.js';
import { bolsasRepo, usersRepo } from '../db/repositories.js';

const resolveUser = (u, fallbackId) =>
  u ? { id: u.id, nome: u.perfil_geral?.nome || u.email, email: u.email }
    : { id: fallbackId, nome: 'Usuário Desconhecido', email: '' };

export const getBolsas = async (req, res) => {
  const bolsas = await bolsasRepo.getAll();
  const users = await usersRepo.getAll();
  const byId = new Map(users.map((u) => [u.id, u]));
  res.json(bolsas.map((b) => ({ ...b, field_aluno_resolved: resolveUser(byId.get(b.field_aluno), b.field_aluno) })));
};

export const getBolsaById = async (req, res) => {
  const b = await bolsasRepo.getById(req.params.id);
  if (b) res.json(b);
  else res.status(404).json({ message: 'Bolsa não encontrada' });
};

export const createBolsa = async (req, res) => {
  if (!isPlainObject(req.body)) return res.status(400).json({ message: 'Dados inválidos.' });
  const data = { ...req.body };
  if (!data.title || !String(data.title).trim()) return res.status(400).json({ message: 'O título é obrigatório.' });
  if (!data.id) data.id = 'bolsa-' + Date.now().toString();
  try {
    res.status(201).json(await bolsasRepo.create(data));
  } catch (e) {
    res.status(500).json({ message: 'Erro ao criar bolsa.', error: e.message });
  }
};

export const updateBolsa = async (req, res) => {
  if (!isPlainObject(req.body)) return res.status(400).json({ message: 'Dados inválidos.' });
  const updated = await bolsasRepo.update(req.params.id, req.body);
  if (updated) res.json(updated);
  else res.status(404).json({ message: 'Bolsa não encontrada' });
};

export const deleteBolsa = async (req, res) => {
  const ok = await bolsasRepo.remove(req.params.id);
  if (ok) res.json({ message: 'Bolsa removida com sucesso' });
  else res.status(404).json({ message: 'Bolsa não encontrada' });
};
