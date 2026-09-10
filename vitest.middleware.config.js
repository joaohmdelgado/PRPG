import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    env: {
      JWT_SECRET: 'test-secret-test-secret-1234567890',
      DATABASE_URL: 'postgres://prpg:prpg@localhost:5433/prpg_test',
      NODE_ENV: 'test',
    },
    include: ['server/__tests__/authzMiddleware.test.js'],
  },
});
