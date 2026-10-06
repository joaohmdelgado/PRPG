// AUTH-02: bloqueio de login por conta. O loginLimiter (por IP) não para quem
// troca de IP; aqui, MAX_FALHAS falhas dentro de JANELA bloqueiam aquele e-mail
// por BLOQUEIO, de qualquer IP — inclusive e-mail que não existe, para o 429
// não revelar quais contas existem. Login certo zera; gerar senha provisória
// pelo painel também (saída para quem foi bloqueado por terceiros).
import { query } from '../db/pool.js';

export const MAX_FALHAS = 5;
const JANELA = '15 minutes';
const BLOQUEIO = '15 minutes';

export const chaveLogin = (email) => String(email ?? '').trim().toLowerCase();

export const estaBloqueado = async (email) => {
  const { rows } = await query(
    'SELECT 1 FROM login_tentativas WHERE chave = $1 AND bloqueado_ate > now()', [chaveLogin(email)]);
  return rows.length > 0;
};

// Conta a falha numa janela que recomeça quando a primeira falha ficou velha.
export const registrarFalha = async (email) => {
  await query(
    `INSERT INTO login_tentativas (chave, falhas, primeira_falha_em) VALUES ($1, 1, now())
     ON CONFLICT (chave) DO UPDATE SET
       falhas = CASE WHEN login_tentativas.primeira_falha_em < now() - $2::interval THEN 1
                     ELSE login_tentativas.falhas + 1 END,
       primeira_falha_em = CASE WHEN login_tentativas.primeira_falha_em < now() - $2::interval THEN now()
                                ELSE login_tentativas.primeira_falha_em END`,
    [chaveLogin(email), JANELA]
  );
  await query(
    `UPDATE login_tentativas SET bloqueado_ate = now() + $3::interval
      WHERE chave = $1 AND falhas >= $2`,
    [chaveLogin(email), MAX_FALHAS, BLOQUEIO]
  );
};

export const limparTentativas = async (email) => {
  await query('DELETE FROM login_tentativas WHERE chave = $1', [chaveLogin(email)]);
};
