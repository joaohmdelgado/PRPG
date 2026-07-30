// Fase C (PNPD, PLANO.md) — ver requisitos-pnpd.md §10.1.
export const SITUACOES = [
  { value: 'VIGENTE', label: 'Vigente', color: 'bg-green-100 text-green-800' },
  { value: 'APROVADO', label: 'A iniciar', color: 'bg-sky-100 text-sky-800' },
  { value: 'EM_ANALISE', label: 'Em análise', color: 'bg-gray-100 text-gray-700' },
  { value: 'PRORROGADO', label: 'Prorrogado', color: 'bg-violet-100 text-violet-800' },
  { value: 'ENCERRADO', label: 'Encerrado', color: 'bg-slate-100 text-slate-700' },
  { value: 'ENCERRADO_SEM_RELATORIO', label: 'Sem relatório', color: 'bg-amber-100 text-amber-800' },
  { value: 'INTERROMPIDO', label: 'Interrompido', color: 'bg-rose-100 text-rose-800' },
  { value: 'INDEFERIDO', label: 'Indeferido', color: 'bg-rose-100 text-rose-800' },
  { value: 'CANCELADO', label: 'Cancelado', color: 'bg-rose-100 text-rose-800' },
];

export const situacaoInfo = (situacao) => SITUACOES.find((s) => s.value === situacao) || SITUACOES[0];

export const SITUACOES_MANUAIS = ['EM_ANALISE', 'INTERROMPIDO', 'INDEFERIDO', 'CANCELADO'];

export const MODALIDADES = [
  { value: 'VOLUNTARIO', label: 'Voluntário' },
  { value: 'BOLSISTA_PNPD_CAPES', label: 'Bolsista PNPD/CAPES' },
  { value: 'BOLSISTA_FACEPE', label: 'Bolsista FACEPE' },
  { value: 'BOLSISTA_CNPQ', label: 'Bolsista CNPq' },
  { value: 'BOLSISTA_OUTRA_AGENCIA', label: 'Bolsista de outra agência' },
  { value: 'SENIOR', label: 'Sênior' },
  { value: 'EMPRESARIAL', label: 'Empresarial' },
];
