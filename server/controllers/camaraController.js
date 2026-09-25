// Módulo Câmara de Pós-Graduação — processos, unidades e atos.
// Ver requisitos-camara.md (raiz do projeto) para o levantamento completo.
// Reuniões e pauta ficam em camaraReunioesController.js.
import { isPlainObject } from '../utils/sanitize.js';
import { processosRepo, unidadesRepo, camaraAtosRepo } from '../db/repositories.js';
import { camaraPautaItensRepo, camaraRelatoriasRepo } from '../db/camaraRepo.js';
import { eventosRepo } from '../db/eventosRepo.js';
import { query } from '../db/pool.js';
import { isProgramaScoped } from '../middleware/authMiddleware.js';
import { NUP_REGEX, validarNumeroProcesso } from '../utils/nup.js';
import {
  gerarEspelhoProcessoPdf, gerarExtratoEncaminhamentoPdf, gerarOficioRelatoriaPdf, gerarRelatorioAnualCamaraPdf,
} from '../services/camaraPdf.js';
import { emitir } from '../services/declaracoes.js';
import { enviarEmail } from '../services/email.js';
import { resolverEmail } from '../services/prazos.js';
import QRCode from 'qrcode';
import { serverError } from '../utils/httpError.js';
import { slugify } from '../utils/slug.js';

// ============================ Vocabulários ============================
// Listas sugeridas ao frontend (selects). Não bloqueiam o servidor: o campo
// é TEXT livre para sempre haver uma válvula "outro (especificar)" — ver
// requisitos-camara.md §6.
export const STATUS_PROCESSO = [
  'RECEBIDO', 'EM_INSTRUCAO', 'APTO_PAUTA', 'RELATOR_DESIGNADO', 'PARECER_RECEBIDO',
  'PAUTADO', 'DELIBERADO', 'ATO_LAVRADO', 'PUBLICADO', 'RESOLVIDO', 'ARQUIVADO',
  'RETIRADO_DE_PAUTA', 'EM_DILIGENCIA', 'PEDIDO_VISTA', 'SOBRESTADO', 'ADIADO',
  'AD_REFERENDUM', 'APENSADO', 'ENCAMINHADO_INSTANCIA_SUPERIOR',
  'EM_MANIFESTACAO_JURIDICA', 'EM_RECURSO',
];
export const STATUS_RESOLVIDOS = ['RESOLVIDO', 'ARQUIVADO', 'PUBLICADO'];

export const getVocabularios = async (req, res) => {
  res.json({ status: STATUS_PROCESSO, statusResolvidos: STATUS_RESOLVIDOS });
};

// ============================ Unidades/setores =========================
export const getUnidades = async (req, res) => {
  res.json(await unidadesRepo.getAll());
};

export const createUnidade = async (req, res) => {
  if (!isPlainObject(req.body)) return res.status(400).json({ message: 'Dados inválidos.' });
  const data = { ...req.body };
  if (!data.sigla || !String(data.sigla).trim()) return res.status(400).json({ message: 'A sigla é obrigatória.' });
  if (!data.nome || !String(data.nome).trim()) return res.status(400).json({ message: 'O nome é obrigatório.' });
  if (!data.id) data.id = slugify(data.sigla) + '-' + Date.now().toString(36);
  try {
    res.status(201).json(await unidadesRepo.create(data));
  } catch (e) {
    serverError(res, 'Erro ao criar unidade.', e);
  }
};

export const updateUnidade = async (req, res) => {
  if (!isPlainObject(req.body)) return res.status(400).json({ message: 'Dados inválidos.' });
  const updated = await unidadesRepo.update(req.params.id, req.body);
  if (updated) res.json(updated);
  else res.status(404).json({ message: 'Unidade não encontrada.' });
};

export const deleteUnidade = async (req, res) => {
  const ok = await unidadesRepo.remove(req.params.id);
  if (ok) res.json({ message: 'Unidade removida com sucesso.' });
  else res.status(404).json({ message: 'Unidade não encontrada.' });
};

