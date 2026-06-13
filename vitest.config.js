import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    // Variáveis carregadas antes do app importar config.js/pool.js.
    env: {
      JWT_SECRET: 'test-secret-test-secret-1234567890',
      DATABASE_URL: 'postgres://prpg:prpg@localhost:5433/prpg_test',
      NODE_ENV: 'test',
    },
    globalSetup: './server/__tests__/globalSetup.js',
    // Os testes de API compartilham um único banco de teste; rodar em série
    // evita que arquivos diferentes truncem as tabelas uns dos outros.
    fileParallelism: false,
    include: ['server/**/*.test.js'],
  },
});
