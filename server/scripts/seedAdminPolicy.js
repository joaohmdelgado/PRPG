export const getSeedAdminCredentials = (env = process.env) => {
  if (env.NODE_ENV === 'production') {
    throw new Error('O seed de administrador não pode ser executado em produção.');
  }

  if (!env.SEED_ADMIN_EMAIL) {
    throw new Error('SEED_ADMIN_EMAIL é obrigatório.');
  }

  if (!env.SEED_ADMIN_PASSWORD) {
    throw new Error('SEED_ADMIN_PASSWORD é obrigatório.');
  }

  if (env.SEED_ADMIN_PASSWORD.length < 16) {
    throw new Error('SEED_ADMIN_PASSWORD deve ter pelo menos 16 caracteres.');
  }

  return {
    email: env.SEED_ADMIN_EMAIL,
    password: env.SEED_ADMIN_PASSWORD,
  };
};
