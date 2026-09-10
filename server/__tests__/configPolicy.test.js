import { describe, it, expect } from 'vitest';
import { validateRuntimeConfig } from '../config.js';

const productionEnv = {
  NODE_ENV: 'production',
  JWT_SECRET: 'a'.repeat(32),
  DATABASE_URL: 'postgres://prpg:senha@db.interno/prpg',
  PUBLIC_SITE_URL: 'https://prpg.ufrpe.br',
  CORS_ORIGINS: 'https://prpg.ufrpe.br,https://www.prpg.ufrpe.br',
};

describe('validateRuntimeConfig', () => {
  it('aceita configuração de produção com segredos e origens seguras', () => {
    expect(validateRuntimeConfig(productionEnv)).toEqual({ ok: true, errors: [] });
  });

  it('recusa produção sem allowlist CORS e URL pública HTTPS', () => {
    const result = validateRuntimeConfig({ ...productionEnv, CORS_ORIGINS: '', PUBLIC_SITE_URL: 'http://localhost:3000' });
    expect(result.ok).toBe(false);
    expect(result.errors).toContain('CORS_ORIGINS é obrigatório em produção.');
    expect(result.errors).toContain('PUBLIC_SITE_URL deve ser uma URL HTTPS pública em produção.');
  });

  it('exige JWT mais forte em produção', () => {
    const result = validateRuntimeConfig({ ...productionEnv, JWT_SECRET: 'curto' });
    expect(result.ok).toBe(false);
    expect(result.errors).toContain('JWT_SECRET deve ter ao menos 32 caracteres em produção.');
  });
});
