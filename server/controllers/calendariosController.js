import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { sanitizeHtml, isPlainObject } from '../utils/sanitize.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataPath = path.join(__dirname, '../data/calendarios.json');

// Helper para ler os dados
const getCalendariosData = async () => {
  try {
    const data = await fs.readFile(dataPath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Erro ao ler calendarios.json:', error);
    return [];
  }
};

// Helper para salvar os dados
const saveCalendariosData = async (data) => {
  try {
    await fs.writeFile(dataPath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Erro ao salvar calendarios.json:', error);
    throw new Error('Erro ao salvar os dados');
  }
};

export const getCalendarios = async (req, res) => {
  const calendarios = await getCalendariosData();
  res.json(calendarios);
};

export const getCalendarioById = async (req, res) => {
  const calendarios = await getCalendariosData();
  const calendario = calendarios.find(c => c.id === req.params.id);
  if (calendario) {
    res.json(calendario);
  } else {
    res.status(404).json({ message: 'Calendário não encontrado' });
  }
};

export const createCalendario = async (req, res) => {
  if (!isPlainObject(req.body)) {
    return res.status(400).json({ message: 'Dados inválidos.' });
  }
  const calendarios = await getCalendariosData();
  const newCalendario = { ...req.body };

  if (newCalendario.description) newCalendario.description = sanitizeHtml(newCalendario.description);

  if (!newCalendario.id) {
    newCalendario.id = 'cal-' + Date.now().toString();
  }

  // Enforca que apenas um calendário seja o corrente
  if (newCalendario.isCurrent) {
    calendarios.forEach(c => c.isCurrent = false);
  }

  calendarios.unshift(newCalendario);
  // Ordena os calendários por ano decrescente
  calendarios.sort((a, b) => b.ano - a.ano);
  
  await saveCalendariosData(calendarios);
  res.status(201).json(newCalendario);
};

export const updateCalendario = async (req, res) => {
  const calendarios = await getCalendariosData();
  if (!isPlainObject(req.body)) {
    return res.status(400).json({ message: 'Dados inválidos.' });
  }
  const index = calendarios.findIndex(c => c.id === req.params.id);

  if (index !== -1) {
    const updated = { ...calendarios[index], ...req.body };
    if (req.body.description) updated.description = sanitizeHtml(req.body.description);

    // Enforca que apenas um calendário seja o corrente
    if (updated.isCurrent) {
      calendarios.forEach((c, idx) => {
        if (idx !== index) {
          c.isCurrent = false;
        }
      });
    }

    calendarios[index] = updated;
    // Ordena os calendários por ano decrescente
    calendarios.sort((a, b) => b.ano - a.ano);
    
    await saveCalendariosData(calendarios);
    res.json(calendarios[index]);
  } else {
    res.status(404).json({ message: 'Calendário não encontrado' });
  }
};

export const deleteCalendario = async (req, res) => {
  const calendarios = await getCalendariosData();
  const index = calendarios.findIndex(c => c.id === req.params.id);
  
  if (index !== -1) {
    calendarios.splice(index, 1);
    await saveCalendariosData(calendarios);
    res.json({ message: 'Calendário removido com sucesso' });
  } else {
    res.status(404).json({ message: 'Calendário não encontrado' });
  }
};
