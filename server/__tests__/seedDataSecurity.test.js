import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { describe, expect, it } from 'vitest';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const usersPath = path.join(__dirname, '../data/users.json');

describe('dados legados de usuários', () => {
  it('não inclui a conta administrativa padrão conhecida', () => {
    const users = JSON.parse(fs.readFileSync(usersPath, 'utf8'));

    expect(users.some((user) => user.email === 'admin@ufrpe.br')).toBe(false);
  });
});
