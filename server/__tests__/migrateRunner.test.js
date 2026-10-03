import { describe, it, expect, beforeEach, afterEach, afterAll } from 'vitest';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import pg from 'pg';
import { pool } from '../db/pool.js';
import {
  applyMigrations, readMigrations, versoesDoBaseline, bancoEstaNoBaseline, BASELINE_ATE,
} from '../db/migrateRunner.mjs';

let migrationsDir;

beforeEach(async () => {
  migrationsDir = await fs.mkdtemp(path.join(os.tmpdir(), 'prpg-migrations-'));
  await pool.query('CREATE TABLE IF NOT EXISTS schema_migrations (version text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())');
  await pool.query("DELETE FROM schema_migrations WHERE version LIKE '900%'");
  await pool.query('DROP TABLE IF EXISTS migration_runner_probe');
});

afterEach(async () => {
  await fs.rm(migrationsDir, { recursive: true, force: true });
  await pool.query("DELETE FROM schema_migrations WHERE version LIKE '900%'");
  await pool.query('DROP TABLE IF EXISTS migration_runner_probe');
});

afterAll(async () => {
  await pool.end();
});

describe('applyMigrations', () => {
  it('aplica cada arquivo uma única vez e registra seu checksum', async () => {
    await fs.writeFile(path.join(migrationsDir, '9001-test-probe.sql'), 'CREATE TABLE migration_runner_probe (id integer PRIMARY KEY);');

    const primeira = await applyMigrations({ pool, migrationsDir });
    const segunda = await applyMigrations({ pool, migrationsDir });

    expect(primeira.applied).toEqual(['9001-test-probe.sql']);
    expect(segunda.applied).toEqual([]);
    const { rows } = await pool.query("SELECT version, checksum FROM schema_migrations WHERE version = '9001-test-probe.sql'");
    expect(rows).toHaveLength(1);
    expect(rows[0].checksum).toMatch(/^[a-f0-9]{64}$/);
  });

  it('recusa alteração de checksum em migração já aplicada', async () => {
    const arquivo = path.join(migrationsDir, '9002-test-checksum.sql');
    await fs.writeFile(arquivo, 'CREATE TABLE migration_runner_probe (id integer PRIMARY KEY);');
    await applyMigrations({ pool, migrationsDir });
    await fs.writeFile(arquivo, 'CREATE TABLE migration_runner_probe (id bigint PRIMARY KEY);');

    await expect(applyMigrations({ pool, migrationsDir })).rejects.toThrow('checksum divergente');
  });

  it('não registra versão quando a migração falha', async () => {
    await fs.writeFile(path.join(migrationsDir, '9003-test-invalid.sql'), 'CREATE TABL migration_runner_probe (id integer);');

    await expect(applyMigrations({ pool, migrationsDir })).rejects.toThrow();
    const { rows } = await pool.query("SELECT version FROM schema_migrations WHERE version = '9003-test-invalid.sql'");
    expect(rows).toHaveLength(0);
  });
});

