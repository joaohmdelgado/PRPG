import path from 'path';
import { spawnSync } from 'child_process';
import { describe, expect, it } from 'vitest';

describe('script de seed administrativo', () => {
  it('retorna erro quando a política de credenciais recusa a execução', () => {
    const script = path.resolve(process.cwd(), 'server/scripts/seedAdmin.js');
    const result = spawnSync(process.execPath, [script], {
      encoding: 'utf8',
      timeout: 5000,
      env: {
        ...process.env,
        NODE_ENV: 'production',
      },
    });

    expect(result.status).toBe(1);
    expect(`${result.stdout}${result.stderr}`).toContain(
      'O seed de administrador não pode ser executado em produção.'
    );
  });
});
