// Módulo PNPD — estágio pós-doutoral voluntário (Fase C, PLANO.md). Ver
// requisitos-pnpd.md para o levantamento completo; arquitetura-dados.md §5.12
// para o modelo vigente (pos_doutorados é extensão de um vínculo).
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import { isPlainObject } from '../utils/sanitize.js';
import { posDoutoradoRepo, resolverOuCriarPessoa } from '../db/posDoutoradoRepo.js';
import { processosRepo } from '../db/repositories.js';
import { eventosRepo } from '../db/eventosRepo.js';
import { emitir } from '../services/declaracoes.js';
import { isProgramaScoped } from '../middleware/authMiddleware.js';
import { validarNumeroProcesso } from '../utils/nup.js';
import { gerarOficioCobrancaPdf, gerarRelacaoVigentesPdf, gerarRelatorioAnualPosdocPdf } from '../services/posdocPdf.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ASSETS_DIR = path.join(__dirname, '../assets');
const PUBLIC_SITE_URL = (process.env.PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/+$/, '');
const urlVerificacao = (codigo) => `${PUBLIC_SITE_URL}/verificar/${codigo}`;

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const dataPorExtenso = (iso) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''));
  if (!m) return '';
  return `${Number(m[3])} de ${MESES[Number(m[2]) - 1]} de ${m[1]}`;
};

const mascararCpf = (cpf) => {
  const d = String(cpf || '').replace(/\D/g, '');
  if (d.length !== 11) return null;
  return `***.${d.slice(3, 6)}.${d.slice(6, 9)}-**`;
};

const assertAcesso = (req, res, pd) => {
  if (!pd) { res.status(404).json({ message: 'Registro não encontrado.' }); return false; }
  if (isProgramaScoped(req.user) && (pd.programaId ?? null) !== req.user.programaId) {
    res.status(403).json({ message: 'Você não tem acesso a este registro.' });
    return false;
  }
  return true;
};

export const getPosDoutorados = async (req, res) => {
  const filtros = { ...req.query };
  if (isProgramaScoped(req.user)) {
    if (!req.user.programaId) return res.status(403).json({ message: 'Gestor sem programa vinculado.' });
    filtros.programa = req.user.programaId;
  }
  const lista = await posDoutoradoRepo.getAll(filtros);
  const { situacao, vencendo, semRelatorio } = req.query;
  let filtrada = lista;
  if (situacao) filtrada = filtrada.filter((p) => p.situacao === situacao);
  if (vencendo === 'true' || vencendo === '1') filtrada = filtrada.filter((p) => p.vencendo);
  if (semRelatorio === 'true' || semRelatorio === '1') filtrada = filtrada.filter((p) => p.relatorioPendente);
  // CPF completo só na ficha (LGPD) — na listagem, sempre mascarado.
  res.json(filtrada.map((p) => ({ ...p, cpf: mascararCpf(p.cpf) })));
};

export const getPosDoutoradoById = async (req, res) => {
  const pd = await posDoutoradoRepo.getById(req.params.id);
  if (!assertAcesso(req, res, pd)) return;
  const [eventosProprios, eventosProcesso] = await Promise.all([
    eventosRepo.listByEntidade('pos_doutorado', pd.id),
    pd.processoId ? eventosRepo.listByEntidade('processo', pd.processoId) : Promise.resolve([]),
  ]);
  const eventos = [
    ...eventosProprios.map((e) => ({ ...e, origem: 'estagio' })),
    ...eventosProcesso.map((e) => ({ ...e, origem: 'processo' })),
  ].sort((a, b) => new Date(b.data) - new Date(a.data));
  res.json({ ...pd, eventos });
};

