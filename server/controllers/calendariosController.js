import { sanitizeHtml, isPlainObject } from '../utils/sanitize.js';
import { calendariosRepo } from '../db/repositories.js';

export const getCalendarios = async (req, res) => {
  res.json(await calendariosRepo.getAll());
};

export const getCalendarioById = async (req, res) => {
  const c = await calendariosRepo.getById(req.params.id);
  if (c) res.json(c);
  else res.status(404).json({ message: 'Calendário não encontrado' });
};

export const createCalendario = async (req, res) => {
  if (!isPlainObject(req.body)) return res.status(400).json({ message: 'Dados inválidos.' });
  const data = { ...req.body };
  if (data.description) data.description = sanitizeHtml(data.description);
  if (!data.id) data.id = 'cal-' + Date.now().toString();
  try {
    const created = await calendariosRepo.create(data, req.user?.id);
    // Garante que apenas um calendário seja o corrente.
    if (created.isCurrent) await calendariosRepo.unsetCurrentExcept(created.id);
    res.status(201).json(created);
  } catch (e) {
    res.status(500).json({ message: 'Erro ao criar calendário.', error: e.message });
  }
};

export const updateCalendario = async (req, res) => {
  if (!isPlainObject(req.body)) return res.status(400).json({ message: 'Dados inválidos.' });
  const data = { ...req.body };
  if (data.description) data.description = sanitizeHtml(data.description);
  const updated = await calendariosRepo.update(req.params.id, data, req.user?.id);
  if (!updated) return res.status(404).json({ message: 'Calendário não encontrado' });
  if (updated.isCurrent) await calendariosRepo.unsetCurrentExcept(updated.id);
  res.json(updated);
};

export const deleteCalendario = async (req, res) => {
  const ok = await calendariosRepo.remove(req.params.id);
  if (ok) res.json({ message: 'Calendário removido com sucesso' });
  else res.status(404).json({ message: 'Calendário não encontrado' });
};
