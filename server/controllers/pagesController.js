import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { sanitizeHtml, isPlainObject } from '../utils/sanitize.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataPath = path.join(__dirname, '../data/pages.json');

// Helper para ler os dados
const getPagesData = async () => {
  try {
    const data = await fs.readFile(dataPath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Erro ao ler pages.json:', error);
    return [];
  }
};

// Helper para salvar os dados
const savePagesData = async (data) => {
  try {
    await fs.writeFile(dataPath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Erro ao salvar pages.json:', error);
    throw new Error('Erro ao salvar os dados');
  }
};

// Helper para gerar slug a partir de string
const slugify = (text) => {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD') // remove acentos
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');
};

// Helper para garantir slug único
const generateUniqueSlug = (title, pages, currentId = null) => {
  let baseSlug = slugify(title) || 'pagina';
  let slug = baseSlug;
  let count = 1;
  while (pages.some(p => p.slug === slug && p.id !== currentId)) {
    slug = `${baseSlug}-${count}`;
    count++;
  }
  return slug;
};

export const getPages = async (req, res) => {
  const pages = await getPagesData();
  res.json(pages);
};

export const getPageById = async (req, res) => {
  const pages = await getPagesData();
  const page = pages.find(p => p.id === req.params.id);
  if (page) {
    res.json(page);
  } else {
    res.status(404).json({ message: 'Página não encontrada' });
  }
};

export const getPageBySlug = async (req, res) => {
  const pages = await getPagesData();
  const page = pages.find(p => p.slug === req.params.slug);
  if (page) {
    res.json(page);
  } else {
    res.status(404).json({ message: 'Página não encontrada' });
  }
};

export const createPage = async (req, res) => {
  try {
    const pages = await getPagesData();
    const newPage = { ...req.body };

    if (!newPage.title || !newPage.title.trim()) {
      return res.status(400).json({ message: 'O título é obrigatório.' });
    }

    if (newPage.body?.value) newPage.body.value = sanitizeHtml(newPage.body.value);

    newPage.id = Date.now().toString();
    newPage.slug = generateUniqueSlug(newPage.title, pages);

    pages.push(newPage);
    await savePagesData(pages);
    res.status(201).json(newPage);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao criar página.' });
  }
};

export const updatePage = async (req, res) => {
  try {
    const pages = await getPagesData();
    const index = pages.findIndex(p => p.id === req.params.id);

    if (index === -1) {
      return res.status(404).json({ message: 'Página não encontrada.' });
    }

    const updatedData = { ...pages[index], ...req.body };

    if (!updatedData.title || !updatedData.title.trim()) {
      return res.status(400).json({ message: 'O título é obrigatório.' });
    }

    if (updatedData.body?.value) updatedData.body.value = sanitizeHtml(updatedData.body.value);

    // Se o título mudou, recalculamos o slug garantindo a unicidade
    if (req.body.title && req.body.title !== pages[index].title) {
      updatedData.slug = generateUniqueSlug(req.body.title, pages, req.params.id);
    }

    pages[index] = updatedData;
    await savePagesData(pages);
    res.json(pages[index]);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao atualizar página.' });
  }
};

export const deletePage = async (req, res) => {
  try {
    const pages = await getPagesData();
    const index = pages.findIndex(p => p.id === req.params.id);

    if (index === -1) {
      return res.status(404).json({ message: 'Página não encontrada.' });
    }

    pages.splice(index, 1);
    await savePagesData(pages);
    res.json({ message: 'Página removida com sucesso.' });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao remover página.' });
  }
};
