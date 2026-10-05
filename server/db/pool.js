import pg from 'pg';
import { DATABASE_URL } from '../config.js';

// Fase A.3 (G7, PLANO.md): colunas DATE voltam da consulta como string
// 'YYYY-MM-DD' crua, não como objeto Date — o driver por padrão parseia DATE
// (OID 1082) para Date à meia-noite UTC, e serializar isso de volta desloca
// o dia conforme o fuso do processo. Sem esse parser, o contrato da API
// (strings 'YYYY-MM-DD') mudaria silenciosamente ao converter TEXT -> DATE.
pg.types.setTypeParser(1082, (value) => value);

const inteiro = (v) => {
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
};

// OPS-06: o pool nos padrões do `pg` esperava para sempre por uma conexão livre
// (banco lento ou pool esgotado = requisição pendurada sem erro). Os limites de
// consulta e de transação ociosa ficam desligados por padrão: o mesmo pool serve
// migrações e importadores, que podem ter consultas longas legítimas — ligue no
// processo web de produção (PG_STATEMENT_TIMEOUT_MS / PG_IDLE_IN_TX_TIMEOUT_MS).
export const opcoesDoPool = (env = process.env) => {
  const opcoes = {
    connectionString: env.DATABASE_URL,
    max: inteiro(env.PG_POOL_MAX) || 10,
    connectionTimeoutMillis: inteiro(env.PG_CONNECTION_TIMEOUT_MS) ?? 10000,
    idleTimeoutMillis: inteiro(env.PG_IDLE_TIMEOUT_MS) ?? 30000,
    application_name: env.PG_APPLICATION_NAME || 'prpg-api',
  };
  const consulta = inteiro(env.PG_STATEMENT_TIMEOUT_MS);
  if (consulta) opcoes.statement_timeout = consulta;
  const ociosa = inteiro(env.PG_IDLE_IN_TX_TIMEOUT_MS);
  if (ociosa) opcoes.idle_in_transaction_session_timeout = ociosa;
  return opcoes;
};

// Pool de conexões compartilhado por toda a aplicação.
export const pool = new pg.Pool(opcoesDoPool({ ...process.env, DATABASE_URL }));

pool.on('error', (err) => {
  console.error('[DB] Erro inesperado no pool de conexões:', err);
});

// Helper para executar queries: query('SELECT ... $1', [valor]).
export const query = (text, params) => pool.query(text, params);
