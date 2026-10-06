// Logs de borda: não serialize objetos de erro ou request, pois mensagens e
// propriedades podem carregar credenciais, CPF, corpo HTTP ou SQL com dados.
export const formatErrorLog = ({ requestId, error }) => JSON.stringify({
  timestamp: new Date().toISOString(),
  level: 'error',
  event: 'unhandled_request_error',
  requestId: requestId || null,
  errorType: error?.constructor?.name || 'UnknownError',
  errorCode: typeof error?.code === 'string' || typeof error?.code === 'number' ? error.code : null,
});

export const logUnexpectedError = (context) => {
  console.error(formatErrorLog(context));
};

// OPS-03: log de acesso. Uma linha JSON por requisição, no `finish` da resposta.
// Só registra a ROTA (padrão do Express, ex. /api/users/:id), nunca a URL real:
// o caminho e a query podem carregar CPF, e-mail ou termo de busca. Rota
// desconhecida (404) sai sem caminho. O usuário vai pseudonimizado (HMAC do id
// com o segredo da aplicação): dá para correlacionar sem identificar.
// 401/403 saem em `warn` (trilha de acesso negado) e 5xx em `error`.
import crypto from 'crypto';
import { JWT_SECRET } from '../config.js';

const SONDAS = new Set(['/api/live', '/api/ready', '/api/status']);

export const pseudonimo = (id) => (id
  ? crypto.createHmac('sha256', JWT_SECRET).update(String(id)).digest('hex').slice(0, 12)
  : null);

export const formatAccessLog = ({ req, res, duracaoMs }) => {
  const status = res.statusCode;
  return JSON.stringify({
    timestamp: new Date().toISOString(),
    level: status >= 500 ? 'error' : (status === 401 || status === 403 ? 'warn' : 'info'),
    event: 'http_request',
    requestId: req.requestId || null,
    method: req.method,
    route: req.route ? `${req.baseUrl || ''}${req.route.path}` : null,
    status,
    durationMs: Math.round(duracaoMs),
    user: pseudonimo(req.user?.id),
  });
};

export const middlewareAcesso = ({ escrever = (linha) => console.log(linha), ativo = true } = {}) => (req, res, next) => {
  if (!ativo || SONDAS.has(String(req.originalUrl || '').split('?')[0])) return next();
  const inicio = process.hrtime.bigint();
  res.on('finish', () => {
    escrever(formatAccessLog({ req, res, duracaoMs: Number(process.hrtime.bigint() - inicio) / 1e6 }));
  });
  return next();
};