// Validação do NUP: movida para server/utils/nup.js (Fase A.14); reexportada
// aqui para não quebrar quem já importa NUP_REGEX/validarNumeroProcesso
// deste módulo.
export { NUP_REGEX, validarNumeroProcesso };

// ============================ Processos =================================

const fromRowProcesso = (r) => ({
  id: r.id, numero: r.numero, numeroValido: r.numero_valido, linkSipac: r.link_sipac,
  assunto: r.assunto, tipoMateria: r.tipo_materia, interessado: r.interessado,
  programaId: r.programa_id, unidadeResponsavelId: r.unidade_responsavel_id,
  status: r.status, statusMotivo: r.status_motivo,
  localizacaoId: r.localizacao_id, localizacaoEm: r.localizacao_em,
  dataEntrada: r.data_entrada, dataEncerramento: r.data_encerramento,
  processoPaiId: r.processo_pai_id, sigiloso: r.sigiloso,
  observacoes: r.observacoes, obsOriginal: r.obs_original,
  criado_por: r.criado_por, atualizado_por: r.atualizado_por,
  criado_em: r.criado_em, atualizado_em: r.atualizado_em,
  // Campos derivados (ver requisitos-camara.md §7.2), presentes só na listagem.
  unidadeResponsavelNome: r.unidade_responsavel_nome, unidadeResponsavelSigla: r.unidade_responsavel_sigla,
  localizacaoNome: r.localizacao_nome, localizacaoSigla: r.localizacao_sigla,
  programaSigla: r.programa_sigla, programaNome: r.programa_nome,
  relatorNome: r.relator_nome, relatorPrazoDevolucao: r.relator_prazo_devolucao,
  pautasCount: r.pautas_count != null ? Number(r.pautas_count) : undefined,
  atrasado: r.atrasado ?? undefined,
  reincidente: r.pautas_count != null ? Number(r.pautas_count) >= 3 : undefined,
});

// Lista com filtros (ver requisitos-camara.md §8, §9.1). GestorPrograma só
// enxerga os processos do seu próprio programa, e nunca os marcados sigiloso.
export const getProcessos = async (req, res) => {
  const { status, unidade, programa, relator, q, atrasados, reincidentes } = req.query;
  const where = [];
  const params = [];

  if (isProgramaScoped(req.user)) {
    if (!req.user.programaId) return res.status(403).json({ message: 'Gestor sem programa vinculado.' });
    params.push(req.user.programaId);
    where.push(`t.programa_id = $${params.length}`);
    where.push('t.sigiloso = FALSE');
  } else if (programa) {
    params.push(programa);
    where.push(`t.programa_id = $${params.length}`);
  }

  if (status) { params.push(status); where.push(`t.status = $${params.length}`); }
  if (unidade) {
    params.push(unidade);
    where.push(`(t.unidade_responsavel_id = $${params.length} OR t.localizacao_id = $${params.length})`);
  }
  if (relator) { params.push(`%${relator}%`); where.push(`t.relator_nome ILIKE $${params.length}`); }
  if (q) {
    params.push(`%${q}%`);
    where.push(`(t.numero ILIKE $${params.length} OR t.assunto ILIKE $${params.length} OR t.relator_nome ILIKE $${params.length})`);
  }
  if (atrasados === 'true' || atrasados === '1') where.push('t.atrasado = TRUE');
  if (reincidentes === 'true' || reincidentes === '1') where.push('t.pautas_count >= 3');

  const sql = `
    SELECT * FROM (
      SELECT p.*,
        u.nome  AS unidade_responsavel_nome, u.sigla AS unidade_responsavel_sigla,
        l.nome  AS localizacao_nome,          l.sigla AS localizacao_sigla,
        pr.sigla AS programa_sigla, pr.nome AS programa_nome,
        r.relator_nome, r.prazo_devolucao AS relator_prazo_devolucao, r.data_devolucao AS relator_data_devolucao,
        (SELECT COUNT(*)::int FROM camara_pauta_itens pi WHERE pi.processo_id = p.id) AS pautas_count,
        (r.prazo_devolucao IS NOT NULL AND r.data_devolucao IS NULL
          AND r.prazo_devolucao < CURRENT_DATE) AS atrasado
      FROM processos p
      LEFT JOIN unidades u ON u.id = p.unidade_responsavel_id
      LEFT JOIN unidades l ON l.id = p.localizacao_id
      LEFT JOIN programas pr ON pr.id = p.programa_id
      LEFT JOIN LATERAL (
        SELECT relator_nome, prazo_devolucao, data_devolucao FROM camara_relatorias
        WHERE processo_id = p.id AND ativa = TRUE ORDER BY criado_em DESC LIMIT 1
      ) r ON TRUE
    ) t
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    ORDER BY (t.status = ANY($${params.length + 1})) ASC, t.localizacao_em ASC NULLS FIRST, t.criado_em DESC`;
  params.push(STATUS_RESOLVIDOS);

  const { rows } = await query(sql, params);
  res.json(rows.map(fromRowProcesso));
};

