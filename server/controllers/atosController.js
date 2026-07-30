// Módulo Expedientes (Fase E, PLANO.md) — livro de numeração de ofícios,
// portarias e editais da PRPG. Ver requisitos-expedientes.md para o
// levantamento completo; §7 para a máquina de numeração e §8 para a API.
import { isPlainObject } from '../utils/sanitize.js';
import { atoSeriesRepo, atosRepo, atoReferenciasRepo, diplomasRepo } from '../db/atosRepo.js';
import { processosRepo } from '../db/repositories.js';
import { query } from '../db/pool.js';
import { eventosRepo } from '../db/eventosRepo.js';
import { isProgramaScoped } from '../middleware/authMiddleware.js';
import { NUP_REGEX, validarNumeroProcesso } from '../utils/nup.js';

export const SITUACOES = ['RESERVADO', 'EMITIDO', 'PUBLICADO', 'CANCELADO', 'SEM_EFEITO', 'RETIFICADO'];
export const TIPOS_REFERENCIA = ['REVOGA', 'TORNA_SEM_EFEITO', 'RETIFICA', 'PUBLICA', 'ENCAMINHA', 'COMPLEMENTA', 'FUNDAMENTA'];

// ============================ Séries ============================
export const getSeries = async (req, res) => {
  const ano = req.query.ano ? Number(req.query.ano) : new Date().getFullYear();
  res.json(await atoSeriesRepo.getAllComProximoNumero(ano));
};

export const createSerie = async (req, res) => {
  if (!isPlainObject(req.body) || !req.body.nome || !req.body.especie) {
    return res.status(400).json({ message: 'Informe nome e espécie da série.' });
  }
  try {
    res.status(201).json(await atoSeriesRepo.create(req.body));
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ message: 'Já existe uma série com este identificador.' });
    res.status(500).json({ message: 'Erro ao criar série.', error: e.message });
  }
};

export const updateSerie = async (req, res) => {
  if (!isPlainObject(req.body)) return res.status(400).json({ message: 'Dados inválidos.' });
  const updated = await atoSeriesRepo.update(req.params.id, req.body);
  if (updated) res.json(updated);
  else res.status(404).json({ message: 'Série não encontrada.' });
};

export const deleteSerie = async (req, res) => {
  try {
    const ok = await atoSeriesRepo.remove(req.params.id);
    if (ok) res.json({ message: 'Série removida com sucesso.' });
    else res.status(404).json({ message: 'Série não encontrada.' });
  } catch (e) {
    if (e.code === '23503') return res.status(409).json({ message: 'Há atos emitidos nesta série; desative-a em vez de remover.' });
    res.status(500).json({ message: 'Erro ao remover série.', error: e.message });
  }
};

// ============================ Atos ============================
export const getAtos = async (req, res) => {
  const filtros = { ...req.query };
  if (isProgramaScoped(req.user)) {
    if (!req.user.programaId) return res.status(403).json({ message: 'Gestor sem programa vinculado.' });
    filtros.programa = req.user.programaId;
  }
  res.json(await atosRepo.getAll(filtros));
};

export const getPublico = async (req, res) => {
  res.json(await atosRepo.getPublicados());
};

const assertAcessoAto = (req, res, ato) => {
  if (!ato) { res.status(404).json({ message: 'Ato não encontrado.' }); return false; }
  if (isProgramaScoped(req.user) && (ato.programaId ?? null) !== req.user.programaId) {
    res.status(403).json({ message: 'Você não tem acesso a este ato.' });
    return false;
  }
  return true;
};

export const getAtoById = async (req, res) => {
  const ato = await atosRepo.getById(req.params.id);
  if (!assertAcessoAto(req, res, ato)) return;
  const [referencias, referenciadoPor, eventos, diplomas] = await Promise.all([
    atoReferenciasRepo.listByAto(ato.id),
    atoReferenciasRepo.listByAtoRef(ato.id),
    eventosRepo.listByEntidade('ato', ato.id),
    diplomasRepo.listByAto(ato.id),
  ]);
  res.json({ ...ato, referencias, referenciadoPor, eventos, diplomas });
};

