import fs from 'fs/promises';
import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { pool } from '../db/pool.js';
import { resetDb, seedAdmin, seedUser } from './helpers.js';

// B.11: as migrações rodam como no migrateRunner — uma transação por arquivo.
const ler = (nome) => fs.readFile(new URL(`../db/migrations/${nome}`, import.meta.url), 'utf8');
const rodar = async (nome) => {
  const sql = await ler(nome);
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    await c.query(sql);
    await c.query('COMMIT');
  } catch (e) {
    await c.query('ROLLBACK');
    throw e;
  } finally {
    c.release();
  }
};
const MIG_A = '2026-09-30_b11a_pessoas_de_usuarios.sql';

beforeEach(async () => { await resetDb(); await seedAdmin(); });
afterAll(async () => { await pool.end(); });

describe('B.11 migração A — pessoa para todo usuário e reconciliação', () => {
  it('cria pessoa para quem não tem; o usuário vence, menos na foto', async () => {
    await seedUser({ id: 'u-sem', email: 'sem@t.br', perfil_geral: { nome: 'Sem Pessoa' } });
    await pool.query(`UPDATE users SET pessoa_id = NULL WHERE id = 'u-sem'`);
    await seedUser({ id: 'u-com', email: 'com@t.br', perfil_geral: { nome: 'Nome Novo', foto_url: '/uploads/painel.jpg' } });
    // Simula a deriva de antes da Task 2: edições que ficaram só em `users`.
    await pool.query(`UPDATE users SET acad_lattes = 'http://lattes/novo' WHERE id = 'u-com'`);
    await pool.query(`UPDATE pessoas SET nome = 'Nome Antigo', foto_url = '/uploads/estrutura.jpg', lattes = 'http://lattes/velho'
                       WHERE id = (SELECT pessoa_id FROM users WHERE id = 'u-com')`);

    await rodar(MIG_A);

    const { rows } = await pool.query(
      `SELECT u.id, p.nome, p.foto_url, p.lattes FROM users u JOIN pessoas p ON p.id = u.pessoa_id
        WHERE u.id IN ('u-com', 'u-sem') ORDER BY u.id`
    );
    expect(rows).toEqual([
      { id: 'u-com', nome: 'Nome Novo', foto_url: '/uploads/estrutura.jpg', lattes: 'http://lattes/novo' },
      { id: 'u-sem', nome: 'Sem Pessoa', foto_url: null, lattes: null },
    ]);
  });

  it('é idempotente', async () => {
    await seedUser({ id: 'u-sem', email: 'sem@t.br', perfil_geral: { nome: 'Sem Pessoa' } });
    await pool.query(`UPDATE users SET pessoa_id = NULL WHERE id = 'u-sem'`);
    await rodar(MIG_A);
    const antes = (await pool.query('SELECT count(*)::int AS n FROM pessoas')).rows[0].n;
    await rodar(MIG_A);
    expect((await pool.query('SELECT count(*)::int AS n FROM pessoas')).rows[0].n).toBe(antes);
  });
});
