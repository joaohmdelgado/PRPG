import dotenv from 'dotenv';

dotenv.config();

const parseOrigins = (value) => (value || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const isPublicHttpsUrl = (value) => {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !['localhost', '127.0.0.1', '::1'].includes(url.hostname);
  } catch {
    return false;
  }
};

export function validateRuntimeConfig(env) {
  const errors = [];
  const isProduction = env.NODE_ENV === 'production';
  const jwtSecret = env.JWT_SECRET || '';
  const origins = parseOrigins(env.CORS_ORIGINS);

  if (jwtSecret.length < 16) errors.push('JWT_SECRET deve ter ao menos 16 caracteres.');
  if (!env.DATABASE_URL) errors.push('DATABASE_URL é obrigatório.');

  if (isProduction) {
    if (jwtSecret.length < 32) errors.push('JWT_SECRET deve ter ao menos 32 caracteres em produção.');
    if (origins.length === 0) errors.push('CORS_ORIGINS é obrigatório em produção.');
    if (origins.some((origin) => !isPublicHttpsUrl(origin))) {
      errors.push('CORS_ORIGINS deve conter apenas origens HTTPS públicas em produção.');
    }
    if (!isPublicHttpsUrl(env.PUBLIC_SITE_URL)) {
      errors.push('PUBLIC_SITE_URL deve ser uma URL HTTPS pública em produção.');
    }
  }

  return { ok: errors.length === 0, errors };
}

export const JWT_SECRET = process.env.JWT_SECRET;
export const DATABASE_URL = process.env.DATABASE_URL;
export const NODE_ENV = process.env.NODE_ENV || 'development';
export const IS_PRODUCTION = NODE_ENV === 'production';
export const CORS_ORIGINS = parseOrigins(process.env.CORS_ORIGINS);

const validation = validateRuntimeConfig(process.env);
if (!validation.ok) {
  for (const error of validation.errors) console.error(`[Fatal] ${error}`);
  process.exit(1);
}
