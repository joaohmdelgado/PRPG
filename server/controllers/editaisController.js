import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { sanitizeHtml, isPlainObject } from '../utils/sanitize.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataPath = path.join(__dirname, '../data/editais.json');

// Helper para ler os dados
const getEditaisData = async () => {
  try {
    const data = await fs.readFile(dataPath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Erro ao ler editais.json:', error);
    return [];
  }
};

// Helper para salvar os dados
const saveEditaisData = async (data) => {
  try {
    await fs.writeFile(dataPath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Erro ao salvar editais.json:', error);
    throw new Error('Erro ao salvar os dados');
  }
};

const getLocalDateString = () => {
  const d = new Date();
  try {
    const formatter = new Intl.DateTimeFormat('fr-CA', {
      timeZone: 'America/Recife',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    return formatter.format(d);
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
  
  // Período de inscrições
  const data_inicio = edital.field_periodo?.data_inicio || edital.publishedAt || '';
  const data_fim = edital.field_periodo?.data_fim || edital.deadline || '';

  let situation = 'concluido';

  if (publishedAt && todayStr < publishedAt) {
    // Se a data de publicação é no futuro, o edital ainda não está ativo
    situation = 'concluido';
  } else if (data_inicio && data_fim) {
    if (todayStr >= data_inicio && todayStr <= data_fim) {
      situation = 'abertas';
    } else if (todayStr > data_fim) {
      situation = 'concluido';
    } else if (todayStr < data_inicio) {
      situation = 'andamento';
    }
  } else if (data_inicio && !data_fim) {
    if (todayStr >= data_inicio) {
      situation = 'andamento';
    } else {
      situation = 'andamento';
    }
  } else {
    situation = edital.situation || 'concluido';
  }

  const SITUATIONS = {
    'abertas': 'Inscrições Abertas',
    'andamento': 'Em Andamento',
    'concluido': 'Concluído'
  };

  return {
    ...edital,
    situation,
    situationLabel: SITUATIONS[situation] || 'Concluído'
  };
};

export const getEditais = async (req, res) => {
  const editais = await getEditaisData();
  const computedEditais = editais.map(calculateEditalStatus);
  res.json(computedEditais);
};

export const getEditalById = async (req, res) => {
  const editais = await getEditaisData();
  const edital = editais.find(e => e.id === req.params.id);
  if (edital) {
    res.json(calculateEditalStatus(edital));
  } else {
    res.status(404).json({ message: 'Edital não encontrado' });
  }
};

export const createEdital = async (req, res) => {
  if (!isPlainObject(req.body)) {
    return res.status(400).json({ message: 'Dados inválidos.' });
  }
  const editais = await getEditaisData();
  const newEdital = { ...req.body };

  if (!newEdital.title || !String(newEdital.title).trim()) {
    return res.status(400).json({ message: 'O título é obrigatório.' });
  }
  if (newEdital.description) newEdital.description = sanitizeHtml(newEdital.description);

  if (!newEdital.id) {
    newEdital.id = Date.now().toString(); // Usando timestamp como ID simples para editais
  }

  editais.unshift(newEdital);
  await saveEditaisData(editais);
  res.status(201).json(newEdital);
};

export const updateEdital = async (req, res) => {
  if (!isPlainObject(req.body)) {
    return res.status(400).json({ message: 'Dados inválidos.' });
  }
  const editais = await getEditaisData();
  const index = editais.findIndex(e => e.id === req.params.id);

  if (index !== -1) {
    const updated = { ...editais[index], ...req.body };
    if (req.body.description) updated.description = sanitizeHtml(req.body.description);
    editais[index] = updated;
    await saveEditaisData(editais);
    res.json(editais[index]);
  } else {
    res.status(404).json({ message: 'Edital não encontrado' });
  }
};

export const deleteEdital = async (req, res) => {
  const editais = await getEditaisData();
  const index = editais.findIndex(e => e.id === req.params.id);
  
  if (index !== -1) {
    editais.splice(index, 1);
    await saveEditaisData(editais);
    res.json({ message: 'Edital removido com sucesso' });
  } else {
    res.status(404).json({ message: 'Edital não encontrado' });
  }
};