export const createPosDoutorado = async (req, res) => {
  if (!isPlainObject(req.body)) return res.status(400).json({ message: 'Dados inválidos.' });
  const body = req.body;
  if (!body.projetoTitulo?.trim()) return res.status(400).json({ message: 'Informe o título do projeto.' });
  if (!body.pessoaId && !body.pessoaNome?.trim()) return res.status(400).json({ message: 'Informe a pessoa (selecione ou cadastre pelo nome).' });
  if (!body.supervisorId && !body.supervisorNome?.trim()) return res.status(400).json({ message: 'Informe o supervisor (selecione ou cadastre pelo nome).' });

  const pessoaId = await resolverOuCriarPessoa({
    pessoaId: body.pessoaId, nome: body.pessoaNome, cpf: body.cpf, email: body.email, telefone: body.telefone,
  });
  const supervisorId = await resolverOuCriarPessoa({ pessoaId: body.supervisorId, nome: body.supervisorNome });
  const cossupervisorId = body.cossupervisorId || body.cossupervisorNome
    ? await resolverOuCriarPessoa({ pessoaId: body.cossupervisorId, nome: body.cossupervisorNome })
    : null;

  if (isProgramaScoped(req.user)) body.programaId = req.user.programaId;

  try {
    const pd = await posDoutoradoRepo.create({
      pessoaId, supervisorId, cossupervisorId,
      programaId: body.programaId || null, dataInicio: body.dataInicio || null, dataFim: body.dataFim || null,
      dataInicioAprox: body.dataInicioAprox, dataFimAprox: body.dataFimAprox,
      projetoTitulo: body.projetoTitulo, projetoResumo: body.projetoResumo,
      linhaPesquisaId: body.linhaPesquisaId || null, modalidade: body.modalidade || 'VOLUNTARIO',
      agenciaFomento: body.agenciaFomento, vinculoOrigem: body.vinculoOrigem, instituicaoOrigem: body.instituicaoOrigem,
      processoId: body.processoId || null, observacoes: body.observacoes,
    }, req.user?.id);
    await eventosRepo.create({
      entidade: 'pos_doutorado', entidadeId: pd.id, tipo: 'SITUACAO',
      data: new Date().toISOString().slice(0, 10), descricao: 'Estágio pós-doutoral cadastrado.',
    }, req.user?.id);
    res.status(201).json(pd);
  } catch (e) {
    res.status(500).json({ message: 'Erro ao cadastrar o estágio pós-doutoral.', error: e.message });
  }
};

export const updatePosDoutorado = async (req, res) => {
  if (!isPlainObject(req.body)) return res.status(400).json({ message: 'Dados inválidos.' });
  const existing = await posDoutoradoRepo.getById(req.params.id);
  if (!assertAcesso(req, res, existing)) return;
  const data = { ...req.body };
  if (isProgramaScoped(req.user)) delete data.programaId;
  const updated = await posDoutoradoRepo.update(req.params.id, data, req.user?.id);
  res.json(updated);
};

// Override manual de situação (§6.2): EM_ANALISE|INTERROMPIDO|INDEFERIDO|CANCELADO,
// ou null para voltar à derivação automática pelas datas.
export const patchSituacao = async (req, res) => {
  if (!isPlainObject(req.body)) return res.status(400).json({ message: 'Dados inválidos.' });
  const existing = await posDoutoradoRepo.getById(req.params.id);
  if (!assertAcesso(req, res, existing)) return;
  const { situacaoManual, motivo } = req.body;
  const updated = await posDoutoradoRepo.setSituacaoManual(req.params.id, situacaoManual || null, req.user?.id);
  await eventosRepo.create({
    entidade: 'pos_doutorado', entidadeId: req.params.id, tipo: 'SITUACAO',
    data: new Date().toISOString().slice(0, 10),
    descricao: situacaoManual ? `Situação alterada manualmente para ${situacaoManual}${motivo ? ' — ' + motivo : ''}` : 'Situação manual removida; volta a ser derivada das datas.',
  }, req.user?.id);
  res.json(updated);
};

export const registrarRelatorio = async (req, res) => {
  const existing = await posDoutoradoRepo.getById(req.params.id);
  if (!assertAcesso(req, res, existing)) return;
  const dataEntrega = req.body?.dataEntrega || new Date().toISOString().slice(0, 10);
  const updated = await posDoutoradoRepo.registrarRelatorio(req.params.id, dataEntrega, req.user?.id);
  await eventosRepo.create({
    entidade: 'pos_doutorado', entidadeId: req.params.id, tipo: 'RELATORIO', data: dataEntrega,
    descricao: 'Relatório final entregue.',
  }, req.user?.id);
  res.json(updated);
};

