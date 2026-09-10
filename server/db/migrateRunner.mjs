import { createHash } from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from './pool.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_MIGRATIONS_DIR = path.join(__dirname, 'migrations');
const MIGRATION_FILE = /^\d{4}[-_]?[a-z0-9][a-z0-9_.-]*\.sql$/i;

const checksum = (sql) => createHash('sha256').update(sql).digest('hex');

export async function readMigrations(migrationsDir = DEFAULT_MIGRATIONS_DIR) {
  const entries = await fs.readdir(migrationsDir, { withFileTypes: true });
  const names = entries
    .filter((entry) => entry.isFile() && MIGRATION_FILE.test(entry.name))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));

  return Promise.all(names.map(async (version) => {
    const sql = await fs.readFile(path.join(migrationsDir, version), 'utf8');
    if (!sql.trim()) throw new Error(`Migração vazia: ${version}`);
    return { version, sql, checksum: checksum(sql) };
  }));
}

export async function applyMigrations({ pool: dbPool = pool, migrationsDir = DEFAULT_MIGRATIONS_DIR } = {}) {
  const migrations = await readMigrations(migrationsDir);
  const client = await dbPool.connect();
  let locked = false;
  try {
    await client.query("SELECT pg_advisory_lock(hashtext('prpg-schema-migrations'))");
    locked = true;
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version text PRIMARY KEY,
        checksum text NOT NULL,
        applied_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    const { rows } = await client.query('SELECT version, checksum FROM schema_migrations');
    const applied = new Map(rows.map((row) => [row.version, row.checksum]));
    const justApplied = [];

    for (const migration of migrations) {
      const knownChecksum = applied.get(migration.version);
      if (knownChecksum) {
        if (knownChecksum !== migration.checksum) {
          throw new Error(`Migração ${migration.version} possui checksum divergente; crie uma nova migração, não altere uma já aplicada.`);
        }
        continue;
      }

      await client.query('BEGIN');
      try {
        await client.query(migration.sql);
        await client.query(
          'INSERT INTO schema_migrations (version, checksum) VALUES ($1, $2)',
          [migration.version, migration.checksum]
        );
        await client.query('COMMIT');
        justApplied.push(migration.version);
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    }
    return { applied: justApplied, skipped: migrations.length - justApplied.length };
  } finally {
    if (locked) await client.query("SELECT pg_advisory_unlock(hashtext('prpg-schema-migrations'))");
    client.release();
  }
}

async function main() {
  const result = await applyMigrations();
  console.log(`[DB] Migrações aplicadas: ${result.applied.length}; já existentes: ${result.skipped}.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main()
    .catch((error) => {
      console.error(`[DB] Falha ao aplicar migrações: ${error.message}`);
      process.exitCode = 1;
    })
    .finally(() => pool.end());
}