// "O que está comigo" — visão do relator autenticado (Fase 4, expõe já a rota).
export const getMeusProcessos = async (req, res) => {
  if (!req.user?.id) return res.status(401).json({ message: 'Não autenticado.' });
  const { rows } = await query(
    `SELECT p.*, r.prazo_devolucao AS relator_prazo_devolucao, r.relator_nome
       FROM camara_relatorias r
       JOIN processos p ON p.id = r.processo_id
      WHERE r.relator_id = $1 AND r.ativa = TRUE
      ORDER BY r.prazo_devolucao ASC NULLS LAST`,
    [req.user.id]
  );
  res.json(rows.map(fromRowProcesso));
};

const assertAcessoProcesso = async (req, res, processo) => {
  if (!processo) { res.status(404).json({ message: 'Processo não encontrado.' }); return false; }
  if (isProgramaScoped(req.user)) {
    if (processo.sigiloso || (processo.programaId ?? null) !== req.user.programaId) {
      res.status(403).json({ message: 'Você não tem acesso a este processo.' });
      return false;
    }
  }
  return true;
};

export const getProcessoById = async (req, res) => {
  const processo = await processosRepo.getById(req.params.id);
  if (!(await assertAcessoProcesso(req, res, processo))) return;
  const [eventos, relatorias, pautas, atos] = await Promise.all([
    eventosRepo.listByEntidade('processo', processo.id),
    camaraRelatoriasRepo.listByProcesso(processo.id),
    camaraPautaItensRepo.listByProcesso(processo.id),
    camaraAtosRepo.getAll().then((all) => all.filter((a) => a.processoId === processo.id)),
  ]);
  res.json({ ...processo, eventos, relatorias, pautas, atos });
};

export const createProcesso = async (req, res) => {
  if (!isPlainObject(req.body)) return res.status(400).json({ message: 'Dados inválidos.' });
  const data = { ...req.body };
  if (!data.numero || !String(data.numero).trim()) return res.status(400).json({ message: 'O número do processo (NUP) é obrigatório.' });
  if (!data.assunto || !String(data.assunto).trim()) return res.status(400).json({ message: 'O assunto é obrigatório.' });
  if (!data.id) data.id = 'camproc-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  data.numeroValido = validarNumeroProcesso(data.numero);
  if (!data.dataEntrada) data.dataEntrada = new Date().toISOString().slice(0, 10);
  if (!data.status) data.status = 'RECEBIDO';
  if (isProgramaScoped(req.user)) data.programaId = req.user.programaId;

  try {
    const created = await processosRepo.create(data, req.user?.id);
    if (data.localizacaoId) {
      await eventosRepo.create({
        entidade: 'processo', entidadeId: created.id, tipo: 'TRAMITACAO', data: data.dataEntrada,
        unidadeId: data.localizacaoId, descricao: 'Entrada na secretaria da Câmara.',
      }, req.user?.id);
    }
    res.status(201).json(created);
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ message: 'Já existe um processo cadastrado com este número.' });
    serverError(res, 'Erro ao criar processo.', e);
  }
};

