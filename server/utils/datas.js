// Fase A.3 (G7, PLANO.md): utilitários para o padrão de datas do projeto —
// colunas DATE saem/entram como string 'YYYY-MM-DD', nunca como objeto Date
// (evita deslocamento de fuso). O parser em server/db/pool.js garante a
// leitura; as funções aqui cobrem escrita e comparação.

// Normaliza um valor de formulário para gravação numa coluna DATE: '' e
// undefined viram null (uma coluna DATE não aceita string vazia).
export const dateOrNull = (v) => (v === '' || v == null ? null : v);

const MESES_PT = {
  janeiro: 1, fevereiro: 2, 'março': 3, marco: 3, abril: 4, maio: 5, junho: 6,
  julho: 7, agosto: 8, setembro: 9, outubro: 10, novembro: 11, dezembro: 12,
};

// Normaliza uma data vinda do seed/legado para 'YYYY-MM-DD'. Aceita ISO e o
// formato por extenso do site antigo ("20 de Março, 2026", "2 de março de
// 2026"). '' e null viram null. Qualquer outra coisa volta intacta — a coluna
// DATE recusa e o cliente recebe 400 (ver pgClientError), em vez de o valor
// ser descartado em silêncio.
export const parseDataPt = (v) => {
  if (v === '' || v == null) return null;
  const s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{1,2})\s+de\s+([a-zà-ú]+),?\s+(?:de\s+)?(\d{4})$/i);
  const mes = m && MESES_PT[m[2].toLowerCase()];
  if (!mes) return v;
  return `${m[3]}-${String(mes).padStart(2, '0')}-${m[1].padStart(2, '0')}`;
};

// Data de hoje no fuso de Recife, como 'YYYY-MM-DD' (para comparações de
// vigência/prazo). Não usar `new Date().toISOString()`: desloca a data perto
// da meia-noite conforme o fuso do servidor.
export const hojeISO = () => {
  try {
    return new Intl.DateTimeFormat('fr-CA', {
      timeZone: 'America/Recife', year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(new Date());
  } catch {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
};
