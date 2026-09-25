// Fase N.6 (docs/revisao-portal-conteudo-2026-09-24.md): próximos prazos
// públicos — fim das inscrições dos editais abertos + marcos do calendário
// acadêmico vigente — para a home, o microsite e a agenda (.ics).
// (Os prazos internos de processos ficam em services/prazos.js.)
import { query } from '../db/pool.js';
import { editaisRepo } from '../db/repositories.js';
import { estaPublicado, sqlPublicado } from '../utils/publicacao.js';
import { calculateEditalStatus } from './editaisController.js';
import { resolveProgramaId } from '../utils/escopoPrograma.js';
import { hojeISO } from '../utils/datas.js';

// { data, dataInicio, titulo, periodo?, destino, tipo, id }[] ordenados pela data.
// `programaId`: só os editais daquele programa (o calendário acadêmico é da
// PRPG e vale para todos). `limite`: quantos devolver (null = todos).
export async function proximosPrazos({ programaId = null, limite = 6 } = {}) {
  const hoje = hojeISO();
  const editais = (await editaisRepo.getAll())
    .filter((e) => estaPublicado(e) && (!programaId || e.programaId === programaId))
    .map(calculateEditalStatus)
    .filter((e) => e.situation === 'abertas');
  const prazos = editais
    .map((e) => ({
      tipo: 'edital', id: e.id, titulo: `Inscrições: ${e.title}`, destino: `/editais/${e.id}`,
      data: e.field_periodo?.data_fim || e.deadline || null, dataInicio: e.field_periodo?.data_inicio || null,
    }))
    .filter((p) => p.data && p.data >= hoje);

  const { rows } = await query(
    `SELECT m.id, m.event, m.date, m.data_inicio, m.data_fim, m.edital_id
       FROM calendario_milestones m JOIN calendarios c ON c.id = m.calendario_id
      WHERE c.is_current AND ${sqlPublicado('c')} AND m.data_fim >= $1
      ORDER BY m.data_fim, m.ord`,
    [hoje]
  );
  for (const m of rows) {
    prazos.push({
      tipo: 'calendario', id: `marco-${m.id}`, titulo: m.event, periodo: m.date,
      destino: m.edital_id ? `/editais/${m.edital_id}` : '/calendario-academico',
      data: m.data_fim, dataInicio: m.data_inicio,
    });
  }
  prazos.sort((a, b) => a.data.localeCompare(b.data));
  return limite ? prazos.slice(0, limite) : prazos;
}

// GET /portal/prazos?programa=<id|slug>&limite=
export const getPrazos = async (req, res) => {
  const programaId = req.query.programa ? await resolveProgramaId(String(req.query.programa)) : null;
  const limite = Math.min(Number.parseInt(req.query.limite, 10) || 6, 50);
  res.json(await proximosPrazos({ programaId, limite }));
};

// ---------------------------------------------------------------- .ics
const escaparIcs = (t) => String(t || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
const dataIcs = (iso) => iso.replace(/-/g, '');
const diaSeguinte = (iso) => {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
};
// Linhas de até 75 octetos (RFC 5545 §3.1), continuação com espaço.
const dobrar = (linha) => {
  const partes = [];
  let resto = linha;
  while (Buffer.byteLength(resto) > 73) {
    let corte = 73;
    while (Buffer.byteLength(resto.slice(0, corte)) > 73) corte -= 1;
    partes.push(resto.slice(0, corte));
    resto = resto.slice(corte);
  }
  partes.push(resto);
  return partes.join('\r\n ');
};

// GET /portal/calendario.ics?programa= — assinável no Google Agenda/Outlook.
export const getCalendarioIcs = async (req, res) => {
  const programaId = req.query.programa ? await resolveProgramaId(String(req.query.programa)) : null;
  const prazos = await proximosPrazos({ programaId, limite: null });
  const site = (process.env.PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');
  const agora = `${new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`;
  const linhas = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//UFRPE//PRPG Portal//PT-BR', 'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH', 'X-WR-CALNAME:Prazos da Pós-Graduação UFRPE', 'X-WR-TIMEZONE:America/Recife',
  ];
  for (const p of prazos) {
    const inicio = p.dataInicio && p.dataInicio <= p.data ? p.dataInicio : p.data;
    linhas.push(
      'BEGIN:VEVENT',
      `UID:${p.tipo}-${p.id}@prpg.ufrpe.br`,
      `DTSTAMP:${agora}`,
      `DTSTART;VALUE=DATE:${dataIcs(inicio)}`,
      `DTEND;VALUE=DATE:${dataIcs(diaSeguinte(p.data))}`,
      `SUMMARY:${escaparIcs(p.titulo)}`,
      `URL:${site}${p.destino}`,
      ...(p.periodo ? [`DESCRIPTION:${escaparIcs(p.periodo)}`] : []),
      'END:VEVENT',
    );
  }
  linhas.push('END:VCALENDAR');
  res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
  res.setHeader('Content-Disposition', 'inline; filename="prazos-prpg.ics"');
  res.send(`${linhas.map(dobrar).join('\r\n')}\r\n`);
};