export const updateProcesso = async (req, res) => {
  if (!isPlainObject(req.body)) return res.status(400).json({ message: 'Dados inválidos.' });
  const existing = await processosRepo.getById(req.params.id);
  if (!(await assertAcessoProcesso(req, res, existing))) return;
  const data = { ...req.body };
  if (data.numero) data.numeroValido = validarNumeroProcesso(data.numero);
  if (isProgramaScoped(req.user)) delete data.programaId; // gestor não migra processo de programa
  try {
    const updated = await processosRepo.update(req.params.id, data, req.user?.id);
    res.json(updated);
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ message: 'Já existe um processo cadastrado com este número.' });
    serverError(res, 'Erro ao atualizar processo.', e);
  }
};

// Troca rápida de status (badge da lista) — gera evento na linha do tempo.
export const patchStatus = async (req, res) => {
  if (!isPlainObject(req.body) || !req.body.status) return res.status(400).json({ message: 'Informe o novo status.' });
  const existing = await processosRepo.getById(req.params.id);
  if (!existing) return res.status(404).json({ message: 'Processo não encontrado.' });
  const { status, motivo } = req.body;
  const updated = await processosRepo.update(req.params.id, {
    status, statusMotivo: motivo || null,
    dataEncerramento: STATUS_RESOLVIDOS.includes(status) ? (existing.dataEncerramento || new Date().toISOString().slice(0, 10)) : existing.dataEncerramento,
  }, req.user?.id);
  await eventosRepo.create({
    entidade: 'processo', entidadeId: req.params.id, tipo: 'STATUS', data: new Date().toISOString().slice(0, 10),
    descricao: motivo ? `Status alterado para ${status} — ${motivo}` : `Status alterado para ${status}`,
  }, req.user?.id);
  res.json(updated);
};

// Troca de localização — inline na lista/ficha. Gera evento de tramitação e
// atualiza o cache localizacao_id/localizacao_em em processos.
export const patchLocalizacao = async (req, res) => {
  if (!isPlainObject(req.body) || !req.body.unidadeId) return res.status(400).json({ message: 'Informe a unidade de destino.' });
  const existing = await processosRepo.getById(req.params.id);
  if (!existing) return res.status(404).json({ message: 'Processo não encontrado.' });
  const dataEvento = req.body.data || new Date().toISOString().slice(0, 10);
  const updated = await processosRepo.update(req.params.id, {
    localizacaoId: req.body.unidadeId, localizacaoEm: dataEvento,
  }, req.user?.id);
  await eventosRepo.create({
    entidade: 'processo', entidadeId: req.params.id, tipo: 'TRAMITACAO', data: dataEvento,
    unidadeId: req.body.unidadeId, descricao: req.body.descricao || null,
  }, req.user?.id);
  res.json(updated);
};

export const deleteProcesso = async (req, res) => {
  const ok = await processosRepo.remove(req.params.id);
  if (ok) res.json({ message: 'Processo removido com sucesso.' });
  else res.status(404).json({ message: 'Processo não encontrado.' });
};

// ============================ Eventos (linha do tempo) ===================
export const addEvento = async (req, res) => {
  if (!isPlainObject(req.body) || !req.body.tipo || !req.body.descricao) {
    return res.status(400).json({ message: 'Informe o tipo e a descrição do evento.' });
  }
  const processo = await processosRepo.getById(req.params.id);
  if (!processo) return res.status(404).json({ message: 'Processo não encontrado.' });
  // anexoUrl: URL crua enquanto a Fase E/G não migra este formulário para o
  // fluxo de upload -> arquivos/anexos; guardada em `dados` (JSONB) até lá.
  const evento = await eventosRepo.create({
    entidade: 'processo', entidadeId: req.params.id, tipo: req.body.tipo,
    data: req.body.data || new Date().toISOString().slice(0, 10),
    descricao: req.body.descricao, unidadeId: req.body.unidadeId || null,
    dados: req.body.anexoUrl ? { anexoUrl: req.body.anexoUrl } : {},
  }, req.user?.id);
  res.status(201).json(evento);
};

