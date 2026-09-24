import { IS_PRODUCTION } from '../config.js';

// Erros do PostgreSQL causados pelo dado enviado (não pelo servidor) viram 4xx
// com mensagem útil. Classe 22 = valor fora do formato/limite da coluna (ex.:
// data '31/12/2026' numa coluna DATE); 23xxx = violação de restrição.
export const pgClientError = (err) => {
  const code = typeof err?.code === 'string' ? err.code : '';
  if (code.startsWith('22')) {
    return { status: 400, message: 'Valor inválido: confira o formato das datas e números informados.' };
  }
  if (code === '23505') return { status: 409, message: 'Já existe um registro com esse identificador.' };
  if (code === '23503') return { status: 400, message: 'Referência inválida: o item relacionado não existe.' };
  if (code === '23502') return { status: 400, message: 'Campo obrigatório não informado.' };
  if (code === '23514') return { status: 400, message: 'Valor não permitido para um dos campos.' };
  return null;
};

// Resposta padronizada de erro de servidor. Registra o detalhe técnico no log
// do servidor e só o devolve ao cliente fora de produção — em produção o
// usuário recebe apenas a mensagem amigável, sem vazar internals do banco/stack.
// Erro de dado do cliente (pgClientError) responde 4xx em vez de 500.
export function serverError(res, message, err, status = 500) {
  const clientError = pgClientError(err);
  if (clientError) return res.status(clientError.status).json({ message: clientError.message });
  console.error(`[${status}] ${message}:`, err);
  return res.status(status).json({
    message,
    ...(IS_PRODUCTION ? {} : { error: err?.message }),
  });
}
