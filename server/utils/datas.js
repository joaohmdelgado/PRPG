// Fase A.3 (G7, PLANO.md): utilitários para o padrão de datas do projeto —
// colunas DATE saem/entram como string 'YYYY-MM-DD', nunca como objeto Date
// (evita deslocamento de fuso). O parser em server/db/pool.js garante a
// leitura; as funções aqui cobrem escrita e comparação.

// Normaliza um valor de formulário para gravação numa coluna DATE: '' e
// undefined viram null (uma coluna DATE não aceita string vazia).
export const dateOrNull = (v) => (v === '' || v == null ? null : v);

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
