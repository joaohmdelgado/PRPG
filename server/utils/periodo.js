// Período escrito à mão -> datas (Fase N.6). Aceita "02/03/2026 a 06/03/2026",
// "até 24/04/2026", "09/03/2026" e, com `anoPadrao`, datas sem ano ("09/03").
// A última data é o fim; a primeira é o início — exceto em "até ...", que é
// só prazo final. Sem data reconhecível: { inicio: null, fim: null }.
const DATA = /(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?/g;

const iso = (d, m, a) => {
  const dia = Number(d);
  const mes = Number(m);
  const ano = Number(a);
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  if (!ano || data.getUTCMonth() !== mes - 1 || data.getUTCDate() !== dia) return null; // 31/02 etc.
  return `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
};

export function periodoDeTexto(texto, anoPadrao = null) {
  const datas = [...String(texto || '').matchAll(DATA)]
    .map(([, d, m, a]) => iso(d, m, a || anoPadrao))
    .filter(Boolean);
  if (!datas.length) return { inicio: null, fim: null };
  const soPrazo = /^\s*at[eé](?=\s|$)/i.test(String(texto)); // \b não vale depois de "é"
  return { inicio: soPrazo ? null : datas[0], fim: datas[datas.length - 1] };
}
