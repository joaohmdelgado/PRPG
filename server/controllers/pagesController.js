import { sanitizeHtml, isPlainObject } from '../utils/sanitize.js';
import { pagesRepo } from '../db/repositories.js';

const slugify = (text) =>
  (text || '')
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-');

const generateUniqueSlug = (title, pages, currentId = null) => {
  const baseSlug = slugify(title) || 'pagina';
  let slug = baseSlug;
  let count = 1;
  while (pages.some((p) => p.slug === slug && p.id !== currentId)) {
    slug = `${baseSlug}-${count}`;
    count++;
  }
  return slug;
};

export const getPages = async (req, res) => {
  res.json(await pagesRepo.getAll());
};

export const getPageById = async (req, res) => {
  const page = await pagesRepo.getById(req.params.id);
  if (page) res.json(page);
  else res.status(404).json({ message: 'Página não encontrada' });
};

export const getPageBySlug = async (req, res) => {
  const pages = await pagesRepo.getAll();
  const page = pages.find((p) => p.slug === req.params.slug);
  if (page) res.json(page);
  else res.status(404).json({ message: 'Página não encontrada' });
};

export const createPage = async (req, res) => {
  try {
    if (!isPlainObject(req.body)) return res.status(400).json({ message: 'Dados inválidos.' });
    const data = { ...req.body };
    if (!data.title || !data.title.trim()) {
      return res.status(400).json({ message: 'O título é obrigatório.' });
    }
    if (data.body?.value) data.body.value = sanitizeHtml(data.body.value);

    const pages = await pagesRepo.getAll();
    data.id = Date.now().toString();
    data.slug = generateUniqueSlug(data.title, pages);

    res.status(201).json(await pagesRepo.create(data));
  } catch (e) {
    res.status(500).json({ message: 'Erro ao criar página.', error: e.message });
  }
};

export const updatePage = async (req, res) => {
  try {
    if (!isPlainObject(req.body)) return res.status(400).json({ message: 'Dados inválidos.' });
    const existing = await pagesRepo.getById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Página não encontrada.' });

    const data = { ...req.body };
    const title = data.title ?? existing.title;
    if (!title || !title.trim()) {
      return res.status(400).json({ message: 'O título é obrigatório.' });
    }
    if (data.body?.value) data.body.value = sanitizeHtml(data.body.value);

    // Recalcula o slug se o título mudou.
    if (data.title && data.title !== existing.title) {
      const pages = await pagesRepo.getAll();
      data.slug = generateUniqueSlug(data.title, pages, req.params.id);
    }

    res.json(await pagesRepo.update(req.params.id, data));
  } catch (e) {
    res.status(500).json({ message: 'Erro ao atualizar página.', error: e.message });
  }
};

export const deletePage = async (req, res) => {
  const ok = await pagesRepo.remove(req.params.id);
  if (ok) res.json({ message: 'Página removida com sucesso.' });
  else res.status(404).json({ message: 'Página não encontrada.' });
};
