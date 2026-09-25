import { query } from '../db/pool.js';

// Resolve um parâmetro `programa` (id OU slug) para o id real do programa.
// Antes havia uma cópia desta função em 8 controllers.
export const resolveProgramaId = async (param) => {
  if (!param) return null;
  const { rows } = await query('SELECT id FROM programas WHERE id = $1 OR slug = $1 LIMIT 1', [param]);
  return rows[0]?.id ?? param;
};

// Regra única de origem das listagens de conteúdo (Fase R.6):
//   ?programa=<id|slug> → só o conteúdo daquele programa
//   ?escopo=prpg        → só o conteúdo geral da PRPG (sem programa)
//   nenhum dos dois     → tudo (comportamento anterior, mantido até a decisão
//                         D-R1 sobre o que o portal agrega)
export async function filtrarPorEscopo(items, q = {}) {
  if (q.programa) {
    const pid = await resolveProgramaId(String(q.programa));
    return items.filter((i) => i.programaId === pid);
  }
  if (q.escopo === 'prpg') return items.filter((i) => !i.programaId);
  return items;
}
