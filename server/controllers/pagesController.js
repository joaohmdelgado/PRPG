import { sanitizeHtml, isPlainObject } from '../utils/sanitize.js';
import { pagesRepo } from '../db/repositories.js';
import { query } from '../db/pool.js';
import { serverError } from '../utils/httpError.js';
import { slugify } from '../utils/slug.js';

// Páginas ganham endereço próprio em /<slug> (sem programa) ou
// /<slug-do-programa>/<slug> (vinculada a um programa) — ver App.jsx e
// ProgramaSite.jsx. O slug é único POR ESCOPO (geral vs. programa — ver
// índices parciais em schema.sql), não mais global: duas páginas de
// programas diferentes podem se chamar "Regimento" sem conflito.
//
// Cada escopo tem seu próprio conjunto de nomes reservados, porque cada um
// vive num espaço de URL diferente:
// - Página geral (/<slug> na raiz) colide com as rotas fixas do site
//   institucional da PRPG e com o slug de qualquer programa (senão o
//   microsite do programa sempre venceria e a página ficaria inacessível).
// - Página de programa (/<programaSlug>/<slug>) só colide com as sub-rotas
//   fixas do PRÓPRIO microsite (ProgramaSite.jsx) — as rotas da PRPG "/sobre",
//   "/editais" etc. vivem em outro caminho e são irrelevantes aqui.
const PRPG_ROUTES = new Set([
  'sobre', 'missao-visao-valores', 'historico', 'estrutura-organizacional',
  'equipe', 'financeiro', 'proext-pg', 'programas', 'calendario-academico',
  'editais', 'resolucoes', 'formularios', 'proficiencia', 'declaracoes',
  'verificar', 'relatorios-autoavaliacao', 'especializacao',
  'residencia-profissional', 'sobre-internacionalizacao', 'alunos-estrangeiros',
  'capes-print', 'mobilidade-estudantil', 'reconhecimento', 'noticias',
  'noticia', 'p', 'admin',
]);
const MICROSITE_SUBROTAS = new Set([
  'sobre', 'noticias', 'editais', 'busca', 'comissoes', 'discentes',
  'pessoas', 'disciplinas', 'teses', 'faq', 'grupos-pesquisa',
  'documentos', 'contato',
]);

const generateUniqueSlug = async (title, pages, currentId, programaId) => {
  let taken;
  if (programaId) {
    taken = new Set([
      ...MICROSITE_SUBROTAS,
      ...pages
        .filter((p) => p.id !== currentId && p.programaId === programaId)
        .map((p) => p.slug),
    ]);
  } else {
    const { rows: programaSlugs } = await query('SELECT slug FROM programas WHERE slug IS NOT NULL');
    taken = new Set([
      ...PRPG_ROUTES,
      ...programaSlugs.map((r) => r.slug),
      ...pages.filter((p) => p.id !== currentId && !p.programaId).map((p) => p.slug),
    ]);
  }

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

// O slug só é único DENTRO de cada escopo (geral vs. programa — ver
// generateUniqueSlug), então esta busca precisa do mesmo escopo para não
// devolver a página de outro programa por coincidência de nome. Sem
// `?programa=`, busca só entre as páginas gerais (uso: PageView.jsx em
// /p/:slug e o fallback de página geral em ProgramaSite.jsx).
export const getPageBySlug = async (req, res) => {
  const pages = await pagesRepo.getAll();
  const { programa } = req.query;
  let page;
  if (programa) {
    const prog = (await query(
      'SELECT id FROM programas WHERE id=$1 OR slug=$1', [programa]
    )).rows[0];
    page = prog ? pages.find((p) => p.slug === req.params.slug && p.programaId === prog.id) : null;
  } else {
    page = pages.find((p) => p.slug === req.params.slug && !p.programaId);
  }
  if (page) res.json(page);
  else res.status(404).json({ message: 'Página não encontrada' });
};

export const createPage = async (req, res) => {
  try {
    if (!isPlainObject(req.body)) return res.status(400).json({ message: 'Dados inválidos.' });
    const data = { ...req.body };
    delete data.chave; // só o backend marca páginas fixas (ver ensureFixedSobre)
    if (!data.title || !data.title.trim()) {
      return res.status(400).json({ message: 'O título é obrigatório.' });
    }
    if (data.body?.value) data.body.value = sanitizeHtml(data.body.value);

    const pages = await pagesRepo.getAll();
    data.id = Date.now().toString();
    data.slug = await generateUniqueSlug(data.title, pages, null, data.programaId || null);

    res.status(201).json(await pagesRepo.create(data, req.user?.id));
  } catch (e) {
    serverError(res, 'Erro ao criar página.', e);
  }
};

export const updatePage = async (req, res) => {
  try {
    if (!isPlainObject(req.body)) return res.status(400).json({ message: 'Dados inválidos.' });
    const existing = await pagesRepo.getById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Página não encontrada.' });

    const data = { ...req.body };
    delete data.chave; // imutável pelo cliente
    const title = data.title ?? existing.title;
    if (!title || !title.trim()) {
      return res.status(400).json({ message: 'O título é obrigatório.' });
    }
    if (data.body?.value) data.body.value = sanitizeHtml(data.body.value);

    if (existing.chave) {
      // Página fixa (ex.: "Sobre"): endereço e vínculo com o programa ficam
      // travados — só título/corpo podem mudar (ver pagesController.js docs).
      data.slug = existing.slug;
      data.programaId = existing.programaId;
    } else {
      const targetProgramaId = data.programaId !== undefined ? (data.programaId || null) : existing.programaId;
      const mudouTitulo = data.title !== undefined && data.title !== existing.title;
      const mudouPrograma = data.programaId !== undefined && targetProgramaId !== existing.programaId;
      if (mudouTitulo || mudouPrograma) {
        const pages = await pagesRepo.getAll();
        data.slug = await generateUniqueSlug(mudouTitulo ? data.title : existing.title, pages, req.params.id, targetProgramaId);
      }
    }

    res.json(await pagesRepo.update(req.params.id, data, req.user?.id));
  } catch (e) {
    serverError(res, 'Erro ao atualizar página.', e);
  }
};

export const deletePage = async (req, res) => {
  const existing = await pagesRepo.getById(req.params.id);
  if (!existing) return res.status(404).json({ message: 'Página não encontrada.' });
  if (existing.chave) {
    return res.status(400).json({ message: 'Página fixa do programa não pode ser excluída.' });
  }
  const ok = await pagesRepo.remove(req.params.id);
  if (ok) res.json({ message: 'Página removida com sucesso.' });
  else res.status(404).json({ message: 'Página não encontrada.' });
};
