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

// B.13 / G1 (docs/analise-g1-users-credencial.md §4.12): o schema.sql reflete o
// banco depois de TODAS as migrações até esta (inclusive). Um banco novo criado
// dele não precisa — e nem conseguiria — rodá-las: a b11a e a g1a leem colunas
// de `users` que a g1c removeu, e as de antes de 30/09 alteram tabelas que o
// schema.sql já não tem (ex.: programa_paginas). Migração nova entra DEPOIS desta
// na ordem e é aplicada normalmente.
export const BASELINE_ATE = '2026-09-30_g1c_remove_colunas_users.sql';

// Migrações já refletidas no schema.sql (até o baseline), na ordem do runner.
export const versoesDoBaseline = (migrations, baselineAte = BASELINE_ATE) =>
  migrations.map((m) => m.version).filter((v) => v.localeCompare(baselineAte) <= 0);

// O banco foi criado do schema.sql final: tem o que a G1 acrescentou
// (pessoas.priv_mostrar_email) e não tem o que ela removeu (users.perfil_nome).
export async function bancoEstaNoBaseline(client) {
  const { rows: [r] } = await client.query(`
    SELECT EXISTS (SELECT 1 FROM information_schema.columns
                    WHERE table_schema = 'public' AND table_name = 'pessoas' AND column_name = 'priv_mostrar_email') AS tem_novo,
           NOT EXISTS (SELECT 1 FROM information_schema.columns
                        WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'perfil_nome') AS sem_antigo`);
  return r.tem_novo && r.sem_antigo;
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
    const adopted = [];

    // Banco novo criado do schema.sql final (nenhuma migração registrada): as
    // migrações até o baseline já estão nele — registra-as sem rodar. Só quando
    // schema_migrations está VAZIA: um banco que já usa o runner segue o caminho normal.
    if (applied.size === 0 && await bancoEstaNoBaseline(client)) {
      const doBaseline = new Set(versoesDoBaseline(migrations));
      await client.query('BEGIN');
      try {
        for (const migration of migrations.filter((m) => doBaseline.has(m.version))) {
          await client.query(
            'INSERT INTO schema_migrations (version, checksum) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [migration.version, migration.checksum]
          );
          applied.set(migration.version, migration.checksum);
          adopted.push(migration.version);
        }
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    }

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
    // `skipped` conta também as adotadas (não rodaram nesta execução).
    return { applied: justApplied, adopted, skipped: migrations.length - justApplied.length };
  } finally {
    if (locked) await client.query("SELECT pg_advisory_unlock(hashtext('prpg-schema-migrations'))");
    client.release();
  }
}

async function main() {
  const result = await applyMigrations();
  if (result.adopted.length) {
    console.log(`[DB] Banco criado do schema.sql: ${result.adopted.length} migração(ões) até ${BASELINE_ATE} registradas sem rodar.`);
  }
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
