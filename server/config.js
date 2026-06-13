import dotenv from 'dotenv';

dotenv.config();

export const JWT_SECRET = process.env.JWT_SECRET;

// Falha rápido: sem um segredo forte, qualquer um poderia forjar tokens JWT.
// Não há fallback inseguro — defina JWT_SECRET no arquivo .env.
if (!JWT_SECRET || JWT_SECRET.length < 16) {
  console.error(
    '[Fatal] JWT_SECRET ausente ou muito curto. Defina uma string longa e aleatória ' +
    'em JWT_SECRET no arquivo .env (mínimo 16 caracteres) antes de iniciar o servidor.'
  );
  process.exit(1);
}

export const DATABASE_URL = process.env.DATABASE_URL;

// Conexão com o PostgreSQL é obrigatória.
if (!DATABASE_URL) {
  console.error(
    '[Fatal] DATABASE_URL ausente. Defina no .env ' +
    '(ex.: postgres://prpg:prpg@localhost:5433/prpg). Suba o banco com: docker compose up -d'
  );
  process.exit(1);
}

export const NODE_ENV = process.env.NODE_ENV || 'development';
export const IS_PRODUCTION = NODE_ENV === 'production';

// Lista de origens autorizadas a consumir a API via navegador (CORS).
// Definida em CORS_ORIGINS como valores separados por vírgula, ex.:
//   CORS_ORIGINS=https://prpg.ufrpe.br,https://www.prpg.ufrpe.br
export const CORS_ORIGINS = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

// Em produção, uma allowlist vazia bloquearia todo acesso cross-origin.
// Avisamos para que o operador não descubra isso só quando o site quebrar.
if (IS_PRODUCTION && CORS_ORIGINS.length === 0) {
  console.warn(
    '[Aviso] NODE_ENV=production sem CORS_ORIGINS definido: requisições ' +
    'cross-origin do navegador serão bloqueadas. Defina CORS_ORIGINS no .env.'
  );
}
