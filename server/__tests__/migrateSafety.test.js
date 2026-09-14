import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawnSync } from 'child_process';
import { describe, expect, it } from 'vitest';

const MENSAGEM = 'O seed destrutivo não pode ser executado em produção.';

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
        // Vazias de propósito: com elas config.js recusaria produção já no
        // import, então o teste só passa se a trava rodar antes — sem depender
        // do ambiente pai nem de um .env.
        CORS_ORIGINS: '',
        PUBLIC_SITE_URL: '',
      },
    });

    expect(result.status).toBe(1);
    expect(`${result.stdout}${result.stderr}`).toContain(MENSAGEM);
  });

  it('recusa também quando NODE_ENV=production vem só do .env', () => {
    const script = path.resolve(process.cwd(), 'server/db/migrate.mjs');
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'prpg-migrate-'));
    try {
      fs.writeFileSync(path.join(dir, '.env'), 'NODE_ENV=production\n');
      const { NODE_ENV: _ignorado, ...env } = process.env;
      const result = spawnSync(process.execPath, [script], {
        cwd: dir, // dotenv lê o .env do cwd
        encoding: 'utf8',
        timeout: 5000,
        env: {
          ...env,
          JWT_SECRET: 'test-secret-test-secret-1234567890',
          DATABASE_URL: 'postgres://prpg:prpg@127.0.0.1:1/prpg_test',
          CORS_ORIGINS: 'https://example.com',
          PUBLIC_SITE_URL: 'https://example.com',
        },
      });

      expect(result.status).toBe(1);
      expect(`${result.stdout}${result.stderr}`).toContain(MENSAGEM);
      expect(result.stdout).not.toContain('Limpando tabelas');
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