// Prorrogar/renovar (§10.2): registro-filho encadeado; o original não é alterado.
export const prorrogar = async (req, res) => {
  if (!isPlainObject(req.body) || !req.body.dataInicio || !req.body.dataFim) {
    return res.status(400).json({ message: 'Informe o início e o fim do novo período.' });
  }
  const existing = await posDoutoradoRepo.getById(req.params.id);
  if (!assertAcesso(req, res, existing)) return;
  const novo = await posDoutoradoRepo.prorrogar(req.params.id, { dataInicio: req.body.dataInicio, dataFim: req.body.dataFim }, req.user?.id);
  await Promise.all([
    eventosRepo.create({
      entidade: 'pos_doutorado', entidadeId: existing.id, tipo: 'PRORROGACAO', data: req.body.dataInicio,
      descricao: `Estágio prorrogado/renovado — novo registro a partir de ${req.body.dataInicio}.`,
    }, req.user?.id),
    eventosRepo.create({
      entidade: 'pos_doutorado', entidadeId: novo.id, tipo: 'PRORROGACAO', data: req.body.dataInicio,
      descricao: `Prorrogação/renovação do estágio anterior (${existing.dataInicio || '?'} – ${existing.dataFim || '?'}).`,
    }, req.user?.id),
  ]);
  res.status(201).json(novo);
};

export const linkProcesso = async (req, res) => {
  if (!isPlainObject(req.body) || !req.body.numero) return res.status(400).json({ message: 'Informe o número do processo (NUP).' });
  const existing = await posDoutoradoRepo.getById(req.params.id);
  if (!assertAcesso(req, res, existing)) return;
  const numero = String(req.body.numero).trim();
  let processo = (await processosRepo.getAll()).find((p) => p.numero === numero);
  if (!processo) {
    processo = await processosRepo.create({
      id: 'proc-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      numero, numeroValido: validarNumeroProcesso(numero),
      assunto: `Pós-doutorado: ${existing.projetoTitulo}`,
      dataEntrada: new Date().toISOString().slice(0, 10), status: 'RECEBIDO',
    }, req.user?.id);
  }
  const updated = await posDoutoradoRepo.update(req.params.id, { processoId: processo.id }, req.user?.id);
  await eventosRepo.create({
    entidade: 'pos_doutorado', entidadeId: req.params.id, tipo: 'PROCESSO', data: new Date().toISOString().slice(0, 10),
    descricao: `Vinculado ao processo ${processo.numero}.`,
  }, req.user?.id);
  res.json(updated);
};

export const deletePosDoutorado = async (req, res) => {
  const ok = await posDoutoradoRepo.remove(req.params.id);
  if (ok) res.json({ message: 'Registro removido com sucesso.' });
  else res.status(404).json({ message: 'Registro não encontrado.' });
};

