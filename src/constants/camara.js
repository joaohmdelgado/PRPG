// Vocabulário e rótulos do módulo Câmara de Pós-Graduação.
// Espelha STATUS_PROCESSO em server/controllers/camaraController.js — a
// validação real é feita no backend; aqui é só apresentação (rótulo + cor).
export const STATUS_INFO = {
  RECEBIDO: { label: 'Recebido', classes: 'bg-gray-100 text-gray-700' },
  EM_INSTRUCAO: { label: 'Em instrução', classes: 'bg-gray-100 text-gray-700' },
  APTO_PAUTA: { label: 'Apto para pauta', classes: 'bg-sky-100 text-sky-800' },
  RELATOR_DESIGNADO: { label: 'Com o relator', classes: 'bg-amber-100 text-amber-800' },
  PARECER_RECEBIDO: { label: 'Parecer recebido', classes: 'bg-amber-100 text-amber-800' },
  PAUTADO: { label: 'Pautado', classes: 'bg-sky-100 text-sky-800' },
  DELIBERADO: { label: 'Deliberado', classes: 'bg-indigo-100 text-indigo-800' },
  ATO_LAVRADO: { label: 'Ato lavrado', classes: 'bg-indigo-100 text-indigo-800' },
  PUBLICADO: { label: 'Publicado', classes: 'bg-green-100 text-green-800' },
  RESOLVIDO: { label: 'Resolvido', classes: 'bg-green-100 text-green-800' },
  ARQUIVADO: { label: 'Arquivado', classes: 'bg-slate-100 text-slate-700' },
  RETIRADO_DE_PAUTA: { label: 'Retirado de pauta', classes: 'bg-rose-100 text-rose-800' },
  EM_DILIGENCIA: { label: 'Em diligência', classes: 'bg-rose-100 text-rose-800' },
  PEDIDO_VISTA: { label: 'Pedido de vista', classes: 'bg-rose-100 text-rose-800' },
  SOBRESTADO: { label: 'Sobrestado', classes: 'bg-rose-100 text-rose-800' },
  ADIADO: { label: 'Adiado', classes: 'bg-rose-100 text-rose-800' },
  AD_REFERENDUM: { label: 'Ad referendum', classes: 'bg-violet-100 text-violet-800' },
  APENSADO: { label: 'Apensado', classes: 'bg-slate-100 text-slate-700' },
  ENCAMINHADO_INSTANCIA_SUPERIOR: { label: 'Encaminhado (CEPE/CONSU)', classes: 'bg-violet-100 text-violet-800' },
  EM_MANIFESTACAO_JURIDICA: { label: 'Manifestação jurídica', classes: 'bg-rose-100 text-rose-800' },
  EM_RECURSO: { label: 'Em recurso', classes: 'bg-rose-100 text-rose-800' },
};

export const STATUS_OPTIONS = Object.keys(STATUS_INFO);

export const statusLabel = (status) => STATUS_INFO[status]?.label || status || '—';
export const statusClasses = (status) => STATUS_INFO[status]?.classes || 'bg-gray-100 text-gray-700';

export const DELIBERACAO_OPTIONS = [
  'APROVADO', 'APROVADO_RESSALVAS', 'INDEFERIDO', 'DILIGENCIA',
  'RETIRADO', 'SOBRESTADO', 'ENCAMINHADO', 'HOMOLOGADO',
];

export const DELIBERACAO_LABELS = {
  APROVADO: 'Aprovado', APROVADO_RESSALVAS: 'Aprovado com ressalvas', INDEFERIDO: 'Indeferido',
  DILIGENCIA: 'Convertido em diligência', RETIRADO: 'Retirado', SOBRESTADO: 'Sobrestado',
  ENCAMINHADO: 'Encaminhado', HOMOLOGADO: 'Homologado',
};

export const TIPO_EVENTO_LABELS = {
  TRAMITACAO: 'Tramitação', STATUS: 'Status', RELATORIA: 'Relatoria', PAUTA: 'Pauta',
  PARECER: 'Parecer', DELIBERACAO: 'Deliberação', ATO: 'Ato', NOTA: 'Nota', COBRANCA: 'Cobrança',
};

export const EVENTO_TIPOS_MANUAIS = ['NOTA', 'COBRANCA', 'TRAMITACAO'];

// Formata 'YYYY-MM-DD' sem deslocamento de fuso.
export const fmtData = (iso) => {
  if (!iso) return '—';
  const s = String(iso).slice(0, 10);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return s;
  return `${m[3]}/${m[2]}/${m[1]}`;
};
