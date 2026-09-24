import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { randomUUID } from 'crypto';
import { fileURLToPath } from 'url';
import adminRoutes from './routes/adminRoutes.js';
import { apiLimiter } from './middleware/rateLimit.js';
import { IS_PRODUCTION, CORS_ORIGINS } from './config.js';
import { logUnexpectedError } from './utils/logger.js';
import { pgClientError } from './utils/httpError.js';
import { pool } from './db/pool.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const app = express();

// Atrás de um proxy reverso (produção), confia no primeiro hop para que o
// express-rate-limit enxergue o IP real do cliente (X-Forwarded-For).
if (IS_PRODUCTION) app.set('trust proxy', 1);

// Este servidor expõe API e ativos públicos; o SPA tem política própria no
// servidor que o hospeda. Ainda assim, toda resposta da API deve impedir
// framing e reduzir permissões do navegador não usadas pelo sistema.
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'none'"],
      baseUri: ["'none'"],
      formAction: ["'none'"],
      frameAncestors: ["'none'"],
    },
  },
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginEmbedderPolicy: false,
  frameguard: { action: 'deny' },
  referrerPolicy: { policy: 'no-referrer' },
}));
app.use((req, res, next) => {
  res.setHeader('Permissions-Policy', 'camera=(), geolocation=(), microphone=(), payment=(), usb=()');
  next();
});
app.use((req, res, next) => {
  req.requestId = randomUUID();
  res.setHeader('X-Request-Id', req.requestId);
  next();
});

// CORS: em produção, libera apenas as origens da allowlist (CORS_ORIGINS).
// Em desenvolvimento, libera qualquer origem para facilitar o trabalho local.
// Requisições sem header Origin (curl, same-origin, apps) são sempre aceitas.
const corsOptions = {
  origin(origin, callback) {
    const allowed = !origin || !IS_PRODUCTION || CORS_ORIGINS.includes(origin);
    // callback(null, false) apenas omite os cabeçalhos CORS (o navegador
    // bloqueia a leitura) — evita responder 500 e poluir o log com stack.
    callback(null, allowed);
  },
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '2mb' }));

// Servir a pasta de uploads de forma estática. O nosniff reforça contra a
// interpretação de um arquivo enviado como HTML/script pelo navegador.
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  setHeaders: (res) => res.setHeader('X-Content-Type-Options', 'nosniff'),
}));

// Rota base de teste
app.get('/api/status', (req, res) => {
  res.json({ status: 'online', service: 'PRPG UFRPE API', version: '1.0.0' });
});

// Liveness não consulta dependências: Kubernetes só deve reiniciar o pod se o
// próprio processo não responder. A dependência do banco é verificada em /ready.
app.get('/api/live', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json({ status: 'live' });
});

// Readiness é diferente de liveness: só responde pronto se a dependência
// crítica (PostgreSQL) também estiver disponível para atender requisições.
app.get('/api/ready', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.setHeader('Cache-Control', 'no-store');
    res.json({ status: 'ready', database: 'connected' });
  } catch (error) {
    logUnexpectedError({ requestId: req.requestId, error });
    res.setHeader('Cache-Control', 'no-store');
    res.status(503).json({ status: 'not_ready', database: 'unavailable' });
  }
});

// Rotas da API e Painel Admin (com limite de taxa geral por IP).
app.use('/api', apiLimiter, adminRoutes);

// 404 para rotas de API desconhecidas: resposta JSON em vez do HTML padrão.
app.use('/api', (req, res) => {
  res.status(404).json({ message: 'Recurso não encontrado.' });
});

// Tratador de erros global: registra o detalhe no servidor e devolve uma
// mensagem genérica, sem vazar internals em produção. Cobre JSON malformado,
// erros do multer e quaisquer exceções não tratadas nas rotas.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  // Resposta já começou a ser enviada: só o Express consegue encerrar a conexão.
  if (res.headersSent) return next(err);
  // Corpo JSON inválido é erro do cliente (400), não do servidor (500).
  if (err?.type === 'entity.parse.failed' || err instanceof SyntaxError) {
    return res.status(400).json({ message: 'JSON inválido no corpo da requisição.' });
  }
  const clientError = pgClientError(err);
  if (clientError) return res.status(clientError.status).json({ message: clientError.message });
  logUnexpectedError({ requestId: req.requestId, error: err });
  const status = err?.status || err?.statusCode || 500;
  res.status(status).json({
    message: 'Erro interno do servidor.',
    ...(IS_PRODUCTION ? {} : { error: err?.message }),
  });
});
