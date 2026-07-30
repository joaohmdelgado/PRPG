// Geração da pauta da reunião em PDF (ver requisitos-camara.md §10).
// Controle interno da secretaria — nunca substitui os autos do SIPAC.
import PDFDocument from 'pdfkit';

export const gerarPautaPdf = (res, reuniao, itens) => {
  const doc = new PDFDocument({ size: 'A4', margins: { top: 56, bottom: 56, left: 56, right: 56 } });
  doc.pipe(res);

  doc.fontSize(11).font('Helvetica-Bold')
    .text('UNIVERSIDADE FEDERAL RURAL DE PERNAMBUCO', { align: 'center' })
    .text('PRÓ-REITORIA DE PÓS-GRADUAÇÃO — CÂMARA DE PÓS-GRADUAÇÃO', { align: 'center' });
  doc.moveDown(1.2);
  doc.fontSize(16).font('Helvetica-Bold').text('PAUTA DA REUNIÃO', { align: 'center' });
  const dataFmt = reuniao.data ? new Date(`${reuniao.data}T00:00:00`).toLocaleDateString('pt-BR') : '';
  doc.fontSize(11).font('Helvetica')
    .text(`${reuniao.numero ? reuniao.numero + ' — ' : ''}${dataFmt}${reuniao.hora ? ' às ' + reuniao.hora : ''}${reuniao.local ? ' — ' + reuniao.local : ''}`, { align: 'center' });
  doc.moveDown(1.5);

  if (!itens.length) {
    doc.fontSize(11).font('Helvetica-Oblique').text('Nenhum processo pautado até o momento.');
  }

  itens.forEach((item, i) => {
    doc.fontSize(11).font('Helvetica-Bold').text(`${i + 1}. ${item.numero || ''}`, { continued: false });
    doc.fontSize(10).font('Helvetica').text(item.assunto || '', { indent: 14 });
    if (item.bloco) doc.fontSize(9).font('Helvetica-Oblique').fillColor('#555').text(item.bloco, { indent: 14 }).fillColor('black');
    doc.moveDown(0.8);
  });

  doc.moveDown(2);
  doc.fontSize(8).font('Helvetica').fillColor('#666')
    .text('Controle interno da Secretaria da Câmara de Pós-Graduação — os autos oficiais tramitam no SIPAC.', { align: 'center' });

  doc.end();
};

const rodape = (doc, texto) => {
  doc.moveDown(2);
  doc.fontSize(8).font('Helvetica').fillColor('#666').text(texto, { align: 'center' });
};

const cabecalho = (doc, subtitulo) => {
  doc.fontSize(11).font('Helvetica-Bold')
    .text('UNIVERSIDADE FEDERAL RURAL DE PERNAMBUCO', { align: 'center' })
    .text('PRÓ-REITORIA DE PÓS-GRADUAÇÃO — CÂMARA DE PÓS-GRADUAÇÃO', { align: 'center' });
  doc.moveDown(1.2);
  doc.fontSize(16).font('Helvetica-Bold').text(subtitulo, { align: 'center' });
  doc.moveDown(1.5);
};

// Fase L.1 (PLANO.md): minuta de ata — só os itens já deliberados (§9.4:
// `registro` é a síntese da discussão, digitada no lançamento em lote).
export const gerarMinutaAtaPdf = (res, reuniao, itens) => {
  const doc = new PDFDocument({ size: 'A4', margins: { top: 56, bottom: 56, left: 56, right: 56 } });
  doc.pipe(res);
  cabecalho(doc, 'MINUTA DE ATA');
  const dataFmt = reuniao.data ? new Date(`${reuniao.data}T00:00:00`).toLocaleDateString('pt-BR') : '';
  doc.fontSize(11).font('Helvetica')
    .text(`${reuniao.numero ? reuniao.numero + ' — ' : ''}${dataFmt}${reuniao.local ? ' — ' + reuniao.local : ''}`, { align: 'center' });
  doc.moveDown(1.5);

  const deliberados = itens.filter((i) => i.deliberacao);
  if (!deliberados.length) {
    doc.fontSize(11).font('Helvetica-Oblique').text('Nenhum item deliberado até o momento.');
  }
  deliberados.forEach((item, i) => {
    doc.fontSize(11).font('Helvetica-Bold').text(`${i + 1}. ${item.numero || ''} — ${item.deliberacao}`);
    if (item.assunto) doc.fontSize(10).font('Helvetica').text(item.assunto, { indent: 14 });
    if (item.registro) doc.fontSize(10).font('Helvetica-Oblique').text(item.registro, { indent: 14 });
    doc.moveDown(0.8);
  });

  rodape(doc, 'Minuta — sujeita a aprovação na reunião seguinte. Os autos oficiais tramitam no SIPAC.');
  doc.end();
};

