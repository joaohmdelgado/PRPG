// Fase N.5 (docs/revisao-portal-conteudo-2026-09-24.md): bloco "Relacionados"
// — de um conteúdo se chega aos ligados a ele em 1 clique.
import { pool } from '../db/pool.js';
import { newsRepo, editaisRepo, resolucoesRepo, formulariosRepo, pagesRepo } from '../db/repositories.js';
import {
  TIPOS_REFERENCIA, listarReferencias, resolverItens, substituirReferencias, buscarCandidatos,
} from '../db/referenciasRepo.js';
import { isProgramaScoped } from '../middleware/authMiddleware.js';
import { visivelPara } from '../utils/publicacao.js';

const REPOS = { noticia: newsRepo, edital: editaisRepo, resolucao: resolucoesRepo, formulario: formulariosRepo, pagina: pagesRepo };
const MAX_LIGACOES = 30;
const podeEditar = (user) => (user?.roles || []).some((r) => ['Administrator', 'Gestor', 'GestorPrograma'].includes(r));

// GET /referencias/:tipo/:id — itens ligados. Público: só os publicados (e só
// se o próprio item for visível). Quem edita vê também rascunhos (com status).
export const getReferencias = async (req, res) => {
  const repo = REPOS[req.params.tipo];
  if (!repo) return res.status(404).json({ message: 'Tipo de conteúdo sem relacionados.' });
  const item = await repo.getById(req.params.id);
  if (!item || !visivelPara(req.user, item)) return res.status(404).json({ message: 'Item não encontrado.' });
  const pares = await listarReferencias(req.params.tipo, req.params.id);
  return res.json(await resolverItens(pares, { publicos: !podeEditar(req.user) }));
};

// PUT /referencias/:tipo/:id { itens: [{ tipo, id }] } — substitui o conjunto.
export const putReferencias = async (req, res) => {
  const { tipo, id } = req.params;
  const repo = REPOS[tipo];
  if (!repo) return res.status(404).json({ message: 'Tipo de conteúdo sem relacionados.' });
  const item = await repo.getById(id);
  if (!item) return res.status(404).json({ message: 'Item não encontrado.' });
  // Gestor de programa: só liga a partir de conteúdo do próprio programa
  // (mesma regra do PUT do conteúdo).
  if (isProgramaScoped(req.user) && (item.programaId ?? null) !== req.user.programaId) {
    return res.status(403).json({ message: 'Você só pode gerenciar conteúdo do seu programa.' });
  }
  const itens = req.body?.itens;
  if (!Array.isArray(itens) || itens.length > MAX_LIGACOES) {
    return res.status(400).json({ message: `Envie a lista de itens (no máximo ${MAX_LIGACOES}).` });
  }
  const vistos = new Set();
  const limpos = [];
  for (const it of itens) {
    if (!it || !TIPOS_REFERENCIA[it.tipo] || !it.id) return res.status(400).json({ message: 'Item relacionado inválido.' });
    const chave = `${it.tipo}:${it.id}`;
    if (chave === `${tipo}:${id}` || vistos.has(chave)) continue;
    vistos.add(chave);
    limpos.push({ tipo: it.tipo, id: String(it.id) });
  }
  // Todo alvo precisa existir (publicado ou não).
  const existentes = await resolverItens(limpos, { publicos: false });
  if (existentes.length !== limpos.length) return res.status(400).json({ message: 'Algum item relacionado não existe mais.' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await substituirReferencias(client, tipo, id, limpos, req.user?.id);
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
  return res.json(await resolverItens(await listarReferencias(tipo, id), { publicos: false }));
};

// GET /referencias-candidatos?q= — busca por título para o editor.
export const getCandidatos = async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (q.length < 2) return res.json([]);
  return res.json(await buscarCandidatos(q.slice(0, 100)));
};
