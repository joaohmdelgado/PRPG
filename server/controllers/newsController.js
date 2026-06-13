import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { sanitizeHtmlField, isPlainObject } from '../utils/sanitize.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataPath = path.join(__dirname, '../data/news.json');

// Helper para ler os dados
const getNewsData = async () => {
  try {
    const data = await fs.readFile(dataPath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Erro ao ler news.json:', error);
    return [];
  }
};

// Helper para salvar os dados
const saveNewsData = async (data) => {
  try {
    await fs.writeFile(dataPath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Erro ao salvar news.json:', error);
    throw new Error('Erro ao salvar os dados');
  }
};

export const getNews = async (req, res) => {
  const news = await getNewsData();
  res.json(news);
};

export const getNewsById = async (req, res) => {
  const news = await getNewsData();
  const article = news.find(n => n.id === req.params.id);
  if (article) {
    res.json(article);
  } else {
    res.status(404).json({ message: 'Notícia não encontrada' });
  }
};

export const createNews = async (req, res) => {
  if (!isPlainObject(req.body)) {
    return res.status(400).json({ message: 'Dados inválidos.' });
  }
  const news = await getNewsData();
  const newArticle = { ...req.body };

  if (!newArticle.title || !String(newArticle.title).trim()) {
    return res.status(400).json({ message: 'O título é obrigatório.' });
  }
  if (newArticle.content) newArticle.content = sanitizeHtmlField(newArticle.content);

  // Se não houver ID, gera um baseado no título
  if (!newArticle.id) {
    newArticle.id = newArticle.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
  }

  news.unshift(newArticle);
  await saveNewsData(news);
  res.status(201).json(newArticle);
};

export const updateNews = async (req, res) => {
  if (!isPlainObject(req.body)) {
    return res.status(400).json({ message: 'Dados inválidos.' });
  }
  const news = await getNewsData();
  const index = news.findIndex(n => n.id === req.params.id);

  if (index !== -1) {
    const updated = { ...news[index], ...req.body };
    if (req.body.content) updated.content = sanitizeHtmlField(req.body.content);
    news[index] = updated;
    await saveNewsData(news);
    res.json(news[index]);
  } else {
    res.status(404).json({ message: 'Notícia não encontrada' });
  }
};

export const deleteNews = async (req, res) => {
  const news = await getNewsData();
  const index = news.findIndex(n => n.id === req.params.id);
  
  if (index !== -1) {
    news.splice(index, 1);
    await saveNewsData(news);
    res.json({ message: 'Notícia removida com sucesso' });
  } else {
    res.status(404).json({ message: 'Notícia não encontrada' });
  }
};
