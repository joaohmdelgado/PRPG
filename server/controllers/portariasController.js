import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataPath = path.join(__dirname, '../data/portarias.json');

// Helper para ler os dados
const getPortariasData = async () => {
  try {
    const data = await fs.readFile(dataPath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Erro ao ler portarias.json:', error);
    return [];
  }
};

// Helper para salvar os dados
const savePortariasData = async (data) => {
  try {
    await fs.writeFile(dataPath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Erro ao salvar portarias.json:', error);
    throw new Error('Erro ao salvar os dados');
  }
};

export const getPortarias = async (req, res) => {
  const portarias = await getPortariasData();
  res.json(portarias);
};

export const getPortariaById = async (req, res) => {
  const portarias = await getPortariasData();
  const portaria = portarias.find(p => p.id === req.params.id);
  if (portaria) {
    res.json(portaria);
  } else {
    res.status(404).json({ message: 'Portaria não encontrada' });
  }
};

export const createPortaria = async (req, res) => {
  const portarias = await getPortariasData();
  const newPortaria = { ...req.body };
  
  if (!newPortaria.id) {
    newPortaria.id = 'port-' + Date.now().toString();
  }

  portarias.unshift(newPortaria);
  await savePortariasData(portarias);
  res.status(201).json(newPortaria);
};

export const updatePortaria = async (req, res) => {
  const portarias = await getPortariasData();
  const index = portarias.findIndex(p => p.id === req.params.id);
  
  if (index !== -1) {
    portarias[index] = { ...portarias[index], ...req.body };
    await savePortariasData(portarias);
    res.json(portarias[index]);
  } else {
    res.status(404).json({ message: 'Portaria não encontrada' });
  }
};

export const deletePortaria = async (req, res) => {
  const portarias = await getPortariasData();
  const index = portarias.findIndex(p => p.id === req.params.id);
  
  if (index !== -1) {
    portarias.splice(index, 1);
    await savePortariasData(portarias);
    res.json({ message: 'Portaria removida com sucesso' });
  } else {
    res.status(404).json({ message: 'Portaria não encontrada' });
  }
};
