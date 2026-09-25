import crypto from 'crypto';
import { sanitizeHtml, isPlainObject } from '../utils/sanitize.js';
import { gruposRepo } from '../db/repositories.js';
import { filtrarPorEscopo } from '../utils/escopoPrograma.js';
import { query } from '../db/pool.js';
import { serverError } from '../utils/httpError.js';
import { estaPublicado } from '../utils/publicacao.js';

// Fase D: líderes são linhas de `vinculos` (papel='LIDER_GRUPO_PESQUISA',
// grupo_pesquisa_id), não mais o JSONB field_lideres — substitui o
// carregamento de todos os users em memória por um JOIN, mesmo padrão de
// programasController (arquitetura-dados.md §2.1).
const LIDER_PAPEL = 'LIDER_GRUPO_PESQUISA';

const listarLideres = async (grupoIds) => {
  if (grupoIds.length === 0) return new Map();
  const { rows } = await query(
    `SELECT v.id AS vinculo_id, v.grupo_pesquisa_id, v.pessoa_id,
            u.id AS u_id, u.email AS u_email, u.perfil_nome AS u_nome,
            p.id AS p_id, p.nome AS p_nome, p.email_institucional AS p_email
     FROM vinculos v
     LEFT JOIN users u ON u.id = v.pessoa_id
     LEFT JOIN pessoas p ON p.id = v.pessoa_id
     WHERE v.papel = $1 AND v.grupo_pesquisa_id = ANY($2) AND v.ativo = TRUE`,
    [LIDER_PAPEL, grupoIds]
  );
  const byGrupo = new Map();
  for (const r of rows) {
    const lider = r.u_id
      ? { id: r.u_id, nome: r.u_nome || r.u_email, email: r.u_email }
      : { id: r.p_id, nome: r.p_nome, email: r.p_email };
    const lista = byGrupo.get(r.grupo_pesquisa_id) || [];
    lista.push({ vinculoId: r.vinculo_id, ...lider });
    byGrupo.set(r.grupo_pesquisa_id, lista);
  }
  return byGrupo;
};

// Substitui todos os líderes de um grupo pela lista de ids recebida
// (users.id ou pessoas.id — mesmo polimorfismo de vinculos.pessoa_id).
const substituirLideres = async (grupoId, liderIds) => {
  await query('DELETE FROM vinculos WHERE grupo_pesquisa_id = $1 AND papel = $2', [grupoId, LIDER_PAPEL]);
  for (const pessoaId of liderIds ?? []) {
    if (!pessoaId) continue;
    await query(
      `INSERT INTO vinculos (id, grupo_pesquisa_id, pessoa_id, papel, ativo, criado_em)
       VALUES ($1,$2,$3,$4,TRUE,now())`,
      [`vinc-${crypto.randomUUID()}`, grupoId, pessoaId, LIDER_PAPEL]
    );
  }
};

export const getGruposPesquisa = async (req, res) => {
  try {
    let grupos = await gruposRepo.getAll();
    grupos = await filtrarPorEscopo(grupos, req.query);
    const lideresByGrupo = await listarLideres(grupos.map((g) => g.id));
    const resolved = grupos.map((g) => ({
      ...g,
      lideres: lideresByGrupo.get(g.id) || [],
    }));
    res.json(resolved);
  } catch (e) {
    serverError(res, 'Erro ao buscar grupos de pesquisa', e);
  }
};

// Leitura pública para o microsite (GET /programas/slug/:slug/grupos): a
// listagem administrativa exige login, e o microsite chamava ela sem token —
// o 401 aparecia ao visitante como "Nenhum grupo cadastrado". Só campos
// públicos: líderes saem com nome, sem e-mail.
export const getGruposPublicos = async (req, res) => {
  const { rows } = await query('SELECT id FROM programas WHERE slug = $1', [req.params.slug]);
  if (!rows[0]) return res.status(404).json({ message: 'Programa não encontrado' });
  const grupos = (await gruposRepo.getAll()).filter((g) => g.programaId === rows[0].id && estaPublicado(g));
  const lideresByGrupo = await listarLideres(grupos.map((g) => g.id));
  res.json(grupos.map((g) => ({
    id: g.id,
    title: g.title,
    body: g.body,
    lideres: (lideresByGrupo.get(g.id) || []).map(({ id, nome }) => ({ id, nome })),
  })));
};

export const getGrupoPesquisaById = async (req, res) => {
  const g = await gruposRepo.getById(req.params.id);
  if (!g) return res.status(404).json({ message: 'Grupo de pesquisa não encontrado' });
  const lideresByGrupo = await listarLideres([g.id]);
  res.json({ ...g, lideres: lideresByGrupo.get(g.id) || [] });
};

export const createGrupoPesquisa = async (req, res) => {
  if (!isPlainObject(req.body)) return res.status(400).json({ message: 'Dados inválidos.' });
  const data = { ...req.body };
  if (!data.title || !String(data.title).trim()) return res.status(400).json({ message: 'O título é obrigatório.' });
  data.body = data.body || { value: '', summary: '' };
  if (data.body.value) data.body.value = sanitizeHtml(data.body.value);
  const liderIds = data.liderIds || [];
  delete data.liderIds;
  if (!data.id) data.id = 'grupo-' + Date.now().toString();
  try {
    const criado = await gruposRepo.create(data, req.user?.id);
    await substituirLideres(criado.id, liderIds);
    const lideresByGrupo = await listarLideres([criado.id]);
    res.status(201).json({ ...criado, lideres: lideresByGrupo.get(criado.id) || [] });
  } catch (e) {
    serverError(res, 'Erro ao criar grupo de pesquisa', e);
  }
};

export const updateGrupoPesquisa = async (req, res) => {
  if (!isPlainObject(req.body)) return res.status(400).json({ message: 'Dados inválidos.' });
  const data = { ...req.body };
  if (data.body?.value) data.body.value = sanitizeHtml(data.body.value);
  const liderIds = data.liderIds;
  delete data.liderIds;
  const updated = await gruposRepo.update(req.params.id, data, req.user?.id);
  if (!updated) return res.status(404).json({ message: 'Grupo de pesquisa não encontrado' });
  if (liderIds !== undefined) await substituirLideres(req.params.id, liderIds);
  const lideresByGrupo = await listarLideres([req.params.id]);
  res.json({ ...updated, lideres: lideresByGrupo.get(req.params.id) || [] });
};

export const deleteGrupoPesquisa = async (req, res) => {
  const ok = await gruposRepo.remove(req.params.id);
  if (ok) res.json({ message: 'Grupo de pesquisa removido com sucesso' });
  else res.status(404).json({ message: 'Grupo de pesquisa não encontrado' });
};
