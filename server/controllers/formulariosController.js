import { sanitizeHtml, isPlainObject } from '../utils/sanitize.js';
import { formulariosRepo } from '../db/repositories.js';

export const getFormularios = async (req, res) => {
  res.json(await formulariosRepo.getAll());
};

export const getFormularioById = async (req, res) => {
  const f = await formulariosRepo.getById(req.params.id);
  if (f) res.json(f);
  else res.status(404).json({ message: 'Formulário não encontrado' });
};

export const createFormulario = async (req, res) => {
  if (!isPlainObject(req.body)) {
    return res.status(400).json({ message: 'Dados inválidos.' });
  }
  const data = { ...req.body };
  if (data.desc) data.desc = sanitizeHtml(data.desc);
  if (!data.id) data.id = 'form-' + Date.now().toString();
  try {
    res.status(201).json(await formulariosRepo.create(data, req.user?.id));
  } catch (e) {
    res.status(500).json({ message: 'Erro ao criar formulário.', error: e.message });
  }
};

export const updateFormulario = async (req, res) => {
  if (!isPlainObject(req.body)) {
    return res.status(400).json({ message: 'Dados inválidos.' });
  }
  const data = { ...req.body };
  if (data.desc) data.desc = sanitizeHtml(data.desc);
  const updated = await formulariosRepo.update(req.params.id, data, req.user?.id);
  if (updated) res.json(updated);
  else res.status(404).json({ message: 'Formulário não encontrado' });
};

export const deleteFormulario = async (req, res) => {
  const ok = await formulariosRepo.remove(req.params.id);
  if (ok) res.json({ message: 'Formulário removido com sucesso' });
  else res.status(404).json({ message: 'Formulário não encontrado' });
};
