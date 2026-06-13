import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

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

export const getEditais = async (req, res) => {
  const editais = await getEditaisData();
  res.json(editais);
};

export const getEditalById = async (req, res) => {
  const editais = await getEditaisData();
  const edital = editais.find(e => e.id === req.params.id);
  if (edital) {
    res.json(edital);
  } else {
    res.status(404).json({ message: 'Edital não encontrado' });
  }
};

export const createEdital = async (req, res) => {
  const editais = await getEditaisData();
  const newEdital = { ...req.body };
  
  if (!newEdital.id) {
    newEdital.id = Date.now().toString(); // Usando timestamp como ID simples para editais
  }

  editais.unshift(newEdital);
  await saveEditaisData(editais);
  res.status(201).json(newEdital);
};

export const updateEdital = async (req, res) => {
  const editais = await getEditaisData();
  const index = editais.findIndex(e => e.id === req.params.id);
  
  if (index !== -1) {
    editais[index] = { ...editais[index], ...req.body };
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
