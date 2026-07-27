// Fase A.5b (PLANO.md): normalização de e-mail e telefone para a tabela
// `contatos`. `valor` é sempre a forma normalizada (comparável/deduplicável);
// `valor_exibicao` é a forma formatada para leitura humana.

export const normalizarEmail = (v) => (v || '').trim().toLowerCase() || null;

// Mantém só dígitos, com DDD (ex.: '(81) 99611-6668' -> '81996116668').
export const normalizarTelefone = (v) => {
  const digitos = String(v || '').replace(/\D/g, '');
  return digitos || null;
};

// Formata um telefone já normalizado (10 ou 11 dígitos) para exibição.
export const formatarTelefone = (digitos) => {
  const d = String(digitos || '').replace(/\D/g, '');
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return digitos || null;
};
