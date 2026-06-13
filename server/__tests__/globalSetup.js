import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Cria um banco de teste limpo (prpg_test) e aplica o schema antes da suíte.
export default async function setup() {
  const admin = new pg.Client({ connectionString: 'postgres://prpg:prpg@localhost:5433/prpg' });
  try {
    await admin.connect();
  } catch (e) {
    throw new Error(
      'Não foi possível conectar ao PostgreSQL em localhost:5433. ' +
      'Suba o banco com "npm run db:up" antes de rodar os testes.\n' + e.message
    );
  }
  await admin.query('DROP DATABASE IF EXISTS prpg_test');
  await admin.query('CREATE DATABASE prpg_test');
  await admin.end();

  const schema = fs.readFileSync(path.join(__dirname, '../db/schema.sql'), 'utf8');
  const testDb = new pg.Client({ connectionString: 'postgres://prpg:prpg@localhost:5433/prpg_test' });
  await testDb.connect();
  await testDb.query(schema);
  await testDb.end();
}
