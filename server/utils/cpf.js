// Fase A.14 (PLANO.md): normalização e validação de CPF, compartilhada por
// pessoas.cpf/cpf_valido — o dígito verificador inválido é um AVISO, nunca
// um bloqueio (mesmo padrão do NUP em utils/nup.js): o acervo real tem CPFs
// mal digitados que não podem travar o cadastro.

// Sempre 11 dígitos, sem máscara. '5252951438' (10 dígitos, zero à esquerda
// perdido em planilha) -> '05252951438'.
export const normalizarCpf = (v) => {
  const digitos = String(v || '').replace(/\D/g, '');
  if (!digitos) return null;
  return digitos.padStart(11, '0');
};

// Algoritmo padrão do dígito verificador (dois dígitos, módulo 11).
const calcularDigito = (base) => {
  let soma = 0;
  let peso = base.length + 1;
  for (const d of base) soma += Number(d) * peso--;
  const resto = soma % 11;
  return resto < 2 ? 0 : 11 - resto;
};

// FALSE = DV não confere OU sequência repetida ('00000000000') — não impede
// o cadastro, só marca cpf_valido=false para revisão posterior.
export const cpfValido = (v) => {
  const cpf = normalizarCpf(v);
  if (!cpf || cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;
  const d1 = calcularDigito(cpf.slice(0, 9));
  const d2 = calcularDigito(cpf.slice(0, 9) + d1);
  return cpf === cpf.slice(0, 9) + String(d1) + String(d2);
};
