import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
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
// gzip/deflate nas respostas (Fase R.9): as listagens JSON são texto
// repetitivo — /api/news tinha 88 KB trafegando sem compressão.
app.use(compression());
app.use(express.json({ limit: '2mb' }));

// Servir a pasta de uploads de forma estática. O nosniff reforça contra a
// interpretação de um arquivo enviado como HTML/script pelo navegador.
// Cada upload recebe nome único (timestamp + aleatório) e nunca é
// sobrescrito, então pode ficar em cache por muito tempo.
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  maxAge: '30d',
  setHeaders: (res) => res.setHeader('X-Content-Type-Options', 'nosniff'),
}));

// Cache HTTP padrão da API (o handler pode sobrescrever, como /api/ready):
// GET anônimo é conteúdo público — cache curto no navegador/proxy, e o ETag
// do Express responde 304 quando nada mudou. Com token, a resposta é do
// usuário: nunca compartilhada entre pessoas.
app.use('/api', (req, res, next) => {
  if (req.method !== 'GET') {
    res.setHeader('Cache-Control', 'no-store');
    return next();
  }
  // Mesma URL, resposta diferente com e sem token (ex.: microsite em rascunho).
  res.vary('Authorization');
  if (req.headers.authorization) {
    res.setHeader('Cache-Control', 'private, no-cache');
  } else {
    res.setHeader('Cache-Control', 'public, max-age=30, stale-while-revalidate=60');
  }
  next();
});

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
  // Erro de regra de negócio com mensagem para o usuário (ex.: ConflitoEdicao, 409).
  if (err?.expose && err.status >= 400 && err.status < 500) {
    return res.status(err.status).json({ message: err.message });
  }
  logUnexpectedError({ requestId: req.requestId, error: err });
  const status = err?.status || err?.statusCode || 500;
  res.status(status).json({
    message: 'Erro interno do servidor.',
    ...(IS_PRODUCTION ? {} : { error: err?.message }),
  });
});
