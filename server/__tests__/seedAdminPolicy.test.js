import { describe, expect, it } from 'vitest';
import { getSeedAdminCredentials } from '../scripts/seedAdminPolicy.js';

describe('credenciais do seed administrativo', () => {
  it('recusa seed de administrador em produção', () => {
    expect(() => getSeedAdminCredentials({
      NODE_ENV: 'production',
      SEED_ADMIN_EMAIL: 'admin@ufrpe.br',
      SEED_ADMIN_PASSWORD: 'uma-senha-longa',
    })).toThrow('O seed de administrador não pode ser executado em produção.');
  });

  it('recusa criar administrador sem senha explícita', () => {
    expect(() => getSeedAdminCredentials({
      NODE_ENV: 'development',
      SEED_ADMIN_EMAIL: 'admin@ufrpe.br',
    })).toThrow('SEED_ADMIN_PASSWORD é obrigatório.');
  });

  it('recusa criar administrador sem e-mail explícito', () => {
    expect(() => getSeedAdminCredentials({
      NODE_ENV: 'development',
      SEED_ADMIN_PASSWORD: 'uma-senha-longa',
    })).toThrow('SEED_ADMIN_EMAIL é obrigatório.');
  });

  it('recusa senha curta para o seed administrativo', () => {
    expect(() => getSeedAdminCredentials({
      NODE_ENV: 'development',
      SEED_ADMIN_EMAIL: 'admin@ufrpe.br',
      SEED_ADMIN_PASSWORD: 'curta',
    })).toThrow('SEED_ADMIN_PASSWORD deve ter pelo menos 16 caracteres.');
  });
});
