// Formatação de datas do painel. Uma só implementação (antes havia uma cópia em
// cada tela de lista). As datas do banco chegam como 'AAAA-MM-DD' (ver
// server/db/pool.js): formatar por texto evita o deslocamento de fuso.

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

// '2026-03-05' → '05/03/2026'; outro texto passa direto; vazio → `vazio`.
export const dataCurta = (iso, vazio = '—') => {
  if (!iso) return vazio;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso));
  return m ? `${m[3]}/${m[2]}/${m[1]}` : String(iso);
};

// '2026-03-05' → '5 de Março, 2026'.
export const dataLonga = (iso, vazio = '') => {
  if (!iso) return vazio;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso));
  return m ? `${parseInt(m[3], 10)} de ${MESES[parseInt(m[2], 10) - 1]}, ${m[1]}` : String(iso);
};

// Período "01/02/2026 até 30/06/2026", ou só uma das pontas.
export const periodo = (inicio, fim, vazio = '—') => {
  const a = dataCurta(inicio, '');
  const b = dataCurta(fim, '');
  return a && b ? `${a} até ${b}` : (a || b || vazio);
};
