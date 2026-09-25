import { isPlainObject } from '../utils/sanitize.js';
import { tesesRepo } from '../db/repositories.js';
import { filtrarPorEscopo } from '../utils/escopoPrograma.js';
import { query } from '../db/pool.js';
import { resolverOuCriarPessoa } from '../db/pessoasRepo.js';
import { serverError } from '../utils/httpError.js';
import { filtrarVisiveis, visivelPara } from '../utils/publicacao.js';
import { responderLista, filtrarTexto } from '../utils/listagem.js';
import { mapaProgramas, anexarPrograma } from '../utils/programaResumo.js';

// Fase D: autor/orientador agora são pessoas.id de verdade — resolve em lote
// (nome + e-mail institucional) em vez de carregar todos os users em memória.
const resolvePessoas = async (ids) => {
  const unicos = [...new Set(ids.filter(Boolean))];
  if (unicos.length === 0) return new Map();
  const { rows } = await query('SELECT id, nome, email_institucional FROM pessoas WHERE id = ANY($1)', [unicos]);
  return new Map(rows.map((p) => [p.id, { id: p.id, nome: p.nome, email: p.email_institucional }]));
};

// O e-mail de autor/orientador só vai para quem edita (painel): a listagem
// pública (repositório de teses, Fase N.3) não precisa dele — minimização (LGPD).
const podeVerContato = (user) => (user?.roles || []).some((r) => ['Administrator', 'Gestor', 'GestorPrograma'].includes(r));
const pessoaPara = (p, id, comEmail) => {
  if (!id) return null;
  if (!p) return { id, nome: 'Pessoa não encontrada' };
  return comEmail ? p : { id: p.id, nome: p.nome };
};
const anexarResolvidos = (teses, byId, comEmail = true) => teses.map((t) => ({
  ...t,
  autor: pessoaPara(byId.get(t.autorPessoaId), t.autorPessoaId, comEmail),
  orientador: pessoaPara(byId.get(t.orientadorPessoaId), t.orientadorPessoaId, comEmail),
}));

const anoDe = (t) => (t.ano ? String(t.ano).slice(0, 4) : null);

// Listagem e repositório público (Fase N.3). Filtros: ?programa= (id/slug),
// ?tipo=, ?ano=, ?orientador= (pessoas.id), ?q= (título, autor, orientador).
// Com paginação, `extra` traz as opções dos filtros (calculadas antes deles).
export const getTeses = async (req, res) => {
  const q = req.query;
  let teses = await tesesRepo.getAll();
  teses = filtrarVisiveis(await filtrarPorEscopo(teses, q), req.user, q);
  const byId = await resolvePessoas(teses.flatMap((t) => [t.autorPessoaId, t.orientadorPessoaId]));
  let lista = anexarPrograma(anexarResolvidos(teses, byId, podeVerContato(req.user)), await mapaProgramas())
    .sort((a, b) => String(b.ano || '').localeCompare(String(a.ano || '')) || a.title.localeCompare(b.title));

  const opcoes = {
    anos: [...new Set(lista.map(anoDe).filter(Boolean))].sort().reverse(),
    tipos: [...new Set(lista.map((t) => t.tipo).filter(Boolean))].sort(),
    programas: [...new Map(lista.filter((t) => t.programa).map((t) => [t.programa.id, t.programa])).values()]
      .sort((a, b) => a.nome.localeCompare(b.nome)),
    orientadores: [...new Map(lista.filter((t) => t.orientador?.nome).map((t) => [t.orientador.id, { id: t.orientador.id, nome: t.orientador.nome }])).values()]
      .sort((a, b) => a.nome.localeCompare(b.nome)),
  };
  if (q.tipo) lista = lista.filter((t) => t.tipo === q.tipo);
  if (q.ano) lista = lista.filter((t) => anoDe(t) === String(q.ano));
  if (q.orientador) lista = lista.filter((t) => t.orientadorPessoaId === q.orientador);
  lista = filtrarTexto(lista, q.q, ['title', (t) => `${t.autor?.nome || ''} ${t.orientador?.nome || ''}`]);
  responderLista(res, lista, q, { extra: opcoes });
};

export const getTeseById = async (req, res) => {
  const t = await tesesRepo.getById(req.params.id);
  if (!t || !visivelPara(req.user, t)) return res.status(404).json({ message: 'Tese/Dissertação não encontrada' });
  const byId = await resolvePessoas([t.autorPessoaId, t.orientadorPessoaId]);
  res.json(anexarResolvidos([t], byId, podeVerContato(req.user))[0]);
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
