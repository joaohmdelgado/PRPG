import { describe, it, expect, beforeEach, afterEach, afterAll } from 'vitest';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { pool } from '../db/pool.js';
import { applyMigrations } from '../db/migrateRunner.mjs';

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
