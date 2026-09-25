import { sanitizeHtml, isPlainObject } from '../utils/sanitize.js';
import { editaisRepo } from '../db/repositories.js';
import { filtrarPorEscopo } from '../utils/escopoPrograma.js';
import { eventosRepo } from '../db/eventosRepo.js';
import { hojeISO } from '../utils/datas.js';
import { serverError } from '../utils/httpError.js';
import { filtrarVisiveis, visivelPara } from '../utils/publicacao.js';
import { responderLista } from '../utils/listagem.js';

const getLocalDateString = () => {
  const d = new Date();
  try {
    return new Intl.DateTimeFormat('fr-CA', {
      timeZone: 'America/Recife', year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(d);
  } catch (e) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
};

export const calculateEditalStatus = (edital) => {
  const todayStr = getLocalDateString();
  const publishedAt = edital.publishedAt || '';
  const data_inicio = edital.field_periodo?.data_inicio || edital.publishedAt || '';
  const data_fim = edital.field_periodo?.data_fim || edital.deadline || '';

  let situation = 'concluido';
  if (publishedAt && todayStr < publishedAt) {
    situation = 'concluido';
  } else if (data_inicio && data_fim) {
    if (todayStr >= data_inicio && todayStr <= data_fim) situation = 'abertas';
    else if (todayStr > data_fim) situation = 'concluido';
    else if (todayStr < data_inicio) situation = 'andamento';
  } else if (data_inicio && !data_fim) {
    situation = 'andamento';
  } else {
    situation = edital.situation || 'concluido';
  }

  const SITUATIONS = {
    abertas: 'Inscrições Abertas',
    andamento: 'Em Andamento',
    concluido: 'Concluído',
  };
  return { ...edital, situation, situationLabel: SITUATIONS[situation] || 'Concluído' };
};

// Fase D (Legado Drupal): erratas/resultadoParcial/resultadoFinal saíram das
// colunas de `editais` — agora são `eventos` (entidade='edital'), lidos aqui
// e devolvidos com a mesma forma de antes para não quebrar Editais.jsx/Edital.jsx
// (só o formulário administrativo muda de fluxo de escrita).
const TIPO_ERRATA = 'ERRATA';
const TIPO_ERRATA_REMOVIDA = 'ERRATA_REMOVIDA';
const TIPO_RESULTADO_PARCIAL = 'RESULTADO_PARCIAL';
const TIPO_RESULTADO_FINAL = 'RESULTADO_FINAL';

const anexarEventos = (edital, eventos) => {
  const removidos = new Set(eventos.filter((e) => e.tipo === TIPO_ERRATA_REMOVIDA).map((e) => e.origemId));
  const erratas = eventos
    .filter((e) => e.tipo === TIPO_ERRATA && !removidos.has(e.id))
    .map((e) => ({ id: e.id, numero: e.descricao, downloadLink: e.dados?.link || '' }))
    .reverse(); // eventos vêm mais-recente-primeiro; erratas ficam na ordem de criação
  const ultimoParcial = eventos.find((e) => e.tipo === TIPO_RESULTADO_PARCIAL);
  const ultimoFinal = eventos.find((e) => e.tipo === TIPO_RESULTADO_FINAL);
  return {
    ...edital,
    erratas,
    resultadoParcial: ultimoParcial?.dados?.link || '',
    resultadoFinal: ultimoFinal?.dados?.link || '',
  };
};

export const getEditais = async (req, res) => {
  let editais = await editaisRepo.getAll();
  editais = filtrarVisiveis(await filtrarPorEscopo(editais, req.query), req.user, req.query);
  // Uma consulta de eventos para todos os editais (antes: uma por edital).
  const eventosPorEdital = await eventosRepo.listByEntidades('edital', editais.map((e) => e.id));
  const comEventos = editais.map((e) => anexarEventos(e, eventosPorEdital.get(e.id) || []));
  let lista = comEventos.map(calculateEditalStatus);
  // ?situacao=abertas|andamento|concluido (home e filtros da página).
  if (req.query.situacao) lista = lista.filter((e) => e.situation === req.query.situacao);
  responderLista(res, lista, req.query);
};

export const getEditalById = async (req, res) => {
  const edital = await editaisRepo.getById(req.params.id);
  if (!edital || !visivelPara(req.user, edital)) return res.status(404).json({ message: 'Edital não encontrado' });
  const eventos = await eventosRepo.listByEntidade('edital', edital.id);
  res.json(calculateEditalStatus(anexarEventos(edital, eventos)));
};

export const createEdital = async (req, res) => {
  if (!isPlainObject(req.body)) {
    return res.status(400).json({ message: 'Dados inválidos.' });
  }
  const data = { ...req.body };
  if (!data.title || !String(data.title).trim()) {
    return res.status(400).json({ message: 'O título é obrigatório.' });
  }
  if (data.description) data.description = sanitizeHtml(data.description);
  if (!data.id) data.id = Date.now().toString();
  try {
    res.status(201).json(await editaisRepo.create(data, req.user?.id));
  } catch (e) {
    serverError(res, 'Erro ao criar edital.', e);
  }
};

export const updateEdital = async (req, res) => {
  if (!isPlainObject(req.body)) {
    return res.status(400).json({ message: 'Dados inválidos.' });
  }
  const data = { ...req.body };
  if (data.description) data.description = sanitizeHtml(data.description);
  const updated = await editaisRepo.update(req.params.id, data, req.user?.id);
  if (updated) res.json(updated);
  else res.status(404).json({ message: 'Edital não encontrado' });
};

export const deleteEdital = async (req, res) => {
  const ok = await editaisRepo.remove(req.params.id);
  if (ok) res.json({ message: 'Edital removido com sucesso' });
  else res.status(404).json({ message: 'Edital não encontrado' });
};

// ------------------------- Errata / Resultados (eventos) -------------------------

export const addErrata = async (req, res) => {
  const edital = await editaisRepo.getById(req.params.id);
  if (!edital) return res.status(404).json({ message: 'Edital não encontrado' });
  const { numero, downloadLink } = req.body || {};
  if (!downloadLink) return res.status(400).json({ message: 'O link de download é obrigatório.' });
  const evento = await eventosRepo.create({
    entidade: 'edital', entidadeId: edital.id, tipo: TIPO_ERRATA,
    data: hojeISO(), descricao: numero || null, dados: { link: downloadLink },
  }, req.user?.id);
  res.status(201).json({ id: evento.id, numero: evento.descricao, downloadLink });
};

export const removeErrata = async (req, res) => {
  const edital = await editaisRepo.getById(req.params.id);
  if (!edital) return res.status(404).json({ message: 'Edital não encontrado' });
  await eventosRepo.create({
    entidade: 'edital', entidadeId: edital.id, tipo: TIPO_ERRATA_REMOVIDA,
    data: hojeISO(), origemTipo: TIPO_ERRATA, origemId: req.params.eventoId,
  }, req.user?.id);
  res.json({ message: 'Errata removida com sucesso' });
};

const setResultado = (tipo) => async (req, res) => {
  const edital = await editaisRepo.getById(req.params.id);
  if (!edital) return res.status(404).json({ message: 'Edital não encontrado' });
  const { downloadLink } = req.body || {};
  const evento = await eventosRepo.create({
    entidade: 'edital', entidadeId: edital.id, tipo, data: hojeISO(), dados: { link: downloadLink || null },
  }, req.user?.id);
  res.status(201).json({ id: evento.id, link: downloadLink || null });
};

export const setResultadoParcial = setResultado(TIPO_RESULTADO_PARCIAL);
export const setResultadoFinal = setResultado(TIPO_RESULTADO_FINAL);