// Declaração de vínculo (§11) — mesmo padrão da proficiência (Fase A.9/B.2):
// código de verificação e data de emissão congelados na 1ª emissão.
// Certificado de conclusão NÃO implementado: depende de D-C7 (quem assina).
export const gerarDeclaracao = async (req, res) => {
  const pd = await posDoutoradoRepo.getById(req.params.id);
  if (!assertAcesso(req, res, pd)) return;
  if (!pd.nome) return res.status(400).json({ message: 'Pós-doutorando sem pessoa cadastrada.' });

  const declaracao = await emitir({
    tipo: 'posdoc_vinculo', entidade: 'pos_doutorado', entidadeId: pd.id, pessoaId: pd.pessoaId,
    dados: {
      nome: pd.nome, cpf: pd.cpf, programa: pd.programaNome, supervisor: pd.supervisorNome,
      projeto: pd.projetoTitulo, dataInicio: pd.dataInicio, dataFim: pd.dataFim, situacao: pd.situacao,
    },
  }, req.user?.id);

  const codigo = declaracao.codigo;
  const dataEmissao = dataPorExtenso(new Date(declaracao.emitidaEm).toISOString().slice(0, 10));
  const linkVerificacao = urlVerificacao(codigo);
  let qrBuffer = null;
  try {
    qrBuffer = await QRCode.toBuffer(linkVerificacao, { margin: 1, width: 180, errorCorrectionLevel: 'M' });
  } catch { /* sem QR não impede a emissão */ }

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="declaracao-posdoc-${pd.id}.pdf"`);

  const doc = new PDFDocument({ size: 'A4', margins: { top: 56, bottom: 56, left: 72, right: 72 } });
  doc.pipe(res);

  const brasao = path.join(ASSETS_DIR, 'brasao-republica.png');
  if (existsSync(brasao)) {
    doc.image(brasao, doc.page.width / 2 - 40, doc.y, { width: 80 });
    doc.moveDown(0.5);
    doc.y += 48;
  }
  doc.fontSize(11).font('Helvetica-Bold')
    .text('UNIVERSIDADE FEDERAL RURAL DE PERNAMBUCO', { align: 'center' })
    .text('PRÓ-REITORIA DE PÓS-GRADUAÇÃO - PRPG', { align: 'center' });
  doc.moveDown(4);
  doc.fontSize(20).font('Helvetica-Bold').text('DECLARAÇÃO', { align: 'center' });
  doc.moveDown(1.5);

  doc.fontSize(12).font('Helvetica');
  doc.text('Declaramos, para os devidos fins, que ', { align: 'justify', lineGap: 8, continued: true })
    .fontSize(16).font('Helvetica-Bold').text(pd.nome, { lineGap: 8, continued: true })
    .fontSize(12).font('Helvetica').text(pd.cpf ? `, CPF nº ${pd.cpf}` : '', { continued: true })
    .text(` realiza estágio pós-doutoral${pd.programaNome ? ` no Programa de Pós-Graduação em ${pd.programaNome}` : ''}`, { continued: true })
    .text(pd.supervisorNome ? `, sob supervisão de ${pd.supervisorNome}` : '', { continued: true })
    .text(`, com o projeto "${pd.projetoTitulo}"`, { continued: true })
    .text(pd.dataInicio ? `, no período de ${dataPorExtenso(pd.dataInicio)} a ${pd.dataFim ? dataPorExtenso(pd.dataFim) : 'data não informada'}` : '', { continued: true })
    .text('.', { align: 'justify', lineGap: 8 });

  doc.moveDown(3);
  doc.fontSize(11).text(`Recife, ${dataEmissao}.`, { align: 'center' });
  doc.moveDown(2);

  if (qrBuffer) {
    const qrSize = 90;
    doc.image(qrBuffer, doc.page.width / 2 - qrSize / 2, doc.y, { width: qrSize });
    doc.moveDown(6);
  }
  doc.fontSize(8).fillColor('#666')
    .text(`Código de verificação: ${codigo}`, { align: 'center' })
    .text(linkVerificacao, { align: 'center' })
    .moveDown(1)
    .text('Controle interno da Pró-Reitoria de Pós-Graduação — os autos oficiais tramitam no SIPAC.', { align: 'center' });

  doc.end();
};

// ============================ Indicadores (Fase K.3) ========================
// Ver requisitos-pnpd.md §12. Concentração por supervisor e qualidade do
// cadastro dão à secretaria um alvo mensurável de saneamento (§12, nota).
export const getIndicadores = async (req, res) => {
  const lista = await posDoutoradoRepo.getAll();

  const vigentes = lista.filter((p) => p.situacao === 'VIGENTE');
  const relatoriosPendentes = lista.filter((p) => p.relatorioPendente);
  const vencendo = lista.filter((p) => p.vencendo);

  const encerrados = lista.filter((p) => ['ENCERRADO', 'ENCERRADO_SEM_RELATORIO'].includes(p.situacao) && p.dataInicio && p.dataFim);
  const duracaoMeses = encerrados.map((p) => (new Date(p.dataFim) - new Date(p.dataInicio)) / (30.44 * 86400000));
  const duracaoMediaMeses = duracaoMeses.length ? duracaoMeses.reduce((a, b) => a + b, 0) / duracaoMeses.length : 0;

  const porSupervisor = new Map();
  for (const p of lista) {
    if (!p.supervisorNome) continue;
    porSupervisor.set(p.supervisorNome, (porSupervisor.get(p.supervisorNome) || 0) + 1);
  }
  const concentracaoPorSupervisor = [...porSupervisor.entries()]
    .map(([supervisor, total]) => ({ supervisor, total }))
    .sort((a, b) => b.total - a.total).slice(0, 10);

  const total = lista.length || 1;
  const qualidadeCadastro = {
    semCpf: Math.round((lista.filter((p) => !p.cpf).length / total) * 100),
    semPeriodo: Math.round((lista.filter((p) => !p.dataInicio || !p.dataFim).length / total) * 100),
    semProcesso: Math.round((lista.filter((p) => !p.processoId).length / total) * 100),
    semPrograma: Math.round((lista.filter((p) => !p.programaId).length / total) * 100),
  };

  res.json({
    total: lista.length, vigentes: vigentes.length, relatoriosPendentes: relatoriosPendentes.length,
    vencendo: vencendo.length, duracaoMediaMeses: Math.round(duracaoMediaMeses * 10) / 10,
    concentracaoPorSupervisor, qualidadeCadastro,
  });
};

export const exportXlsx = async (req, res) => {
  const XLSX = await import('xlsx');
  const filtros = { ...req.query };
  if (isProgramaScoped(req.user)) filtros.programa = req.user.programaId;
  const lista = await posDoutoradoRepo.getAll(filtros);
  const rows = lista.map((p) => ({
    Nome: p.nome, CPF: mascararCpf(p.cpf), Programa: p.programaSigla, Supervisor: p.supervisorNome,
    Projeto: p.projetoTitulo, Modalidade: p.modalidade, Situacao: p.situacao,
    Inicio: p.dataInicio, Fim: p.dataFim, Processo: p.processoNumero,
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'PosDoutorado');
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="pos-doutorado.xlsx"');
  res.send(buffer);
};

// ============================ Extrato Sucupira (Fase K.6) ===================
// Ver requisitos-pnpd.md §11. Pós-docs por programa e período — o dado já é
// coletado pela PRPG; este extrato evita que o programa refaça a contagem
// para a Coleta CAPES/Sucupira.
export const exportSucupira = async (req, res) => {
  const XLSX = await import('xlsx');
  const filtros = { ...req.query };
  if (isProgramaScoped(req.user)) filtros.programa = req.user.programaId;
  const lista = await posDoutoradoRepo.getAll(filtros);
  const porPrograma = new Map();
  for (const p of lista) {
    const chave = p.programaSigla || p.programaNome || 'Sem programa';
    if (!porPrograma.has(chave)) porPrograma.set(chave, { Programa: chave, Vigentes: 0, Encerrados: 0, Total: 0 });
    const linha = porPrograma.get(chave);
    linha.Total += 1;
    if (p.situacao === 'VIGENTE') linha.Vigentes += 1;
    else if (['ENCERRADO', 'ENCERRADO_SEM_RELATORIO'].includes(p.situacao)) linha.Encerrados += 1;
  }
  const ws = XLSX.utils.json_to_sheet([...porPrograma.values()].sort((a, b) => b.Total - a.Total));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sucupira');
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="pos-doutorado-sucupira.xlsx"');
  res.send(buffer);
};

// ============================ Artefatos finais (Fase L) ============================

// L.6 — ofício de cobrança de relatório final.
export const oficioCobrancaPdf = async (req, res) => {
  const pd = await posDoutoradoRepo.getById(req.params.id);
  if (!assertAcesso(req, res, pd)) return;
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="oficio-cobranca-${pd.id}.pdf"`);
  gerarOficioCobrancaPdf(res, pd);
};

