import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

import { sanitizeDocsDesc, isPlainObject } from '../utils/sanitize.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataPath = path.join(__dirname, '../data/resolucoes.json');

// Helper para ler os dados
const getResolucoesData = async () => {
  try {
    const data = await fs.readFile(dataPath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Erro ao ler resolucoes.json:', error);
    return [];
  }
};

// Helper para salvar os dados
const saveResolucoesData = async (data) => {
  try {
    await fs.writeFile(dataPath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Erro ao salvar resolucoes.json:', error);
    throw new Error('Erro ao salvar os dados');
  }
};

export const getResolucoes = async (req, res) => {
  const resolucoes = await getResolucoesData();
  res.json(resolucoes);
};

export const getResolucaoById = async (req, res) => {
  const resolucoes = await getResolucoesData();
  const resolucao = resolucoes.find(r => r.id === req.params.id);
  if (resolucao) {
    res.json(resolucao);
  } else {
    res.status(404).json({ message: 'Resolução não encontrada' });
  }
};

export const createResolucao = async (req, res) => {
  if (!isPlainObject(req.body)) {
    return res.status(400).json({ message: 'Dados inválidos.' });
  }
  const resolucoes = await getResolucoesData();
  const newResolucao = { ...req.body };

  if (newResolucao.docs) newResolucao.docs = sanitizeDocsDesc(newResolucao.docs);

  if (!newResolucao.id) {
    newResolucao.id = 'res-' + Date.now().toString();
  }

  resolucoes.unshift(newResolucao);
  await saveResolucoesData(resolucoes);
  res.status(201).json(newResolucao);
};

export const updateResolucao = async (req, res) => {
  const resolucoes = await getResolucoesData();
  if (!isPlainObject(req.body)) {
    return res.status(400).json({ message: 'Dados inválidos.' });
  }
  const index = resolucoes.findIndex(r => r.id === req.params.id);

  if (index !== -1) {
    const updated = { ...resolucoes[index], ...req.body };
    if (req.body.docs) updated.docs = sanitizeDocsDesc(req.body.docs);
    resolucoes[index] = updated;
    await saveResolucoesData(resolucoes);
    res.json(resolucoes[index]);
  } else {
    res.status(404).json({ message: 'Resolução não encontrada' });
  }
};

export const deleteResolucao = async (req, res) => {
  const resolucoes = await getResolucoesData();
  const index = resolucoes.findIndex(r => r.id === req.params.id);
  
  if (index !== -1) {
    resolucoes.splice(index, 1);
    await saveResolucoesData(resolucoes);
    res.json({ message: 'Resolução removida com sucesso' });
  } else {
    res.status(404).json({ message: 'Resolução não encontrada' });
  }
};