// Fase L.3: extrato de encaminhamento ao CEPE/SEG.
export const gerarExtratoEncaminhamentoPdf = (res, processos) => {
  const doc = new PDFDocument({ size: 'A4', margins: { top: 56, bottom: 56, left: 56, right: 56 } });
  doc.pipe(res);
  cabecalho(doc, 'EXTRATO DE ENCAMINHAMENTO — CEPE/SEG');
  if (!processos.length) {
    doc.fontSize(11).font('Helvetica-Oblique').text('Nenhum processo encaminhado a instância superior.');
  }
  processos.forEach((p, i) => {
    doc.fontSize(11).font('Helvetica-Bold').text(`${i + 1}. ${p.numero}`);
    doc.fontSize(10).font('Helvetica').text(p.assunto || '', { indent: 14 });
    doc.moveDown(0.6);
  });
  rodape(doc, 'Controle interno da Secretaria da Câmara de Pós-Graduação.');
  doc.end();
};

// Fase L.5: ofício de designação de relatoria.
export const gerarOficioRelatoriaPdf = (res, relatoria, processo) => {
  const doc = new PDFDocument({ size: 'A4', margins: { top: 56, bottom: 56, left: 72, right: 72 } });
  doc.pipe(res);
  cabecalho(doc, 'OFÍCIO DE DESIGNAÇÃO DE RELATORIA');
  const dataFmt = relatoria.data_designacao ? new Date(`${relatoria.data_designacao}T00:00:00`).toLocaleDateString('pt-BR') : '—';
  doc.fontSize(11).font('Helvetica').text(
    `Designamos ${relatoria.relator_nome} como relator(a) do processo ${processo.numero} (${processo.assunto}), `
    + `a partir de ${dataFmt}${relatoria.prazo_devolucao ? `, com prazo de devolução do parecer em ${new Date(`${relatoria.prazo_devolucao}T00:00:00`).toLocaleDateString('pt-BR')}` : ''}.`,
    { align: 'justify' }
  );
  rodape(doc, 'Controle interno da Secretaria da Câmara de Pós-Graduação — os autos oficiais tramitam no SIPAC.');
  doc.end();
};

// Fase L.8 (metade Câmara): relatório anual — contagens por status.
export const gerarRelatorioAnualCamaraPdf = (res, ano, stats) => {
  const doc = new PDFDocument({ size: 'A4', margins: { top: 56, bottom: 56, left: 56, right: 56 } });
  doc.pipe(res);
  cabecalho(doc, `RELATÓRIO ANUAL DA CÂMARA — ${ano}`);
  doc.fontSize(11).font('Helvetica');
  doc.text(`Processos recebidos no ano: ${stats.recebidos}`);
  doc.text(`Processos resolvidos no ano: ${stats.resolvidos}`);
  doc.text(`Tempo médio de resolução: ${stats.tempoMedioResolucaoDias} dia(s)`);
  doc.moveDown(1);
  doc.fontSize(12).font('Helvetica-Bold').text('Por status:');
  stats.porStatus.forEach((s) => doc.fontSize(10).font('Helvetica').text(`${s.status}: ${s.total}`));
  rodape(doc, 'Controle interno da Secretaria da Câmara de Pós-Graduação.');
  doc.end();
};

// Fase L.2: espelho do processo — mesmo padrão de QR de verificação já usado
// em declarações (A.9/B.2) e na declaração de vínculo do PNPD (C.7).
export const gerarEspelhoProcessoPdf = (res, processo, eventos, { qrBuffer, codigo, linkVerificacao }) => {
  const doc = new PDFDocument({ size: 'A4', margins: { top: 56, bottom: 56, left: 56, right: 56 } });
  doc.pipe(res);
  cabecalho(doc, 'ESPELHO DO PROCESSO');
  doc.fontSize(12).font('Helvetica-Bold').text(processo.numero, { align: 'center' });
  doc.moveDown(1);
  doc.fontSize(11).font('Helvetica');
  doc.text(`Assunto: ${processo.assunto}`);
  doc.text(`Status atual: ${processo.status}`);
  if (processo.programaSigla) doc.text(`Programa: ${processo.programaSigla}`);
  doc.moveDown(1);
  doc.fontSize(12).font('Helvetica-Bold').text('Linha do tempo');
  eventos.slice(0, 15).forEach((e) => doc.fontSize(10).font('Helvetica').text(`${e.data || ''} — ${e.descricao || e.tipo}`));

  doc.moveDown(2);
  if (qrBuffer) {
    const qrSize = 90;
    doc.image(qrBuffer, doc.page.width / 2 - qrSize / 2, doc.y, { width: qrSize });
    doc.moveDown(6);
  }
  doc.fontSize(8).fillColor('#666')
    .text(`Código de verificação: ${codigo}`, { align: 'center' })
    .text(linkVerificacao, { align: 'center' });
  rodape(doc, 'Controle interno da Secretaria da Câmara de Pós-Graduação — os autos oficiais tramitam no SIPAC.');
  doc.end();
};