// ============================ Relatorias ==================================
export const addRelatoria = async (req, res) => {
  if (!isPlainObject(req.body) || !req.body.relatorNome) {
    return res.status(400).json({ message: 'Informe o nome do relator.' });
  }
  const processo = await processosRepo.getById(req.params.id);
  if (!processo) return res.status(404).json({ message: 'Processo não encontrado.' });

  const ativa = await camaraRelatoriasRepo.getAtiva(processo.id);
  if (ativa) await camaraRelatoriasRepo.substituir(ativa.id, req.body.motivoSubstituicao || 'Nova designação');

  const relatoria = await camaraRelatoriasRepo.create({
    processoId: processo.id, relatorId: req.body.relatorId || null, relatorNome: req.body.relatorNome,
    programaId: req.body.programaId || null,
    dataDesignacao: req.body.dataDesignacao || new Date().toISOString().slice(0, 10),
    prazoDevolucao: req.body.prazoDevolucao || null,
  }, req.user?.id);

  await processosRepo.update(processo.id, { status: 'RELATOR_DESIGNADO' }, req.user?.id);
  await eventosRepo.create({
    entidade: 'processo', entidadeId: processo.id, tipo: 'RELATORIA', data: relatoria.data_designacao,
    origemTipo: 'relatoria', origemId: relatoria.id, descricao: `Relator designado: ${req.body.relatorNome}`,
  }, req.user?.id);

  // Fase L.5 — e-mail de designação (o lembrete de prazo já existe desde a
  // Fase J; faltava só este disparo pontual no momento da designação).
  const emailRelator = await resolverEmail(relatoria.relator_id);
  if (emailRelator) {
    await enviarEmail({
      destinatarioEmail: emailRelator, tipo: 'RELATORIA_DESIGNADA', entidade: 'relatoria', entidadeId: relatoria.id,
      dados: { nome: relatoria.relator_nome, numeroProcesso: processo.numero, assunto: processo.assunto, prazoDevolucao: relatoria.prazo_devolucao || '—' },
    }, req.user?.id);
  }

  res.status(201).json(relatoria);
};

export const registrarDevolucaoRelatoria = async (req, res) => {
  const relatoria = await camaraRelatoriasRepo.registrarDevolucao(req.params.relatoriaId, {
    dataDevolucao: req.body.dataDevolucao || new Date().toISOString().slice(0, 10),
    resultadoParecer: req.body.resultadoParecer, parecerUrl: req.body.parecerUrl,
  });
  if (!relatoria) return res.status(404).json({ message: 'Relatoria não encontrada.' });
  await processosRepo.update(relatoria.processo_id, { status: 'PARECER_RECEBIDO' }, req.user?.id);
  await eventosRepo.create({
    entidade: 'processo', entidadeId: relatoria.processo_id, tipo: 'PARECER', data: relatoria.data_devolucao,
    origemTipo: 'relatoria', origemId: relatoria.id, descricao: `Parecer recebido: ${req.body.resultadoParecer || ''}`.trim(),
  }, req.user?.id);
  res.json(relatoria);
};

// ============================ Atos resultantes ============================
export const addAto = async (req, res) => {
  if (!isPlainObject(req.body) || !req.body.tipo) return res.status(400).json({ message: 'Informe o tipo do ato.' });
  const processo = await processosRepo.getById(req.params.id);
  if (!processo) return res.status(404).json({ message: 'Processo não encontrado.' });
  const ato = await camaraAtosRepo.create({
    id: 'camato-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    processoId: processo.id, tipo: req.body.tipo, numero: req.body.numero, ano: req.body.ano,
    data: req.body.data, ementa: req.body.ementa, link: req.body.link,
    resolucaoId: req.body.resolucaoId || null,
  }, req.user?.id);
  await eventosRepo.create({
    entidade: 'processo', entidadeId: processo.id, tipo: 'ATO', data: req.body.data || new Date().toISOString().slice(0, 10),
    descricao: `${req.body.tipo}${req.body.numero ? ' nº ' + req.body.numero : ''}${req.body.ano ? '/' + req.body.ano : ''}`,
  }, req.user?.id);
  res.status(201).json(ato);
};