// "Reservar número" (§7.2/§9.1) — o botão de um clique da barra de séries.
export const reservar = async (req, res) => {
  if (!isPlainObject(req.body) || !req.body.serieId || !req.body.assunto) {
    return res.status(400).json({ message: 'Informe a série e o assunto.' });
  }
  const serie = await atoSeriesRepo.getById(req.body.serieId);
  if (!serie) return res.status(404).json({ message: 'Série não encontrada.' });
  const ano = req.body.ano || new Date().getFullYear();
  const programaId = isProgramaScoped(req.user) ? req.user.programaId : (req.body.programaId || null);
  try {
    const ato = await atosRepo.reservar({
      serieId: req.body.serieId, ano, assunto: req.body.assunto, titulo: req.body.titulo,
      programaId, destinatarioUnidadeId: req.body.destinatarioUnidadeId, destinatarioTexto: req.body.destinatarioTexto,
    }, req.user?.id);
    await eventosRepo.create({
      entidade: 'ato', entidadeId: ato.id, tipo: 'RESERVADO', data: new Date().toISOString().slice(0, 10),
      descricao: `Número reservado: ${ato.numeroExibicao}`,
    }, req.user?.id);
    res.status(201).json(ato);
  } catch (e) {
    res.status(500).json({ message: 'Erro ao reservar número.', error: e.message });
  }
};

// Cria já emitido — reserva + preenchimento num só passo (§8).
export const createAto = async (req, res) => {
  if (!isPlainObject(req.body) || !req.body.serieId || !req.body.assunto) {
    return res.status(400).json({ message: 'Informe a série e o assunto.' });
  }
  const serie = await atoSeriesRepo.getById(req.body.serieId);
  if (!serie) return res.status(404).json({ message: 'Série não encontrada.' });
  if (serie.exigeDestinatario && !req.body.destinatarioUnidadeId && !req.body.destinatarioTexto) {
    return res.status(400).json({ message: 'Esta série exige destinatário.' });
  }
  const data = { ...req.body };
  if (isProgramaScoped(req.user)) data.programaId = req.user.programaId;
  if (!data.solicitantePessoaId) data.solicitantePessoaId = null;
  try {
    const ato = await atosRepo.create(data, req.user?.id);
    await eventosRepo.create({
      entidade: 'ato', entidadeId: ato.id, tipo: ato.situacao, data: ato.data,
      descricao: `${ato.situacao === 'EMITIDO' ? 'Emitido' : 'Registrado'}: ${ato.numeroExibicao}`,
    }, req.user?.id);
    res.status(201).json(ato);
  } catch (e) {
    res.status(500).json({ message: 'Erro ao criar ato.', error: e.message });
  }
};

export const updateAto = async (req, res) => {
  if (!isPlainObject(req.body)) return res.status(400).json({ message: 'Dados inválidos.' });
  const existing = await atosRepo.getById(req.params.id);
  if (!assertAcessoAto(req, res, existing)) return;
  const data = { ...req.body };
  if (isProgramaScoped(req.user)) delete data.programaId;
  const updated = await atosRepo.update(req.params.id, data, req.user?.id);
  res.json(updated);
};

// Emitir/publicar/cancelar/tornar sem efeito — gera evento na linha do tempo (§8/§9.2).
export const patchSituacao = async (req, res) => {
  if (!isPlainObject(req.body) || !req.body.situacao || !SITUACOES.includes(req.body.situacao)) {
    return res.status(400).json({ message: 'Informe uma situação válida.' });
  }
  const existing = await atosRepo.getById(req.params.id);
  if (!assertAcessoAto(req, res, existing)) return;
  const { situacao, motivo } = req.body;
  const updated = await atosRepo.updateSituacao(req.params.id, {
    situacao, situacaoMotivo: motivo || null,
    publicado: situacao === 'PUBLICADO' ? true : existing.publicado,
    data: situacao === 'EMITIDO' && !existing.data ? new Date().toISOString().slice(0, 10) : null,
  }, req.user?.id);
  await eventosRepo.create({
    entidade: 'ato', entidadeId: req.params.id, tipo: situacao, data: new Date().toISOString().slice(0, 10),
    descricao: motivo ? `Situação alterada para ${situacao} — ${motivo}` : `Situação alterada para ${situacao}`,
  }, req.user?.id);
  res.json(updated);
};

// Regra explícita: DELETE só em RESERVADO (§8); emitido se cancela, não se apaga.
export const deleteAto = async (req, res) => {
  const existing = await atosRepo.getById(req.params.id);
  if (!existing) return res.status(404).json({ message: 'Ato não encontrado.' });
  if (existing.situacao !== 'RESERVADO') {
    return res.status(409).json({ message: 'Só é possível excluir um ato reservado ainda não emitido; cancele-o em vez de apagar.' });
  }
  const ok = await atosRepo.remove(req.params.id);
  if (ok) res.json({ message: 'Reserva removida com sucesso.' });
  else res.status(404).json({ message: 'Ato não encontrado.' });
};

