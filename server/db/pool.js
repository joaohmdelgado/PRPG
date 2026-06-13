import pg from 'pg';
import { DATABASE_URL } from '../config.js';

// Pool de conexões compartilhado por toda a aplicação.
export const pool = new pg.Pool({ connectionString: DATABASE_URL });

pool.on('error', (err) => {
  console.error('[DB] Erro inesperado no pool de conexões:', err);
});

// Helper para executar queries: query('SELECT ... $1', [valor]).
export const query = (text, params) => pool.query(text, params);
