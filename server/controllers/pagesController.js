import { sanitizeHtml, isPlainObject } from '../utils/sanitize.js';
import { pagesRepo } from '../db/repositories.js';
import { query } from '../db/pool.js';

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

// Páginas ganham endereço próprio em /<slug> (sem programa) ou
// /<slug-do-programa>/<slug> (vinculada a um programa) — ver App.jsx e
// ProgramaSite.jsx. Nenhum dos dois pode colidir com uma rota fixa do site
// (institucional ou dentro do microsite) nem com o slug de outro programa,
// senão a página vira inacessível (a rota fixa sempre vence no roteador).
const RESERVED_SLUGS = new Set([
  // Rotas estáticas do site institucional (App.jsx, dentro de PublicLayout).
  'sobre', 'missao-visao-valores', 'historico', 'estrutura-organizacional',
  'equipe', 'financeiro', 'proext-pg', 'programas', 'calendario-academico',
  'editais', 'resolucoes', 'formularios', 'proficiencia', 'declaracoes',
  'verificar', 'relatorios-autoavaliacao', 'especializacao',
  'residencia-profissional', 'sobre-internacionalizacao', 'alunos-estrangeiros',
  'capes-print', 'mobilidade-estudantil', 'reconhecimento', 'noticias',
  'noticia', 'p', 'admin',
  // Sub-rotas fixas dentro de um microsite de programa (ProgramaSite.jsx).
  'busca', 'comissoes', 'discentes', 'pessoas', 'disciplinas', 'teses',
  'faq', 'grupos-pesquisa', 'documentos', 'contato',
]);

const generateUniqueSlug = async (title, pages, currentId = null) => {
  const { rows: programaSlugs } = await query('SELECT slug FROM programas WHERE slug IS NOT NULL');
  const taken = new Set([
    ...RESERVED_SLUGS,
    ...programaSlugs.map((r) => r.slug),
    ...pages.filter((p) => p.id !== currentId).map((p) => p.slug),
  ]);

  const baseSlug = slugify(title) || 'pagina';
  let slug = baseSlug;
  let count = 1;
  while (taken.has(slug)) {
    slug = `${baseSlug}-${count}`;
    count++;
  }
  return slug;
};

export const getPages = async (req, res) => {
  const all = await pagesRepo.getAll();
  const { programa } = req.query;
  if (programa) {
    // aceita id direto ou slug (resolve via join simples)
    const prog = (await query(
      'SELECT id FROM programas WHERE id=$1 OR slug=$1', [programa]
    )).rows[0];
    if (!prog) return res.json([]);
    return res.json(all.filter((p) => p.programaId === prog.id));
  }
  res.json(all);
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
    data.slug = await generateUniqueSlug(data.title, pages);

    res.status(201).json(await pagesRepo.create(data, req.user?.id));
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
      data.slug = await generateUniqueSlug(data.title, pages, req.params.id);
    }

    res.json(await pagesRepo.update(req.params.id, data, req.user?.id));
  } catch (e) {
    res.status(500).json({ message: 'Erro ao atualizar página.', error: e.message });
  }
};

export const deletePage = async (req, res) => {
  const ok = await pagesRepo.remove(req.params.id);
  if (ok) res.json({ message: 'Página removida com sucesso.' });
  else res.status(404).json({ message: 'Página não encontrada.' });
};