// ============================ Referências ============================
export const addReferencia = async (req, res) => {
  if (!isPlainObject(req.body) || !req.body.tipo || !TIPOS_REFERENCIA.includes(req.body.tipo)) {
    return res.status(400).json({ message: 'Informe um tipo de referência válido.' });
  }
  if (!req.body.atoRefId && !req.body.atoRefTexto) {
    return res.status(400).json({ message: 'Informe o ato referenciado (cadastrado ou em texto livre).' });
  }
  const ato = await atosRepo.getById(req.params.id);
  if (!assertAcessoAto(req, res, ato)) return;
  const referencia = await atoReferenciasRepo.create({
    atoId: ato.id, atoRefId: req.body.atoRefId || null, atoRefTexto: req.body.atoRefTexto || null, tipo: req.body.tipo,
  }, req.user?.id);
  res.status(201).json(referencia);
};

export const removeReferencia = async (req, res) => {
  const ok = await atoReferenciasRepo.remove(req.params.refId);
  if (ok) res.json({ message: 'Referência removida com sucesso.' });
  else res.status(404).json({ message: 'Referência não encontrada.' });
};

// ============================ Processo vinculado ============================
export { NUP_REGEX, validarNumeroProcesso };

export const linkProcesso = async (req, res) => {
  if (!isPlainObject(req.body) || !req.body.numero) return res.status(400).json({ message: 'Informe o número do processo (NUP).' });
  const ato = await atosRepo.getById(req.params.id);
  if (!assertAcessoAto(req, res, ato)) return;
  const numero = String(req.body.numero).trim();
  let processo = (await processosRepo.getAll()).find((p) => p.numero === numero);
  if (!processo) {
    processo = await processosRepo.create({
      id: 'proc-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      numero, numeroValido: validarNumeroProcesso(numero),
      assunto: ato.assunto, dataEntrada: new Date().toISOString().slice(0, 10), status: 'RECEBIDO',
    }, req.user?.id);
  }
  const updated = await atosRepo.update(ato.id, { processoId: processo.id }, req.user?.id);
  res.json(updated);
};

// ============================ Arquivo (PDF assinado) ============================
export const attachArquivo = async (req, res) => {
  if (!isPlainObject(req.body) || !req.body.arquivoId) return res.status(400).json({ message: 'Informe o arquivo enviado.' });
  const ato = await atosRepo.getById(req.params.id);
  if (!assertAcessoAto(req, res, ato)) return;
  const updated = await atosRepo.update(ato.id, { arquivoId: req.body.arquivoId }, req.user?.id);
  res.json(updated);
};

// ==================== Diplomas em lote (Fase M, §9.4 caminho 2) ====================
// Cria UM ofício (mesma numeração/série de sempre) cobrindo vários concluintes,
// em vez de um ofício por concluinte (caminho 1, ainda disponível via /api/atos
// normal). A secretaria decide, a cada expedição, qual caminho usar.
export const createDiplomasLote = async (req, res) => {
  if (!isPlainObject(req.body) || !req.body.serieId) {
    return res.status(400).json({ message: 'Informe a série do ofício.' });
  }
  const lista = Array.isArray(req.body.concluintes) ? req.body.concluintes : [];
  const validos = lista.filter((c) => c?.nomeConcluinte && String(c.nomeConcluinte).trim());
  if (validos.length === 0) {
    return res.status(400).json({ message: 'Informe ao menos um concluinte (nome).' });
  }
  const serie = await atoSeriesRepo.getById(req.body.serieId);
  if (!serie) return res.status(404).json({ message: 'Série não encontrada.' });

  const data = {
    serieId: req.body.serieId,
    situacao: req.body.situacao === 'EMITIDO' ? 'EMITIDO' : 'RESERVADO',
    assunto: req.body.assunto || `Expedição de diplomas — ${validos.length} concluinte(s)`,
    titulo: req.body.titulo || null,
    destinatarioUnidadeId: req.body.destinatarioUnidadeId || null,
    destinatarioTexto: req.body.destinatarioTexto || 'PROTOCOLO',
    ano: req.body.ano || new Date().getFullYear(),
  };
  if (isProgramaScoped(req.user)) data.programaId = req.user.programaId;

  try {
    const ato = data.situacao === 'EMITIDO'
      ? await atosRepo.create(data, req.user?.id)
      : await atosRepo.reservar(data, req.user?.id);
    const diplomas = await diplomasRepo.setLista(ato.id, validos);
    await eventosRepo.create({
      entidade: 'ato', entidadeId: ato.id, tipo: ato.situacao,
      data: ato.data || new Date().toISOString().slice(0, 10),
      descricao: `Expedição de diplomas em lote (${validos.length} concluinte(s)): ${ato.numeroExibicao}`,
    }, req.user?.id);
    res.status(201).json({ ...ato, diplomas });
  } catch (e) {
    res.status(500).json({ message: 'Erro ao criar ofício de diplomas em lote.', error: e.message });
  }
};

