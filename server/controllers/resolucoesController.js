import { sanitizeHtml, isPlainObject } from '../utils/sanitize.js';
import { resolucoesRepo } from '../db/repositories.js';
import { filtrarPorEscopo } from '../utils/escopoPrograma.js';
import { serverError } from '../utils/httpError.js';
import { filtrarVisiveis, visivelPara } from '../utils/publicacao.js';
import { responderLista } from '../utils/listagem.js';

export const getResolucoes = async (req, res) => {
  const all = await filtrarPorEscopo(await resolucoesRepo.getAll(), req.query);
  responderLista(res, filtrarVisiveis(all, req.user, req.query), req.query);
};

export const getResolucaoById = async (req, res) => {
  const r = await resolucoesRepo.getById(req.params.id);
  if (r && visivelPara(req.user, r)) res.json(r);
  else res.status(404).json({ message: 'Resolução não encontrada' });
};

export const createResolucao = async (req, res) => {
  if (!isPlainObject(req.body)) {
    return res.status(400).json({ message: 'Dados inválidos.' });
  }
  const data = { ...req.body };
  if (data.desc) data.desc = sanitizeHtml(data.desc);
  if (!data.id) data.id = 'res-' + Date.now().toString();
  try {
    res.status(201).json(await resolucoesRepo.create(data, req.user?.id));
  } catch (e) {
    serverError(res, 'Erro ao criar resolução.', e);
  }
};

export const updateResolucao = async (req, res) => {
  if (!isPlainObject(req.body)) {
    return res.status(400).json({ message: 'Dados inválidos.' });
  }
  const data = { ...req.body };
  if (data.desc) data.desc = sanitizeHtml(data.desc);
  const updated = await resolucoesRepo.update(req.params.id, data, req.user?.id);
  if (updated) res.json(updated);
  else res.status(404).json({ message: 'Resolução não encontrada' });
};

export const deleteResolucao = async (req, res) => {
  const ok = await resolucoesRepo.remove(req.params.id);
  if (ok) res.json({ message: 'Resolução removida com sucesso' });
  else res.status(404).json({ message: 'Resolução não encontrada' });
};