// L.7 — relação de pós-doutorandos vigentes por programa.
export const relacaoVigentesPdf = async (req, res) => {
  const filtros = { ...req.query, situacao: undefined };
  if (isProgramaScoped(req.user)) filtros.programa = req.user.programaId;
  const lista = (await posDoutoradoRepo.getAll(filtros)).filter((p) => p.situacao === 'VIGENTE');
  const programaLabel = lista[0]?.programaNome || (req.query.programa ? req.query.programa : null);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'inline; filename="relacao-vigentes.pdf"');
  gerarRelacaoVigentesPdf(res, { programaLabel, lista });
};

// L.8 — relatório anual do PNPD.
export const relatorioAnualPdf = async (req, res) => {
  const ano = Number(req.query.ano) || new Date().getFullYear();
  const lista = await posDoutoradoRepo.getAll();
  const iniciados = lista.filter((p) => p.dataInicio?.startsWith(String(ano))).length;
  const encerradosNoAno = lista.filter((p) => p.dataFim?.startsWith(String(ano)) && ['ENCERRADO', 'ENCERRADO_SEM_RELATORIO'].includes(p.situacao));
  const duracoes = encerradosNoAno.filter((p) => p.dataInicio && p.dataFim)
    .map((p) => (new Date(p.dataFim) - new Date(p.dataInicio)) / (30.44 * 86400000));
  const duracaoMediaMeses = duracoes.length ? Math.round((duracoes.reduce((a, b) => a + b, 0) / duracoes.length) * 10) / 10 : 0;
  const porPrograma = new Map();
  for (const p of lista) {
    const chave = p.programaSigla || p.programaNome || 'Sem programa';
    porPrograma.set(chave, (porPrograma.get(chave) || 0) + 1);
  }
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="relatorio-anual-posdoc-${ano}.pdf"`);
  gerarRelatorioAnualPosdocPdf(res, ano, {
    iniciados, encerrados: encerradosNoAno.length, duracaoMediaMeses,
    porPrograma: [...porPrograma.entries()].map(([programa, total]) => ({ programa, total })).sort((a, b) => b.total - a.total),
  });
};
