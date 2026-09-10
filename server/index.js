import dotenv from 'dotenv';
import { app } from './app.js';
import { pool } from './db/pool.js';
import { createGracefulShutdown } from './runtime/shutdown.js';

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
  .then(() => {
    server = app.listen(PORT, () => {
      console.log(`[Server] Rodando na porta ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('[Fatal] Não foi possível conectar ao PostgreSQL:', err.message);
    console.error('Suba o banco com: docker compose up -d (e rode: npm run db:migrate)');
    process.exit(1);
  });
