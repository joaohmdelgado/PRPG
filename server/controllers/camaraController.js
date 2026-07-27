// Módulo Câmara de Pós-Graduação — processos, unidades e atos.
// Ver requisitos-camara.md (raiz do projeto) para o levantamento completo.
// Reuniões e pauta ficam em camaraReunioesController.js.
import { isPlainObject } from '../utils/sanitize.js';
import { camaraProcessosRepo, camaraUnidadesRepo, camaraAtosRepo } from '../db/repositories.js';
import { camaraEventosRepo, camaraPautaItensRepo, camaraRelatoriasRepo } from '../db/camaraRepo.js';
import { query } from '../db/pool.js';
import { isProgramaScoped } from '../middleware/authMiddleware.js';

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
  res.json(await camaraUnidadesRepo.getAll());
};

const slugify = (s) => String(s || '')
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

export const createUnidade = async (req, res) => {
  if (!isPlainObject(req.body)) return res.status(400).json({ message: 'Dados inválidos.' });
  const data = { ...req.body };
  if (!data.sigla || !String(data.sigla).trim()) return res.status(400).json({ message: 'A sigla é obrigatória.' });
  if (!data.nome || !String(data.nome).trim()) return res.status(400).json({ message: 'O nome é obrigatório.' });
  if (!data.id) data.id = slugify(data.sigla) + '-' + Date.now().toString(36);
  try {
    res.status(201).json(await camaraUnidadesRepo.create(data));
  } catch (e) {
    res.status(500).json({ message: 'Erro ao criar unidade.', error: e.message });
  }
};

export const updateUnidade = async (req, res) => {
  if (!isPlainObject(req.body)) return res.status(400).json({ message: 'Dados inválidos.' });
  const updated = await camaraUnidadesRepo.update(req.params.id, req.body);
  if (updated) res.json(updated);
  else res.status(404).json({ message: 'Unidade não encontrada.' });
};

export const deleteUnidade = async (req, res) => {
  const ok = await camaraUnidadesRepo.remove(req.params.id);
  if (ok) res.json({ message: 'Unidade removida com sucesso.' });
  else res.status(404).json({ message: 'Unidade não encontrada.' });
};

// ============================ Validação do NUP =========================
// Formato do NUP (SIPAC/processo eletrônico): NNNNN.NNNNNN/AAAA-DD. É um
// AVISO, nunca um bloqueio — o acervo real já tem processos fora do padrão
// (ver requisitos-camara.md §1.3, §9.5). numero_valido=false não impede o
// cadastro nem a importação.
export const NUP_REGEX = /^\d{5}\.\d{6}\/\d{4}-\d{2}$/;
export const validarNumeroProcesso = (numero) => NUP_REGEX.test(String(numero || '').trim());

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
          AND r.prazo_devolucao < to_char(CURRENT_DATE, 'YYYY-MM-DD')) AS atrasado
      FROM camara_processos p
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
       JOIN camara_processos p ON p.id = r.processo_id
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
  const processo = await camaraProcessosRepo.getById(req.params.id);
  if (!(await assertAcessoProcesso(req, res, processo))) return;
  const [eventos, relatorias, pautas, atos] = await Promise.all([
    camaraEventosRepo.listByProcesso(processo.id),
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
    const created = await camaraProcessosRepo.create(data, req.user?.id);
    if (data.localizacaoId) {
      await camaraEventosRepo.create({
        processoId: created.id, tipo: 'TRAMITACAO', data: data.dataEntrada,
        unidadeId: data.localizacaoId, descricao: 'Entrada na secretaria da Câmara.',
      }, req.user?.id);
    }
    res.status(201).json(created);
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ message: 'Já existe um processo cadastrado com este número.' });
    res.status(500).json({ message: 'Erro ao criar processo.', error: e.message });
  }
};

export const updateProcesso = async (req, res) => {
  if (!isPlainObject(req.body)) return res.status(400).json({ message: 'Dados inválidos.' });
  const existing = await camaraProcessosRepo.getById(req.params.id);
  if (!(await assertAcessoProcesso(req, res, existing))) return;
  const data = { ...req.body };
  if (data.numero) data.numeroValido = validarNumeroProcesso(data.numero);
  if (isProgramaScoped(req.user)) delete data.programaId; // gestor não migra processo de programa
  try {
    const updated = await camaraProcessosRepo.update(req.params.id, data, req.user?.id);
    res.json(updated);
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ message: 'Já existe um processo cadastrado com este número.' });
    res.status(500).json({ message: 'Erro ao atualizar processo.', error: e.message });
  }
};

// Troca rápida de status (badge da lista) — gera evento na linha do tempo.
export const patchStatus = async (req, res) => {
  if (!isPlainObject(req.body) || !req.body.status) return res.status(400).json({ message: 'Informe o novo status.' });
  const existing = await camaraProcessosRepo.getById(req.params.id);
  if (!existing) return res.status(404).json({ message: 'Processo não encontrado.' });
  const { status, motivo } = req.body;
  const updated = await camaraProcessosRepo.update(req.params.id, {
    status, statusMotivo: motivo || null,
    dataEncerramento: STATUS_RESOLVIDOS.includes(status) ? (existing.dataEncerramento || new Date().toISOString().slice(0, 10)) : existing.dataEncerramento,
  }, req.user?.id);
  await camaraEventosRepo.create({
    processoId: req.params.id, tipo: 'STATUS', data: new Date().toISOString().slice(0, 10),
    descricao: motivo ? `Status alterado para ${status} — ${motivo}` : `Status alterado para ${status}`,
  }, req.user?.id);
  res.json(updated);
};

