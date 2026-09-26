// Fase O.5: agendador de prazos como processo/cron separado do servidor web.
//
//   npm run agendador                 avalia uma vez e sai (para cron / Agendador de Tarefas)
//   npm run agendador -- --continuo   fica rodando: avalia agora e a cada 24 h
//
// Modo "só no painel" por padrão: os avisos ficam em Notificações, sem e-mail.
// AGENDADOR_EMAIL=true no .env liga o envio (só depois da D-C5; exige SMTP_*).
// Exemplo cron (todo dia às 07:00):   0 7 * * *  cd /app && npm run agendador
import 'dotenv/config';
import { pool } from '../db/pool.js';
import { executarAgendador, iniciarAgendador, modoDoAgendador } from '../services/agendador.js';

console.log(`[Agendador] modo ${modoDoAgendador()}${modoDoAgendador() === 'SO_PAINEL' ? ' (sem e-mail)' : ''}`);

if (process.argv.includes('--continuo')) {
  iniciarAgendador();
  const parar = async () => { await pool.end().catch(() => {}); process.exit(0); };
  process.on('SIGTERM', parar);
  process.on('SIGINT', parar);
} else {
  try {
    const r = await executarAgendador();
    console.log('[Agendador]', r.ocupado ? 'outra execução em andamento; nada feito.' : `execução ${r.id} concluída: ${JSON.stringify(r.resumo)}`);
  } catch (e) {
    console.error('[Agendador] falhou:', e.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}
