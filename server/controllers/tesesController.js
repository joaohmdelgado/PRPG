import { isPlainObject } from '../utils/sanitize.js';
import { tesesRepo } from '../db/repositories.js';
import { filtrarPorEscopo } from '../utils/escopoPrograma.js';
import { query } from '../db/pool.js';
import { resolverOuCriarPessoa } from '../db/pessoasRepo.js';
import { serverError } from '../utils/httpError.js';
import { filtrarVisiveis, visivelPara } from '../utils/publicacao.js';
import { responderLista } from '../utils/listagem.js';

// Fase D: autor/orientador agora são pessoas.id de verdade — resolve em lote
// (nome + e-mail institucional) em vez de carregar todos os users em memória.
const resolvePessoas = async (ids) => {
  const unicos = [...new Set(ids.filter(Boolean))];
  if (unicos.length === 0) return new Map();
  const { rows } = await query('SELECT id, nome, email_institucional FROM pessoas WHERE id = ANY($1)', [unicos]);
  return new Map(rows.map((p) => [p.id, { id: p.id, nome: p.nome, email: p.email_institucional }]));
};

const anexarResolvidos = (teses, byId) => teses.map((t) => ({
  ...t,
  autor: t.autorPessoaId ? (byId.get(t.autorPessoaId) || { id: t.autorPessoaId, nome: 'Pessoa não encontrada' }) : null,
  orientador: t.orientadorPessoaId ? (byId.get(t.orientadorPessoaId) || { id: t.orientadorPessoaId, nome: 'Pessoa não encontrada' }) : null,
}));

export const getTeses = async (req, res) => {
  let teses = await tesesRepo.getAll();
  teses = filtrarVisiveis(await filtrarPorEscopo(teses, req.query), req.user, req.query);
  const byId = await resolvePessoas(teses.flatMap((t) => [t.autorPessoaId, t.orientadorPessoaId]));
  responderLista(res, anexarResolvidos(teses, byId), req.query);
};

export const getTeseById = async (req, res) => {
  const t = await tesesRepo.getById(req.params.id);
  if (!t || !visivelPara(req.user, t)) return res.status(404).json({ message: 'Tese/Dissertação não encontrada' });
  const byId = await resolvePessoas([t.autorPessoaId, t.orientadorPessoaId]);
  res.json(anexarResolvidos([t], byId)[0]);
};

// Aceita autorId/orientadorId como pessoas.id OU users.id (o formulário hoje
// escolhe um Aluno/Professor do cadastro de usuários) e resolve para pessoas.id.
const resolverIds = async (body) => ({
  autorPessoaId: body.autorId ? await resolverOuCriarPessoa({ pessoaId: body.autorId }) : null,
  orientadorPessoaId: body.orientadorId ? await resolverOuCriarPessoa({ pessoaId: body.orientadorId }) : null,
});

export const createTese = async (req, res) => {
  if (!isPlainObject(req.body)) return res.status(400).json({ message: 'Dados inválidos.' });
  const data = { ...req.body };
  if (!data.title || !String(data.title).trim()) return res.status(400).json({ message: 'O título é obrigatório.' });
  if (!data.id) data.id = 'tese-' + Date.now().toString();
  try {
    Object.assign(data, await resolverIds(data));
    res.status(201).json(await tesesRepo.create(data, req.user?.id));
  } catch (e) {
    serverError(res, 'Erro ao criar tese/dissertação.', e);
  }
};

export const updateTese = async (req, res) => {
  if (!isPlainObject(req.body)) return res.status(400).json({ message: 'Dados inválidos.' });
  const data = { ...req.body };
  try {
    Object.assign(data, await resolverIds(data));
    const updated = await tesesRepo.update(req.params.id, data, req.user?.id);
    if (updated) res.json(updated);
    else res.status(404).json({ message: 'Tese/Dissertação não encontrada' });
  } catch (e) {
    serverError(res, 'Erro ao atualizar tese/dissertação.', e);
  }
};

export const deleteTese = async (req, res) => {
  const ok = await tesesRepo.remove(req.params.id);
  if (ok) res.json({ message: 'Tese/Dissertação removida com sucesso' });
  else res.status(404).json({ message: 'Tese/Dissertação não encontrada' });
};
