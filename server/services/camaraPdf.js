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
