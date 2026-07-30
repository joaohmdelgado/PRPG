// Fase L (Acabamento documental, PLANO.md): artefatos em PDF do módulo PNPD
// que não são declaração/certificado (esses já ficam em posDoutoradoController,
// reaproveitando o serviço de declarações da A.9).
import PDFDocument from 'pdfkit';

const cabecalho = (doc, subtitulo) => {
  doc.fontSize(11).font('Helvetica-Bold')
    .text('UNIVERSIDADE FEDERAL RURAL DE PERNAMBUCO', { align: 'center' })
    .text('PRÓ-REITORIA DE PÓS-GRADUAÇÃO - PRPG', { align: 'center' });
  doc.moveDown(1.2);
  doc.fontSize(16).font('Helvetica-Bold').text(subtitulo, { align: 'center' });
  doc.moveDown(1.5);
};

const rodape = (doc) => {
  doc.moveDown(2);
  doc.fontSize(8).font('Helvetica').fillColor('#666')
    .text('Controle interno da Pró-Reitoria de Pós-Graduação — os autos oficiais tramitam no SIPAC.', { align: 'center' });
};

// L.6 — ofício de cobrança de relatório final.
export const gerarOficioCobrancaPdf = (res, pd) => {
  const doc = new PDFDocument({ size: 'A4', margins: { top: 56, bottom: 56, left: 72, right: 72 } });
  doc.pipe(res);
  cabecalho(doc, 'OFÍCIO DE COBRANÇA — RELATÓRIO FINAL');
  const dataFimFmt = pd.dataFim ? new Date(`${pd.dataFim}T00:00:00`).toLocaleDateString('pt-BR') : '—';
  doc.fontSize(11).font('Helvetica').text(
    `O estágio pós-doutoral de ${pd.nome}${pd.programaNome ? `, no programa ${pd.programaNome},` : ''} `
    + `encerrado em ${dataFimFmt}, ainda não tem relatório final registrado. Solicitamos a entrega no menor prazo possível.`,
    { align: 'justify' }
  );
  rodape(doc);
  doc.end();
};

// L.7 — relação de pós-doutorandos vigentes por programa.
export const gerarRelacaoVigentesPdf = (res, { programaLabel, lista }) => {
  const doc = new PDFDocument({ size: 'A4', margins: { top: 56, bottom: 56, left: 56, right: 56 } });
  doc.pipe(res);
  cabecalho(doc, 'RELAÇÃO DE PÓS-DOUTORANDOS VIGENTES');
  if (programaLabel) doc.fontSize(11).font('Helvetica-Bold').text(programaLabel, { align: 'center' }).moveDown(1);
  if (!lista.length) doc.fontSize(11).font('Helvetica-Oblique').text('Nenhum estágio vigente encontrado.');
  lista.forEach((p, i) => {
    doc.fontSize(11).font('Helvetica-Bold').text(`${i + 1}. ${p.nome}`);
    doc.fontSize(10).font('Helvetica').text(
      `Supervisor: ${p.supervisorNome || '—'} · Projeto: ${p.projetoTitulo} · `
      + `Período: ${p.dataInicio || '?'} – ${p.dataFim || '?'}`, { indent: 14 }
    );
    doc.moveDown(0.5);
  });
  rodape(doc);
  doc.end();
};

// L.8 (metade PNPD) — relatório anual.
export const gerarRelatorioAnualPosdocPdf = (res, ano, stats) => {
  const doc = new PDFDocument({ size: 'A4', margins: { top: 56, bottom: 56, left: 56, right: 56 } });
  doc.pipe(res);
  cabecalho(doc, `RELATÓRIO ANUAL DO PNPD — ${ano}`);
  doc.fontSize(11).font('Helvetica');
  doc.text(`Estágios iniciados no ano: ${stats.iniciados}`);
  doc.text(`Estágios encerrados no ano: ${stats.encerrados}`);
  doc.text(`Duração média (meses): ${stats.duracaoMediaMeses}`);
  doc.moveDown(1);
  doc.fontSize(12).font('Helvetica-Bold').text('Por programa:');
  stats.porPrograma.forEach((p) => doc.fontSize(10).font('Helvetica').text(`${p.programa}: ${p.total}`));
  rodape(doc);
  doc.end();
};