// Troca de localização — inline na lista/ficha. Gera evento de tramitação e
// atualiza o cache localizacao_id/localizacao_em em camara_processos.
export const patchLocalizacao = async (req, res) => {
  if (!isPlainObject(req.body) || !req.body.unidadeId) return res.status(400).json({ message: 'Informe a unidade de destino.' });
  const existing = await camaraProcessosRepo.getById(req.params.id);
  if (!existing) return res.status(404).json({ message: 'Processo não encontrado.' });
  const dataEvento = req.body.data || new Date().toISOString().slice(0, 10);
  const updated = await camaraProcessosRepo.update(req.params.id, {
    localizacaoId: req.body.unidadeId, localizacaoEm: dataEvento,
  }, req.user?.id);
  await camaraEventosRepo.create({
    processoId: req.params.id, tipo: 'TRAMITACAO', data: dataEvento,
    unidadeId: req.body.unidadeId, descricao: req.body.descricao || null,
  }, req.user?.id);
  res.json(updated);
};

export const deleteProcesso = async (req, res) => {
  const ok = await camaraProcessosRepo.remove(req.params.id);
  if (ok) res.json({ message: 'Processo removido com sucesso.' });
  else res.status(404).json({ message: 'Processo não encontrado.' });
};

// ============================ Eventos (linha do tempo) ===================
export const addEvento = async (req, res) => {
  if (!isPlainObject(req.body) || !req.body.tipo || !req.body.descricao) {
    return res.status(400).json({ message: 'Informe o tipo e a descrição do evento.' });
  }
  const processo = await camaraProcessosRepo.getById(req.params.id);
  if (!processo) return res.status(404).json({ message: 'Processo não encontrado.' });
  const evento = await camaraEventosRepo.create({
    processoId: req.params.id, tipo: req.body.tipo,
    data: req.body.data || new Date().toISOString().slice(0, 10),
    descricao: req.body.descricao, unidadeId: req.body.unidadeId || null,
    anexoUrl: req.body.anexoUrl || null,
  }, req.user?.id);
  res.status(201).json(evento);
};

// ============================ Relatorias ==================================
export const addRelatoria = async (req, res) => {
  if (!isPlainObject(req.body) || !req.body.relatorNome) {
    return res.status(400).json({ message: 'Informe o nome do relator.' });
  }
  const processo = await camaraProcessosRepo.getById(req.params.id);
  if (!processo) return res.status(404).json({ message: 'Processo não encontrado.' });

  const ativa = await camaraRelatoriasRepo.getAtiva(processo.id);
  if (ativa) await camaraRelatoriasRepo.substituir(ativa.id, req.body.motivoSubstituicao || 'Nova designação');

  const relatoria = await camaraRelatoriasRepo.create({
    processoId: processo.id, relatorId: req.body.relatorId || null, relatorNome: req.body.relatorNome,
    programaId: req.body.programaId || null,
    dataDesignacao: req.body.dataDesignacao || new Date().toISOString().slice(0, 10),
    prazoDevolucao: req.body.prazoDevolucao || null,
  }, req.user?.id);

  await camaraProcessosRepo.update(processo.id, { status: 'RELATOR_DESIGNADO' }, req.user?.id);
  await camaraEventosRepo.create({
    processoId: processo.id, tipo: 'RELATORIA', data: relatoria.data_designacao,
    relatoriaId: relatoria.id, descricao: `Relator designado: ${req.body.relatorNome}`,
  }, req.user?.id);
  res.status(201).json(relatoria);
};

export const registrarDevolucaoRelatoria = async (req, res) => {
  const relatoria = await camaraRelatoriasRepo.registrarDevolucao(req.params.relatoriaId, {
    dataDevolucao: req.body.dataDevolucao || new Date().toISOString().slice(0, 10),
    resultadoParecer: req.body.resultadoParecer, parecerUrl: req.body.parecerUrl,
  });
  if (!relatoria) return res.status(404).json({ message: 'Relatoria não encontrada.' });
  await camaraProcessosRepo.update(relatoria.processo_id, { status: 'PARECER_RECEBIDO' }, req.user?.id);
  await camaraEventosRepo.create({
    processoId: relatoria.processo_id, tipo: 'PARECER', data: relatoria.data_devolucao,
    relatoriaId: relatoria.id, descricao: `Parecer recebido: ${req.body.resultadoParecer || ''}`.trim(),
  }, req.user?.id);
  res.json(relatoria);
};

// ============================ Atos resultantes ============================
export const addAto = async (req, res) => {
  if (!isPlainObject(req.body) || !req.body.tipo) return res.status(400).json({ message: 'Informe o tipo do ato.' });
  const processo = await camaraProcessosRepo.getById(req.params.id);
  if (!processo) return res.status(404).json({ message: 'Processo não encontrado.' });
  const ato = await camaraAtosRepo.create({
    id: 'camato-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    processoId: processo.id, tipo: req.body.tipo, numero: req.body.numero, ano: req.body.ano,
    data: req.body.data, ementa: req.body.ementa, link: req.body.link,
    resolucaoId: req.body.resolucaoId || null,
  }, req.user?.id);
  await camaraEventosRepo.create({
    processoId: processo.id, tipo: 'ATO', data: req.body.data || new Date().toISOString().slice(0, 10),
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
    FROM camara_processos p
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
