import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataPath = path.join(__dirname, '../data/formularios.json');

// Helper para ler os dados
const getFormulariosData = async () => {
  try {
    const data = await fs.readFile(dataPath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Erro ao ler formularios.json:', error);
    return [];
  }
};

// Helper para salvar os dados
const saveFormulariosData = async (data) => {
  try {
    await fs.writeFile(dataPath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Erro ao salvar formularios.json:', error);
    throw new Error('Erro ao salvar os dados');
  }
};

export const getFormularios = async (req, res) => {
  const formularios = await getFormulariosData();
  res.json(formularios);
};

export const getFormularioById = async (req, res) => {
  const formularios = await getFormulariosData();
  const formulario = formularios.find(f => f.id === req.params.id);
  if (formulario) {
    res.json(formulario);
  } else {
    res.status(404).json({ message: 'Formulário não encontrado' });
  }
};

export const createFormulario = async (req, res) => {
  const formularios = await getFormulariosData();
  const newFormulario = { ...req.body };
  
  if (!newFormulario.id) {
    newFormulario.id = 'form-' + Date.now().toString();
  }

  formularios.unshift(newFormulario);
  await saveFormulariosData(formularios);
  res.status(201).json(newFormulario);
};

export const updateFormulario = async (req, res) => {
  const formularios = await getFormulariosData();
  const index = formularios.findIndex(f => f.id === req.params.id);
  
  if (index !== -1) {
    formularios[index] = { ...formularios[index], ...req.body };
    await saveFormulariosData(formularios);
    res.json(formularios[index]);
  } else {
    res.status(404).json({ message: 'Formulário não encontrado' });
  }
};

export const deleteFormulario = async (req, res) => {
  const formularios = await getFormulariosData();
  const index = formularios.findIndex(f => f.id === req.params.id);
  
  if (index !== -1) {
    formularios.splice(index, 1);
    await saveFormulariosData(formularios);
    res.json({ message: 'Formulário removido com sucesso' });
  } else {
    res.status(404).json({ message: 'Formulário não encontrado' });
  }
};
