import pg from 'pg';
import { DATABASE_URL } from '../config.js';

// Fase A.3 (G7, PLANO.md): colunas DATE voltam da consulta como string
// 'YYYY-MM-DD' crua, não como objeto Date — o driver por padrão parseia DATE
// (OID 1082) para Date à meia-noite UTC, e serializar isso de volta desloca
// o dia conforme o fuso do processo. Sem esse parser, o contrato da API
// (strings 'YYYY-MM-DD') mudaria silenciosamente ao converter TEXT -> DATE.
pg.types.setTypeParser(1082, (value) => value);

// Pool de conexões compartilhado por toda a aplicação.
export const pool = new pg.Pool({ connectionString: DATABASE_URL });

pool.on('error', (err) => {
  console.error('[DB] Erro inesperado no pool de conexões:', err);
});

// Helper para executar queries: query('SELECT ... $1', [valor]).
export const query = (text, params) => pool.query(text, params);
