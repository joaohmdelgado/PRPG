import { describe, it, expect, afterAll } from 'vitest';
import { pool, opcoesDoPool } from '../db/pool.js';

// OPS-06: parâmetros do pool vêm do ambiente, com padrões seguros.
afterAll(async () => { await pool.end(); });

describe('opções do pool do PostgreSQL', () => {
  it('padrões: espera por conexão limitada, sem limite de consulta', () => {
    const o = opcoesDoPool({ DATABASE_URL: 'postgres://x' });
    expect(o).toMatchObject({
      connectionString: 'postgres://x', max: 10, connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 30000, application_name: 'prpg-api',
    });
    expect(o.statement_timeout).toBeUndefined();
    expect(o.idle_in_transaction_session_timeout).toBeUndefined();
  });

  it('lê os limites do ambiente e ignora valor inválido', () => {
    const o = opcoesDoPool({
      DATABASE_URL: 'postgres://x', PG_POOL_MAX: '25', PG_CONNECTION_TIMEOUT_MS: '3000',
      PG_STATEMENT_TIMEOUT_MS: '30000', PG_IDLE_IN_TX_TIMEOUT_MS: '60000', PG_APPLICATION_NAME: 'prpg-worker',
    });
    expect(o).toMatchObject({
      max: 25, connectionTimeoutMillis: 3000, statement_timeout: 30000,
      idle_in_transaction_session_timeout: 60000, application_name: 'prpg-worker',
    });
    expect(opcoesDoPool({ PG_POOL_MAX: 'muitos', PG_CONNECTION_TIMEOUT_MS: '-1' }))
      .toMatchObject({ max: 10, connectionTimeoutMillis: 10000 });
  });

  it('o pool da aplicação se identifica no pg_stat_activity', async () => {
    const { rows } = await pool.query('SELECT current_setting(\'application_name\') AS nome');
    expect(rows[0].nome).toBe('prpg-api');
  });
});