// B.13 / G1 (docs/analise-g1-users-credencial.md §4.12): o schema.sql já reflete as
// migrações até a g1c, e algumas delas (b11a, g1a) leem colunas de `users` que não
// existem mais. Num banco novo, o runner as adota (registra sem rodar).
describe('adoção do baseline', () => {
  it('marca só as migrações até o baseline', () => {
    const ms = ['2026-09-30_b11a_x.sql', '2026-09-30_g1c_remove_colunas_users.sql', '2026-10-01_depois.sql'].map((version) => ({ version }));
    expect(versoesDoBaseline(ms, '2026-09-30_g1c_remove_colunas_users.sql'))
      .toEqual(['2026-09-30_b11a_x.sql', '2026-09-30_g1c_remove_colunas_users.sql']);
    expect(BASELINE_ATE).toBe('2026-09-30_g1c_remove_colunas_users.sql');
    // As migrações de teste (900x) ordenam depois do baseline: nunca são adotadas.
    expect(versoesDoBaseline([{ version: '9001-test-probe.sql' }])).toEqual([]);
  });

  it('o baseline é uma migração que existe no diretório real', async () => {
    const versoes = (await readMigrations()).map((m) => m.version);
    expect(versoes).toContain(BASELINE_ATE);
  });

  it('o prpg_test (criado do schema.sql final) está no baseline', async () => {
    const c = await pool.connect();
    try {
      expect(await bancoEstaNoBaseline(c)).toBe(true);
    } finally {
      c.release();
    }
  });

  // Cenário real: banco NOVO criado do schema.sql final, sem schema_migrations.
  // Banco temporário próprio (nunca o prpg nem o prpg_test), derrubado sempre.
  it('banco novo do schema.sql: applyMigrations com as migrações reais não falha e registra todas', async () => {
    const NOME = 'prpg_baseline_teste';
    const URL_BASE = 'postgres://prpg:prpg@localhost:5433';
    const admin = new pg.Client({ connectionString: `${URL_BASE}/postgres` });
    await admin.connect();
    let novo;
    let dirExtra;
    try {
      await admin.query(`DROP DATABASE IF EXISTS ${NOME} WITH (FORCE)`);
      await admin.query(`CREATE DATABASE ${NOME}`);
      novo = new pg.Pool({ connectionString: `${URL_BASE}/${NOME}`, max: 2 });
      const schema = await fs.readFile(new URL('../db/schema.sql', import.meta.url), 'utf8');
      await novo.query(schema);

      const reais = await readMigrations();
      const r1 = await applyMigrations({ pool: novo });
      const posteriores = reais.filter((m) => m.version.localeCompare(BASELINE_ATE) > 0).map((m) => m.version);
      expect(r1.adopted).toEqual(versoesDoBaseline(reais));
      expect(r1.applied).toEqual(posteriores);
      const registradas = (await novo.query('SELECT version, checksum FROM schema_migrations ORDER BY version')).rows;
      expect(registradas.map((x) => x.version).sort()).toEqual(reais.map((m) => m.version).sort());
      expect(Object.fromEntries(registradas.map((x) => [x.version, x.checksum])))
        .toEqual(Object.fromEntries(reais.map((m) => [m.version, m.checksum])));
      // A g1c NÃO rodou (foi adotada): users segue como o schema.sql a criou.
      const { rows: [u] } = await novo.query(
        `SELECT is_nullable FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'pessoa_id'`);
      expect(u.is_nullable).toBe('NO');

      // Segunda execução: nada a fazer, nada adotado de novo.
      const r2 = await applyMigrations({ pool: novo });
      expect(r2).toMatchObject({ applied: [], adopted: [], skipped: reais.length });

      // Migração posterior ao baseline continua rodando normalmente.
      dirExtra = await fs.mkdtemp(path.join(os.tmpdir(), 'prpg-baseline-'));
      for (const m of reais) await fs.writeFile(path.join(dirExtra, m.version), m.sql);
      await fs.writeFile(path.join(dirExtra, '2026-12-31_zz_depois_do_baseline.sql'), 'CREATE TABLE depois_do_baseline (id int);');
      const r3 = await applyMigrations({ pool: novo, migrationsDir: dirExtra });
      expect(r3.applied).toEqual(['2026-12-31_zz_depois_do_baseline.sql']);
      expect(r3.adopted).toEqual([]);

      // Banco no formato antigo (com a cópia em users) não é adotado.
      await novo.query('ALTER TABLE users ADD COLUMN perfil_nome TEXT');
      const c = await novo.connect();
      try {
        expect(await bancoEstaNoBaseline(c)).toBe(false);
      } finally {
        c.release();
      }
    } finally {
      if (dirExtra) await fs.rm(dirExtra, { recursive: true, force: true });
      if (novo) await novo.end();
      await admin.query(`DROP DATABASE IF EXISTS ${NOME} WITH (FORCE)`);
      await admin.end();
    }
  }, 120000);
});
