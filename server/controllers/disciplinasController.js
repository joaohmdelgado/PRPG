import { sanitizeHtml, isPlainObject } from '../utils/sanitize.js';
import { disciplinasRepo, usersRepo } from '../db/repositories.js';

const resolveUser = (u, fallbackId) =>
  u ? { id: u.id, nome: u.perfil_geral?.nome || u.email, email: u.email }
    : { id: fallbackId, nome: 'Usuário Desconhecido', email: '' };

export const getDisciplinas = async (req, res) => {
  const disciplinas = await disciplinasRepo.getAll();
  const users = await usersRepo.getAll();
  const byId = new Map(users.map((u) => [u.id, u]));
  res.json(disciplinas.map((d) => ({ ...d, field_docente_resolved: resolveUser(byId.get(d.field_docente), d.field_docente) })));
};

export const getDisciplinaById = async (req, res) => {
  const d = await disciplinasRepo.getById(req.params.id);
  if (d) res.json(d);
  else res.status(404).json({ message: 'Disciplina não encontrada' });
};

export const createDisciplina = async (req, res) => {
  if (!isPlainObject(req.body)) return res.status(400).json({ message: 'Dados inválidos.' });
  const data = { ...req.body };
  if (!data.title || !String(data.title).trim()) return res.status(400).json({ message: 'O título é obrigatório.' });
  if (data.field_ementa) data.field_ementa = sanitizeHtml(data.field_ementa);
  if (!data.id) data.id = 'disc-' + Date.now().toString();
  try {
    res.status(201).json(await disciplinasRepo.create(data, req.user?.id));
  } catch (e) {
    res.status(500).json({ message: 'Erro ao criar disciplina.', error: e.message });
  }
};

export const updateDisciplina = async (req, res) => {
  if (!isPlainObject(req.body)) return res.status(400).json({ message: 'Dados inválidos.' });
  const data = { ...req.body };
  if (data.field_ementa) data.field_ementa = sanitizeHtml(data.field_ementa);
  const updated = await disciplinasRepo.update(req.params.id, data, req.user?.id);
  if (updated) res.json(updated);
  else res.status(404).json({ message: 'Disciplina não encontrada' });
};

export const deleteDisciplina = async (req, res) => {
  const ok = await disciplinasRepo.remove(req.params.id);
  if (ok) res.json({ message: 'Disciplina removida com sucesso' });
  else res.status(404).json({ message: 'Disciplina não encontrada' });
};
