// Fase E (Expedientes, PLANO.md) — ver requisitos-expedientes.md §5/§8.
export const SITUACOES = [
  { value: 'RESERVADO', label: 'Reservado', color: 'bg-gray-100 text-gray-700' },
  { value: 'EMITIDO', label: 'Emitido', color: 'bg-sky-100 text-sky-800' },
  { value: 'PUBLICADO', label: 'Publicado', color: 'bg-emerald-100 text-emerald-800' },
  { value: 'CANCELADO', label: 'Cancelado', color: 'bg-gray-200 text-gray-500' },
  { value: 'SEM_EFEITO', label: 'Sem efeito', color: 'bg-red-100 text-red-700' },
  { value: 'RETIFICADO', label: 'Retificado', color: 'bg-amber-100 text-amber-800' },
];

export const situacaoInfo = (situacao) => SITUACOES.find((s) => s.value === situacao) || SITUACOES[0];

export const TIPOS_REFERENCIA = [
  { value: 'REVOGA', label: 'Revoga' },
  { value: 'TORNA_SEM_EFEITO', label: 'Torna sem efeito' },
  { value: 'RETIFICA', label: 'Retifica' },
  { value: 'PUBLICA', label: 'Publica' },
  { value: 'ENCAMINHA', label: 'Encaminha' },
  { value: 'COMPLEMENTA', label: 'Complementa' },
  { value: 'FUNDAMENTA', label: 'Fundamenta' },
];
