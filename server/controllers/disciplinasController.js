import { sanitizeHtml, isPlainObject } from '../utils/sanitize.js';
import { disciplinasRepo } from '../db/repositories.js';
import { filtrarPorEscopo } from '../utils/escopoPrograma.js';
import { query } from '../db/pool.js';
import { resolverOuCriarPessoa } from '../db/pessoasRepo.js';
import { serverError } from '../utils/httpError.js';
import { filtrarVisiveis, visivelPara } from '../utils/publicacao.js';
import { responderLista } from '../utils/listagem.js';

// Fase D: docente_pessoa_id é pessoas.id de verdade — resolve em lote.
const resolvePessoas = async (ids) => {
  const unicos = [...new Set(ids.filter(Boolean))];
  if (unicos.length === 0) return new Map();
  const { rows } = await query('SELECT id, nome, email_institucional FROM pessoas WHERE id = ANY($1)', [unicos]);
  return new Map(rows.map((p) => [p.id, { id: p.id, nome: p.nome, email: p.email_institucional }]));
};

const anexarResolvidos = (disciplinas, byId) => disciplinas.map((d) => ({
  ...d,
  docente: d.docentePessoaId ? (byId.get(d.docentePessoaId) || { id: d.docentePessoaId, nome: 'Pessoa não encontrada' }) : null,
}));

export const getDisciplinas = async (req, res) => {
  let disciplinas = await disciplinasRepo.getAll();
  disciplinas = filtrarVisiveis(await filtrarPorEscopo(disciplinas, req.query), req.user, req.query);
  const byId = await resolvePessoas(disciplinas.map((d) => d.docentePessoaId));
  responderLista(res, anexarResolvidos(disciplinas, byId), req.query);
};

export const getDisciplinaById = async (req, res) => {
  const d = await disciplinasRepo.getById(req.params.id);
  if (!d || !visivelPara(req.user, d)) return res.status(404).json({ message: 'Disciplina não encontrada' });
  const byId = await resolvePessoas([d.docentePessoaId]);
  res.json(anexarResolvidos([d], byId)[0]);
};

// Aceita docenteId como pessoas.id OU users.id (o formulário escolhe um
// Professor do cadastro de usuários) e resolve para pessoas.id.
const resolverIds = async (body) => ({
  docentePessoaId: body.docenteId ? await resolverOuCriarPessoa({ pessoaId: body.docenteId }) : null,
});

export const createDisciplina = async (req, res) => {
  if (!isPlainObject(req.body)) return res.status(400).json({ message: 'Dados inválidos.' });
  const data = { ...req.body };
  if (!data.title || !String(data.title).trim()) return res.status(400).json({ message: 'O título é obrigatório.' });
  if (data.ementaUrl) data.ementaUrl = sanitizeHtml(data.ementaUrl);
  if (!data.id) data.id = 'disc-' + Date.now().toString();
  try {
    Object.assign(data, await resolverIds(data));
    res.status(201).json(await disciplinasRepo.create(data, req.user?.id));
  } catch (e) {
    serverError(res, 'Erro ao criar disciplina.', e);
  }
};

export const updateDisciplina = async (req, res) => {
  if (!isPlainObject(req.body)) return res.status(400).json({ message: 'Dados inválidos.' });
  const data = { ...req.body };
  if (data.ementaUrl) data.ementaUrl = sanitizeHtml(data.ementaUrl);
  try {
    Object.assign(data, await resolverIds(data));
    const updated = await disciplinasRepo.update(req.params.id, data, req.user?.id);
    if (updated) res.json(updated);
    else res.status(404).json({ message: 'Disciplina não encontrada' });
  } catch (e) {
    serverError(res, 'Erro ao atualizar disciplina.', e);
  }
};

export const deleteDisciplina = async (req, res) => {
  const ok = await disciplinasRepo.remove(req.params.id);
  if (ok) res.json({ message: 'Disciplina removida com sucesso' });
  else res.status(404).json({ message: 'Disciplina não encontrada' });
};
