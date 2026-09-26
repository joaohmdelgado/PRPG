// Fase J (Prazos e cobranças, PLANO.md): agendador diário que avalia as
// regras concretas de prazo sobre Câmara, PNPD, Contatos e Expedientes — ver
// server/services/prazos.js.
//
// Fase O.5: roda FORA do processo web — como cron/agendador de tarefas do SO
// chamando `npm run agendador` (uma avaliação e sai) ou como processo próprio
// com `npm run agendador -- --continuo` (ver server/scripts/agendador.mjs).
// Motivo: um setInterval dentro da API duplicaria a avaliação a cada réplica
// e um erro nele mexeria na disponibilidade do site.
//
// Enquanto a D-C5 (SMTP institucional) não é respondida, o modo é SO_PAINEL:
// os avisos ficam registrados em `notificacoes` (tela Notificações) e o painel
// de pendências mostra o que vence, mas nenhum e-mail sai. AGENDADOR_EMAIL=true
// liga o envio (exige SMTP_* no .env).
import { pool, query } from '../db/pool.js';
import { rodarSoPainel } from './email.js';
import {
  avaliarRelatoriasCamara, avaliarPosDoutorado, avaliarMandatosVencendo,
  avaliarPortariasVencendo, avaliarReservasPendentes,
} from './prazos.js';

export const avaliarPrazos = async () => {
  const [camara, posdoc, mandatos, portarias, reservas] = await Promise.all([
    avaliarRelatoriasCamara(),
    avaliarPosDoutorado(),
    avaliarMandatosVencendo(),
    avaliarPortariasVencendo(),
    avaliarReservasPendentes(),
  ]);
  return { camara, posdoc, mandatos, portarias, reservas };
};

export const modoDoAgendador = () => (process.env.AGENDADOR_EMAIL === 'true' ? 'EMAIL' : 'SO_PAINEL');

// Uma execução registrada em `agendador_execucoes`. Lock consultivo: duas
// execuções simultâneas (cron sobreposto, execução manual no meio) não
// avaliam em paralelo — a segunda devolve { ocupado: true }.
export async function executarAgendador({ origem = 'cron' } = {}) {
  const client = await pool.connect();
  let travado = false;
  try {
    const { rows: lock } = await client.query("SELECT pg_try_advisory_lock(hashtext('prpg-agendador')) AS ok");
    if (!lock[0].ok) return { ocupado: true };
    travado = true;
    const modo = modoDoAgendador();
    const { rows } = await query(
      'INSERT INTO agendador_execucoes (modo, origem) VALUES ($1, $2) RETURNING id, iniciado_em', [modo, origem]);
    let resumo = null;
    let erro = null;
    try {
      resumo = modo === 'EMAIL' ? await avaliarPrazos() : await rodarSoPainel(avaliarPrazos);
    } catch (e) {
      erro = e.message;
    }
    await query(
      'UPDATE agendador_execucoes SET concluido_em = now(), resumo = $2, erro = $3 WHERE id = $1',
      [rows[0].id, resumo ? JSON.stringify(resumo) : null, erro]);
    if (erro) throw Object.assign(new Error(erro), { execucaoId: rows[0].id });
    return { id: rows[0].id, modo, origem, iniciadoEm: rows[0].iniciado_em, resumo };
  } finally {
    if (travado) await client.query("SELECT pg_advisory_unlock(hashtext('prpg-agendador'))").catch(() => {});
    client.release();
  }
}

// Modo contínuo (processo próprio): avalia agora e a cada `intervaloMs`.
// Erros são registrados e o laço segue; quem chama é o script, não o servidor web.
export const iniciarAgendador = (intervaloMs = 24 * 60 * 60 * 1000) => {
  const rodar = () => executarAgendador().catch((e) => console.error('[Agendador] Erro ao avaliar prazos:', e.message));
  rodar();
  return setInterval(rodar, intervaloMs);
};

// Última execução e histórico curto, para o painel.
export async function estadoDoAgendador() {
  const { rows } = await query(
    `SELECT id, iniciado_em, concluido_em, modo, origem, resumo, erro FROM agendador_execucoes
     ORDER BY iniciado_em DESC LIMIT 10`);
  const fromRow = (r) => ({
    id: r.id, iniciadoEm: r.iniciado_em, concluidoEm: r.concluido_em, modo: r.modo, origem: r.origem,
    resumo: r.resumo, erro: r.erro,
  });
  const ultima = rows[0] ? fromRow(rows[0]) : null;
  // Parou de rodar? Sem execução concluída nas últimas 36 h (cron diário + folga).
  const atrasado = !ultima || !ultima.concluidoEm || (Date.now() - new Date(ultima.iniciadoEm).getTime()) > 36 * 3600 * 1000;
  return { modoAtual: modoDoAgendador(), ultima, atrasado, historico: rows.map(fromRow) };
}
