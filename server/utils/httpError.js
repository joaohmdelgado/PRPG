import { IS_PRODUCTION } from '../config.js';

// Resposta padronizada de erro de servidor. Registra o detalhe técnico no log
// do servidor e só o devolve ao cliente fora de produção — em produção o
// usuário recebe apenas a mensagem amigável, sem vazar internals do banco/stack.
export function serverError(res, message, err, status = 500) {
  console.error(`[${status}] ${message}:`, err);
  return res.status(status).json({
    message,
    ...(IS_PRODUCTION ? {} : { error: err?.message }),
  });
}
