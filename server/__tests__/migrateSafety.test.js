import path from 'path';
import { spawnSync } from 'child_process';
import { describe, expect, it } from 'vitest';

describe('seed destrutivo de desenvolvimento', () => {
  it('recusa executar em produção antes de conectar ao banco', () => {
    const script = path.resolve(process.cwd(), 'server/db/migrate.mjs');
    const result = spawnSync(process.execPath, [script], {
      encoding: 'utf8',
      timeout: 5000,
      env: {
        ...process.env,
        NODE_ENV: 'production',
        JWT_SECRET: 'test-secret-test-secret-1234567890',
        DATABASE_URL: 'postgres://prpg:prpg@127.0.0.1:1/prpg_test',
        CORS_ORIGINS: 'https://example.com',
        PUBLIC_SITE_URL: 'https://example.com',
      },
    });

    expect(result.status).toBe(1);
    expect(`${result.stdout}${result.stderr}`).toContain(
      'O seed destrutivo não pode ser executado em produção.'
    );
  });
});
