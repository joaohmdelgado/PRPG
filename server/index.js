import dotenv from 'dotenv';
import { app } from './app.js';
import { pool } from './db/pool.js';
import { createGracefulShutdown } from './runtime/shutdown.js';
import { garantirPaginasInstitucionais } from './db/paginasInstitucionais.js';
import { garantirEstruturaPrpg } from './db/estruturaPrpg.js';

dotenv.config();

const PORT = process.env.PORT || 5000;
let server;
const shutdown = createGracefulShutdown({ getServer: () => server, dbPool: pool });

// Rede de segurança: registra exceções/rejeições não tratadas em vez de
// deixá-las derrubar o processo sem rastro nos logs.
process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection]', reason);
  shutdown('unhandledRejection');
});
process.on('uncaughtException', (err) => {
  console.error('[uncaughtException]', err);
  shutdown('uncaughtException');
});
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Verifica a conexão com o banco antes de aceitar requisições.
pool
  .query('SELECT 1')
  .then(async () => {
    // Páginas institucionais (H.3) e estrutura da PRPG (H.4) que faltarem —
    // carga inicial, nunca sobrescreve edições. Falha aqui não impede
    // a subida — o site só mostraria "página não encontrada" nelas.
    try {
      const criadas = await garantirPaginasInstitucionais();
      if (criadas) console.log(`[DB] Páginas institucionais criadas: ${criadas}`);
      const equipe = await garantirEstruturaPrpg();
      if (equipe) console.log(`[DB] Estrutura da PRPG carregada: ${equipe} pessoa(s)`);
    } catch (e) {
      console.error('[DB] Não foi possível criar as páginas institucionais/estrutura:', e.message);
    }
    server = app.listen(PORT, () => {
      console.log(`[Server] Rodando na porta ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('[Fatal] Não foi possível conectar ao PostgreSQL:', err.message);
    console.error('Suba o banco com: docker compose up -d (e rode: npm run db:migrate)');
    process.exit(1);
  });
