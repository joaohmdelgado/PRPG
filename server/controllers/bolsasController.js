import { isPlainObject } from '../utils/sanitize.js';
import { bolsasRepo } from '../db/repositories.js';
import { query } from '../db/pool.js';
import { resolverOuCriarPessoa } from '../db/pessoasRepo.js';
import { serverError } from '../utils/httpError.js';

// Fase D: pessoa_id é pessoas.id de verdade — resolve em lote.
const resolvePessoas = async (ids) => {
  const unicos = [...new Set(ids.filter(Boolean))];
  if (unicos.length === 0) return new Map();
  const { rows } = await query('SELECT id, nome, email_institucional FROM pessoas WHERE id = ANY($1)', [unicos]);
  return new Map(rows.map((p) => [p.id, { id: p.id, nome: p.nome, email: p.email_institucional }]));
};

const anexarResolvidos = (bolsas, byId) => bolsas.map((b) => ({
  ...b,
  aluno: b.pessoaId ? (byId.get(b.pessoaId) || { id: b.pessoaId, nome: 'Pessoa não encontrada' }) : null,
}));

export const getBolsas = async (req, res) => {
  const bolsas = await bolsasRepo.getAll();
  const byId = await resolvePessoas(bolsas.map((b) => b.pessoaId));
  res.json(anexarResolvidos(bolsas, byId));
};

export const getBolsaById = async (req, res) => {
  const b = await bolsasRepo.getById(req.params.id);
  if (!b) return res.status(404).json({ message: 'Bolsa não encontrada' });
  const byId = await resolvePessoas([b.pessoaId]);
  res.json(anexarResolvidos([b], byId)[0]);
};

// Aceita alunoId como pessoas.id OU users.id (o formulário escolhe um usuário
// do cadastro) e resolve para pessoas.id.
const resolverIds = async (body) => ({
  pessoaId: body.alunoId ? await resolverOuCriarPessoa({ pessoaId: body.alunoId }) : null,
});

export const createBolsa = async (req, res) => {
  if (!isPlainObject(req.body)) return res.status(400).json({ message: 'Dados inválidos.' });
  const data = { ...req.body };
  if (!data.title || !String(data.title).trim()) return res.status(400).json({ message: 'O título é obrigatório.' });
  if (!data.id) data.id = 'bolsa-' + Date.now().toString();
  try {
    Object.assign(data, await resolverIds(data));
    res.status(201).json(await bolsasRepo.create(data, req.user?.id));
  } catch (e) {
    serverError(res, 'Erro ao criar bolsa.', e);
  }
};

export const updateBolsa = async (req, res) => {
  if (!isPlainObject(req.body)) return res.status(400).json({ message: 'Dados inválidos.' });
  const data = { ...req.body };
  try {
    Object.assign(data, await resolverIds(data));
    const updated = await bolsasRepo.update(req.params.id, data, req.user?.id);
    if (updated) res.json(updated);
    else res.status(404).json({ message: 'Bolsa não encontrada' });
  } catch (e) {
    serverError(res, 'Erro ao atualizar bolsa.', e);
  }
};

export const deleteBolsa = async (req, res) => {
  const ok = await bolsasRepo.remove(req.params.id);
  if (ok) res.json({ message: 'Bolsa removida com sucesso' });
  else res.status(404).json({ message: 'Bolsa não encontrada' });
};
