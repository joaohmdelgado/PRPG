import { sanitizeHtml, isPlainObject } from '../utils/sanitize.js';
import { gruposRepo, usersRepo } from '../db/repositories.js';
import { query } from '../db/pool.js';

const resolveProgramaId = async (param) => {
  if (!param) return null;
  const { rows } = await query('SELECT id FROM programas WHERE id = $1 OR slug = $1 LIMIT 1', [param]);
  return rows[0]?.id ?? param;
};

export const getGruposPesquisa = async (req, res) => {
  try {
    let grupos = await gruposRepo.getAll();
    if (req.query.programa) {
      const pid = await resolveProgramaId(req.query.programa);
      grupos = grupos.filter((g) => g.programaId === pid);
    }
    const users = await usersRepo.getAll();
    const byId = new Map(users.map((u) => [u.id, u]));
    const resolved = grupos.map((g) => ({
      ...g,
      field_lideres_resolved: (g.field_lideres || []).map((leaderId) => {
        const u = byId.get(leaderId);
        return u
          ? { id: u.id, nome: u.perfil_geral?.nome || u.email }
          : { id: leaderId, nome: 'Usuário Desconhecido' };
      }),
    }));
    res.json(resolved);
  } catch (e) {
    res.status(500).json({ message: 'Erro ao buscar grupos de pesquisa', error: e.message });
  }
};

export const getGrupoPesquisaById = async (req, res) => {
  const g = await gruposRepo.getById(req.params.id);
  if (g) res.json(g);
  else res.status(404).json({ message: 'Grupo de pesquisa não encontrado' });
};

export const createGrupoPesquisa = async (req, res) => {
  if (!isPlainObject(req.body)) return res.status(400).json({ message: 'Dados inválidos.' });
  const data = { ...req.body };
  if (!data.title || !String(data.title).trim()) return res.status(400).json({ message: 'O título é obrigatório.' });
  data.body = data.body || { value: '', summary: '' };
  if (data.body.value) data.body.value = sanitizeHtml(data.body.value);
  data.field_lideres = data.field_lideres || [];
  if (!data.id) data.id = 'grupo-' + Date.now().toString();
  try {
    res.status(201).json(await gruposRepo.create(data, req.user?.id));
  } catch (e) {
    res.status(500).json({ message: 'Erro ao criar grupo de pesquisa', error: e.message });
  }
};

export const updateGrupoPesquisa = async (req, res) => {
  if (!isPlainObject(req.body)) return res.status(400).json({ message: 'Dados inválidos.' });
  const data = { ...req.body };
  if (data.body?.value) data.body.value = sanitizeHtml(data.body.value);
  const updated = await gruposRepo.update(req.params.id, data, req.user?.id);
  if (updated) res.json(updated);
  else res.status(404).json({ message: 'Grupo de pesquisa não encontrado' });
};

export const deleteGrupoPesquisa = async (req, res) => {
  const ok = await gruposRepo.remove(req.params.id);
  if (ok) res.json({ message: 'Grupo de pesquisa removido com sucesso' });
  else res.status(404).json({ message: 'Grupo de pesquisa não encontrado' });
};