// ============================ Exportação XLSX ==============================
export const exportXlsx = async (req, res) => {
  const XLSX = await import('xlsx');
  const { rows } = await query(`
    SELECT p.numero, p.assunto, p.tipo_materia, p.status, p.interessado,
      u.sigla AS unidade_responsavel, l.sigla AS localizacao, p.localizacao_em,
      pr.sigla AS programa, r.relator_nome, r.prazo_devolucao, p.data_entrada, p.data_encerramento,
      p.observacoes
    FROM processos p
    LEFT JOIN unidades u ON u.id = p.unidade_responsavel_id
    LEFT JOIN unidades l ON l.id = p.localizacao_id
    LEFT JOIN programas pr ON pr.id = p.programa_id
    LEFT JOIN LATERAL (
      SELECT relator_nome, prazo_devolucao FROM camara_relatorias
      WHERE processo_id = p.id AND ativa = TRUE ORDER BY criado_em DESC LIMIT 1
    ) r ON TRUE
    ORDER BY p.criado_em DESC
  `);
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Processos');
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="processos-camara.xlsx"');
  res.send(buffer);
};

// ============================ Indicadores (Fase K.2) ========================
// Ver requisitos-camara.md §11. Todos calculados na leitura — nenhum número
// fica desatualizado por esquecimento (mesmo princípio de derivarSituacao).
export const getIndicadores = async (req, res) => {
  const [backlog, carga, aging, reincidencia, tempoMedio] = await Promise.all([
    query(`
      SELECT COALESCE(u.sigla, 'Sem setor') AS setor, COUNT(*)::int AS total
      FROM processos p
      LEFT JOIN unidades u ON u.id = p.localizacao_id
      WHERE p.status != ALL($1::text[])
      GROUP BY u.sigla ORDER BY total DESC
    `, [STATUS_RESOLVIDOS]),
    query(`
      SELECT r.relator_nome AS relator, COUNT(*)::int AS total
      FROM camara_relatorias r
      WHERE r.ativa = TRUE AND r.data_devolucao IS NULL
      GROUP BY r.relator_nome ORDER BY total DESC LIMIT 10
    `),
    query(`
      SELECT COALESCE(AVG(CURRENT_DATE - p.localizacao_em), 0)::float AS media_dias
      FROM processos p WHERE p.status != ALL($1::text[]) AND p.localizacao_em IS NOT NULL
    `, [STATUS_RESOLVIDOS]),
    query(`
      SELECT COUNT(*)::int AS total FROM (
        SELECT p.id FROM processos p
        JOIN camara_pauta_itens pi ON pi.processo_id = p.id
        GROUP BY p.id HAVING COUNT(*) >= 3
      ) t
    `),
    query(`
      SELECT COALESCE(AVG(data_encerramento - data_entrada), 0)::float AS media_dias
      FROM processos WHERE status = ANY($1::text[]) AND data_encerramento IS NOT NULL
    `, [STATUS_RESOLVIDOS]),
  ]);
  const { rows: totalAtivos } = await query(`SELECT COUNT(*)::int AS n FROM processos WHERE status != ALL($1::text[])`, [STATUS_RESOLVIDOS]);

  res.json({
    processosAtivos: totalAtivos[0].n,
    backlogPorSetor: backlog.rows,
    cargaPorRelator: carga.rows,
    agingMedioDias: Math.round(aging.rows[0].media_dias),
    processosReincidentes: reincidencia.rows[0].total,
    tempoMedioResolucaoDias: Math.round(tempoMedio.rows[0].media_dias),
  });
};