export const getDiplomas = async (req, res) => {
  const ato = await atosRepo.getById(req.params.id);
  if (!assertAcessoAto(req, res, ato)) return;
  res.json(await diplomasRepo.listByAto(ato.id));
};

export const putDiplomas = async (req, res) => {
  if (!isPlainObject(req.body) || !Array.isArray(req.body.concluintes)) {
    return res.status(400).json({ message: 'Informe a lista de concluintes.' });
  }
  const ato = await atosRepo.getById(req.params.id);
  if (!assertAcessoAto(req, res, ato)) return;
  res.json(await diplomasRepo.setLista(ato.id, req.body.concluintes));
};

export const exportDiplomasXlsx = async (req, res) => {
  const ato = await atosRepo.getById(req.params.id);
  if (!assertAcessoAto(req, res, ato)) return;
  const XLSX = await import('xlsx');
  const diplomas = await diplomasRepo.listByAto(ato.id);
  const rows = diplomas.map((d, i) => ({ '#': i + 1, Concluinte: d.nomeConcluinte, Livro: d.livro || '' }));
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Diplomas');
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="diplomas-${ato.numeroExibicao.replace(/[^\w-]+/g, '_')}.xlsx"`);
  res.send(buffer);
};

// ============================ Indicadores (Fase K.4) ============================
// Ver requisitos-expedientes.md §11.
export const getIndicadores = async (req, res) => {
  const { rows: porSerieAno } = await query(`
    SELECT s.nome AS serie, a.ano, COUNT(*)::int AS total
    FROM atos a JOIN ato_series s ON s.id = a.serie_id
    GROUP BY s.nome, a.ano ORDER BY a.ano DESC, total DESC
  `);
  const { rows: reservasPendentes } = await query(`SELECT COUNT(*)::int AS n FROM atos WHERE situacao = 'RESERVADO'`);
  const { rows: semPdf } = await query(`SELECT COUNT(*)::int AS n FROM atos WHERE situacao = 'EMITIDO' AND arquivo_id IS NULL`);
  const { rows: porDestinatario } = await query(`
    SELECT COALESCE(ud.nome, a.destinatario_texto, 'Sem destinatário') AS destinatario, COUNT(*)::int AS total
    FROM atos a LEFT JOIN unidades ud ON ud.id = a.destinatario_unidade_id
    GROUP BY destinatario ORDER BY total DESC LIMIT 10
  `);
  const { rows: porServidor } = await query(`
    SELECT COALESCE(p.nome, 'Sem solicitante') AS servidor, COUNT(*)::int AS total
    FROM atos a LEFT JOIN pessoas p ON p.id = a.solicitante_pessoa_id
    GROUP BY servidor ORDER BY total DESC LIMIT 10
  `);
  res.json({
    porSerieAno, reservasPendentes: reservasPendentes[0].n, semPdf: semPdf[0].n,
    porDestinatario, porServidor,
  });
};

// ============================ Exportação XLSX ============================
export const exportXlsx = async (req, res) => {
  const XLSX = await import('xlsx');
  const filtros = { ...req.query };
  if (isProgramaScoped(req.user)) filtros.programa = req.user.programaId;
  const atos = await atosRepo.getAll(filtros);
  const rows = atos.map((a) => ({
    Numero: a.numeroExibicao, Serie: a.serieNome, Situacao: a.situacao, Data: a.data,
    Assunto: a.assunto, Destinatario: a.destinatarioUnidadeNome || a.destinatarioTexto,
    Solicitante: a.solicitanteNome, Processo: a.processoNumero, Programa: a.programaSigla,
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Expedientes');
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="expedientes.xlsx"');
  res.send(buffer);
};
