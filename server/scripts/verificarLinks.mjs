// Fase O.7: verificador periódico de links — para rodar por cron (ex.: 1x por
// semana): `npm run links`. Confere as URLs em uso no conteúdo e grava o
// resultado em links_verificados (painel Qualidade dos dados). Sai com código 0
// mesmo havendo links quebrados: achar link quebrado é o resultado, não falha.
import 'dotenv/config';
import { pool } from '../db/pool.js';
import { verificarLinks } from '../services/verificadorLinks.js';

try {
  const r = await verificarLinks({ aoProgredir: (e) => { if (e.feitos % 25 === 0) console.log(`[Links] ${e.feitos}/${e.total}`); } });
  console.log('[Links]', r.ocupado ? 'já em andamento' : `concluído: ${JSON.stringify(r)}`);
} catch (e) {
  console.error('[Links] falhou:', e.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
