// Reuniões da Câmara e montagem/lançamento de pauta.
// Ver requisitos-camara.md §9.4 (montagem da pauta) e §13 (Fase 1).
import { isPlainObject } from '../utils/sanitize.js';
import { camaraReunioesRepo, processosRepo } from '../db/repositories.js';
import { camaraPautaItensRepo } from '../db/camaraRepo.js';
import { eventosRepo } from '../db/eventosRepo.js';
import { gerarPautaPdf, gerarMinutaAtaPdf } from '../services/camaraPdf.js';

export const getReunioes = async (req, res) => {
  res.json(await camaraReunioesRepo.getAll());
};

export const getReuniaoById = async (req, res) => {
  const r = await camaraReunioesRepo.getById(req.params.id);
  if (r) res.json(r);
  else res.status(404).json({ message: 'Reunião não encontrada.' });
};

export const createReuniao = async (req, res) => {
  if (!isPlainObject(req.body) || !req.body.data) return res.status(400).json({ message: 'Informe a data da reunião.' });
  const data = { ...req.body, id: req.body.id || 'camreu-' + Date.now().toString(36) };
  try {
    res.status(201).json(await camaraReunioesRepo.create(data, req.user?.id));
  } catch (e) {
    res.status(500).json({ message: 'Erro ao criar reunião.', error: e.message });
  }
};

export const updateReuniao = async (req, res) => {
  if (!isPlainObject(req.body)) return res.status(400).json({ message: 'Dados inválidos.' });
  const updated = await camaraReunioesRepo.update(req.params.id, req.body, req.user?.id);
  if (updated) res.json(updated);
  else res.status(404).json({ message: 'Reunião não encontrada.' });
};

export const deleteReuniao = async (req, res) => {
  const ok = await camaraReunioesRepo.remove(req.params.id);
  if (ok) res.json({ message: 'Reunião removida com sucesso.' });
  else res.status(404).json({ message: 'Reunião não encontrada.' });
};

// ============================ Pauta ========================================

export const getPauta = async (req, res) => {
  const reuniao = await camaraReunioesRepo.getById(req.params.id);
  if (!reuniao) return res.status(404).json({ message: 'Reunião não encontrada.' });
  res.json(await camaraPautaItensRepo.listByReuniao(req.params.id));
};

// Pautar em lote: aceita { processoIds: [...] }. Ignora silenciosamente os que
// já estão na pauta (UNIQUE reuniao_id+processo_id) — atalho de uso diário
// (BulkActionBar "Pautar em…") e montagem completa usam o mesmo endpoint.
export const addToPauta = async (req, res) => {
  const ids = Array.isArray(req.body?.processoIds) ? req.body.processoIds : [];
  if (!ids.length) return res.status(400).json({ message: 'Informe ao menos um processo.' });
  const reuniao = await camaraReunioesRepo.getById(req.params.id);
  if (!reuniao) return res.status(404).json({ message: 'Reunião não encontrada.' });

  const criados = [];
  for (const processoId of ids) {
    try {
      const item = await camaraPautaItensRepo.create({ reuniaoId: reuniao.id, processoId, bloco: req.body.bloco }, req.user?.id);
      criados.push(item);
      await processosRepo.update(processoId, { status: 'PAUTADO' }, req.user?.id);
      await eventosRepo.create({
        entidade: 'processo', entidadeId: processoId, tipo: 'PAUTA', data: reuniao.data,
        origemTipo: 'reuniao', origemId: reuniao.id,
        descricao: `Incluído na pauta da reunião de ${reuniao.data}`,
      }, req.user?.id);
    } catch (e) {
      if (e.code !== '23505') throw e; // já estava na pauta: ignora
    }
  }
  res.status(201).json(criados);
};

export const removeFromPauta = async (req, res) => {
  const ok = await camaraPautaItensRepo.remove(req.params.itemId);
  if (ok) res.json({ message: 'Item removido da pauta.' });
  else res.status(404).json({ message: 'Item de pauta não encontrado.' });
};

// Lançamento em lote das deliberações (modo "depois da reunião" — §9.4).
// Aceita { itens: [{ id, deliberacao, motivoSaida, registro, statusResultante }] }.
export const lancarResultados = async (req, res) => {
  const itens = Array.isArray(req.body?.itens) ? req.body.itens : [];
  if (!itens.length) return res.status(400).json({ message: 'Nenhum resultado informado.' });
  const reuniao = await camaraReunioesRepo.getById(req.params.id);
  if (!reuniao) return res.status(404).json({ message: 'Reunião não encontrada.' });

  const atualizados = [];
  for (const it of itens) {
    const pautaItem = await camaraPautaItensRepo.registrarResultado(it.id, {
      deliberacao: it.deliberacao, motivoSaida: it.motivoSaida, registro: it.registro,
    });
    if (!pautaItem) continue;
    atualizados.push(pautaItem);
    if (it.statusResultante) {
      await processosRepo.update(pautaItem.processo_id, { status: it.statusResultante }, req.user?.id);
    }
    await eventosRepo.create({
      entidade: 'processo', entidadeId: pautaItem.processo_id, tipo: 'DELIBERACAO', data: reuniao.data,
      origemTipo: 'reuniao', origemId: reuniao.id,
      descricao: `${it.deliberacao || 'Deliberado'}${it.registro ? ' — ' + it.registro : ''}`,
    }, req.user?.id);
  }
  await camaraReunioesRepo.update(reuniao.id, { status: 'REALIZADA' }, req.user?.id);
  res.json(atualizados);
};

// ============================ Pauta em PDF =================================
export const pautaPdf = async (req, res) => {
  const reuniao = await camaraReunioesRepo.getById(req.params.id);
  if (!reuniao) return res.status(404).json({ message: 'Reunião não encontrada.' });
  const itens = await camaraPautaItensRepo.listByReuniao(reuniao.id);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="pauta-${reuniao.data}.pdf"`);
  gerarPautaPdf(res, reuniao, itens);
};

// Fase L.1: minuta de ata — só os itens já deliberados.
export const minutaAtaPdf = async (req, res) => {
  const reuniao = await camaraReunioesRepo.getById(req.params.id);
  if (!reuniao) return res.status(404).json({ message: 'Reunião não encontrada.' });
  const itens = await camaraPautaItensRepo.listByReuniao(reuniao.id);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="minuta-ata-${reuniao.data}.pdf"`);
  gerarMinutaAtaPdf(res, reuniao, itens);
};
