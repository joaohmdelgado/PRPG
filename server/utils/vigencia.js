// Fase A.10 (G9, PLANO.md): situação derivada de data_inicio/data_fim, com
// override manual — regra única, usada por vínculo (aqui) e, mais adiante,
// por pos_doutorado e ato (mesma lógica, mesmo formato de datas 'YYYY-MM-DD').
import { hojeISO } from './datas.js';

// dataInicio/dataFim: 'YYYY-MM-DD' ou null. situacaoManual, quando presente,
// vence a derivação (ex.: 'RENUNCIA' antes do fim previsto do mandato).
export const derivarSituacao = ({ dataInicio, dataFim, situacaoManual }, hoje = hojeISO()) => {
  if (situacaoManual) return situacaoManual;
  if (dataInicio && hoje < dataInicio) return 'FUTURO';
  if (dataFim && hoje > dataFim) return 'ENCERRADO';
  return 'VIGENTE';
};
