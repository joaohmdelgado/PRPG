import { sanitizeHtml, isPlainObject } from '../utils/sanitize.js';
import { editaisRepo } from '../db/repositories.js';

const getLocalDateString = () => {
  const d = new Date();
  try {
    return new Intl.DateTimeFormat('fr-CA', {
      timeZone: 'America/Recife', year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(d);
  } catch (e) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
};

const calculateEditalStatus = (edital) => {
  const todayStr = getLocalDateString();
  const publishedAt = edital.publishedAt || '';
  const data_inicio = edital.field_periodo?.data_inicio || edital.publishedAt || '';
  const data_fim = edital.field_periodo?.data_fim || edital.deadline || '';

  let situation = 'concluido';
  if (publishedAt && todayStr < publishedAt) {
    situation = 'concluido';
  } else if (data_inicio && data_fim) {
    if (todayStr >= data_inicio && todayStr <= data_fim) situation = 'abertas';
    else if (todayStr > data_fim) situation = 'concluido';
    else if (todayStr < data_inicio) situation = 'andamento';
  } else if (data_inicio && !data_fim) {
    situation = 'andamento';
  } else {
    situation = edital.situation || 'concluido';
  }

  const SITUATIONS = {
    abertas: 'Inscrições Abertas',
    andamento: 'Em Andamento',
    concluido: 'Concluído',
  };
  return { ...edital, situation, situationLabel: SITUATIONS[situation] || 'Concluído' };
};

export const getEditais = async (req, res) => {
  const editais = await editaisRepo.getAll();
  res.json(editais.map(calculateEditalStatus));
};

export const getEditalById = async (req, res) => {
  const edital = await editaisRepo.getById(req.params.id);
  if (edital) res.json(calculateEditalStatus(edital));
  else res.status(404).json({ message: 'Edital não encontrado' });
};

export const createEdital = async (req, res) => {
  if (!isPlainObject(req.body)) {
    return res.status(400).json({ message: 'Dados inválidos.' });
  }
  const data = { ...req.body };
  if (!data.title || !String(data.title).trim()) {
    return res.status(400).json({ message: 'O título é obrigatório.' });
  }
  if (data.description) data.description = sanitizeHtml(data.description);
  if (!data.id) data.id = Date.now().toString();
  try {
    res.status(201).json(await editaisRepo.create(data, req.user?.id));
  } catch (e) {
    res.status(500).json({ message: 'Erro ao criar edital.', error: e.message });
  }
};

export const updateEdital = async (req, res) => {
  if (!isPlainObject(req.body)) {
    return res.status(400).json({ message: 'Dados inválidos.' });
  }
  const data = { ...req.body };
  if (data.description) data.description = sanitizeHtml(data.description);
  const updated = await editaisRepo.update(req.params.id, data, req.user?.id);
  if (updated) res.json(updated);
  else res.status(404).json({ message: 'Edital não encontrado' });
};

export const deleteEdital = async (req, res) => {
  const ok = await editaisRepo.remove(req.params.id);
  if (ok) res.json({ message: 'Edital removido com sucesso' });
  else res.status(404).json({ message: 'Edital não encontrado' });
};