// ============================ Artefatos finais (Fase L) ============================
const PUBLIC_SITE_URL = (process.env.PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/+$/, '');
const urlVerificacao = (codigo) => `${PUBLIC_SITE_URL}/verificar/${codigo}`;

// L.2 — espelho do processo com QR de verificação (mesmo padrão de A.9/C.7).
export const espelhoProcessoPdf = async (req, res) => {
  const processo = await processosRepo.getById(req.params.id);
  if (!(await assertAcessoProcesso(req, res, processo))) return;
  const eventos = await eventosRepo.listByEntidade('processo', processo.id);

  const declaracao = await emitir({
    tipo: 'espelho_processo', entidade: 'processo', entidadeId: processo.id, pessoaId: null,
    dados: { numero: processo.numero, assunto: processo.assunto, status: processo.status },
  }, req.user?.id);
  const linkVerificacao = urlVerificacao(declaracao.codigo);
  let qrBuffer = null;
  try { qrBuffer = await QRCode.toBuffer(linkVerificacao, { margin: 1, width: 180, errorCorrectionLevel: 'M' }); } catch { /* sem QR não impede a emissão */ }

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="espelho-${processo.numero}.pdf"`);
  gerarEspelhoProcessoPdf(res, processo, eventos, { qrBuffer, codigo: declaracao.codigo, linkVerificacao });
};

// L.3 — extrato de encaminhamento ao CEPE/SEG.
export const extratoEncaminhamentoPdf = async (req, res) => {
  const { rows } = await query(
    `SELECT * FROM processos WHERE status = 'ENCAMINHADO_INSTANCIA_SUPERIOR' ORDER BY criado_em DESC`
  );
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'inline; filename="extrato-encaminhamento.pdf"');
  gerarExtratoEncaminhamentoPdf(res, rows);
};

// L.5 — ofício de designação de relatoria (PDF).
export const oficioRelatoriaPdf = async (req, res) => {
  const { rows } = await query('SELECT * FROM camara_relatorias WHERE id = $1', [req.params.relatoriaId]);
  const relatoria = rows[0];
  if (!relatoria) return res.status(404).json({ message: 'Relatoria não encontrada.' });
  const processo = await processosRepo.getById(relatoria.processo_id);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="oficio-relatoria-${relatoria.id}.pdf"`);
  gerarOficioRelatoriaPdf(res, relatoria, processo);
};

// L.8 — relatório anual da Câmara.
export const relatorioAnualPdf = async (req, res) => {
  const ano = Number(req.query.ano) || new Date().getFullYear();
  const [recebidos, resolvidos, tempoMedio, porStatus] = await Promise.all([
    query(`SELECT COUNT(*)::int AS n FROM processos WHERE EXTRACT(YEAR FROM data_entrada) = $1`, [ano]),
    query(`SELECT COUNT(*)::int AS n FROM processos WHERE status = ANY($2::text[]) AND EXTRACT(YEAR FROM data_encerramento) = $1`, [ano, STATUS_RESOLVIDOS]),
    query(`SELECT COALESCE(AVG(data_encerramento - data_entrada), 0)::float AS media FROM processos WHERE status = ANY($2::text[]) AND EXTRACT(YEAR FROM data_encerramento) = $1`, [ano, STATUS_RESOLVIDOS]),
    query(`SELECT status, COUNT(*)::int AS total FROM processos WHERE EXTRACT(YEAR FROM data_entrada) = $1 GROUP BY status ORDER BY total DESC`, [ano]),
  ]);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="relatorio-anual-camara-${ano}.pdf"`);
  gerarRelatorioAnualCamaraPdf(res, ano, {
    recebidos: recebidos.rows[0].n, resolvidos: resolvidos.rows[0].n,
    tempoMedioResolucaoDias: Math.round(tempoMedio.rows[0].media), porStatus: porStatus.rows,
  });
};
