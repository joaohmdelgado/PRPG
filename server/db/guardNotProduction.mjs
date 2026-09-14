// Trava do seed destrutivo (npm run db:migrate): recusa produção antes de
// qualquer outro módulo do projeto carregar. Precisa ser o PRIMEIRO import de
// migrate.mjs — imports ESM são avaliados antes do corpo do módulo e na ordem
// em que aparecem, e ./pool.js → ../config.js já valida a config (com
// process.exit) e cria o pool no próprio import.
// dotenv entra aqui porque NODE_ENV pode vir só do .env (config.js o carrega
// depois); sem isso a trava não o enxergaria.
import 'dotenv/config';

if (process.env.NODE_ENV === 'production') {
  console.error('[Fatal] O seed destrutivo não pode ser executado em produção.');
  process.exit(1);
}
