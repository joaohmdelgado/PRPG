import dotenv from 'dotenv';
import { app } from './app.js';
import { pool } from './db/pool.js';

dotenv.config();

const PORT = process.env.PORT || 5000;

// Verifica a conexão com o banco antes de aceitar requisições.
pool
  .query('SELECT 1')
  .then(() => {
    app.listen(PORT, () => {
      console.log(`[Server] Rodando na porta ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('[Fatal] Não foi possível conectar ao PostgreSQL:', err.message);
    console.error('Suba o banco com: docker compose up -d (e rode: npm run db:migrate)');
    process.exit(1);
  });
