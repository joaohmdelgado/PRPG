import { query } from './pool.js';

// Indicadores por programa e ano (Fase N.9): o que dá para calcular vem da
// view `indicadores_programa_ano` (vínculos e teses); `metricas_anuais` só
// entra para o que não dá (produção, bolsas, taxas) — e, nos calculáveis,
// apenas enquanto o cálculo der zero (cadastro de vínculos ainda incompleto:
// a importação das planilhas é da Fase O). `fontes` diz de onde veio cada valor.
export const CALCULADOS = [
  'docentes', 'docentes_permanentes', 'discentes_mestrado', 'discentes_doutorado',
  'discentes_profissional', 'egressos', 'teses_defendidas', 'dissertacoes_defendidas',
];
// Campos de metricas_anuais que equivalem a um calculado.
const EQUIVALENTE_INFORMADO = {
  docentes_permanentes: 'docentes_permanentes', discentes_mestrado: 'discentes_mestrado',
  discentes_doutorado: 'discentes_doutorado', discentes_profissional: 'discentes_profissional',
  teses_defendidas: 'teses_defendidas',
};
export const SO_INFORMADOS = ['producao_artigos', 'bolsistas_capes', 'taxa_conclusao', 'indice_internacionalizacao', 'observacao'];

const num = (v) => (v == null ? null : Number(v));

export async function indicadoresDoPrograma(programaId) {
  const [{ rows: calc }, { rows: info }] = await Promise.all([
    query('SELECT * FROM indicadores_programa_ano WHERE programa_id = $1 ORDER BY ano DESC', [programaId]),
    query('SELECT * FROM metricas_anuais WHERE programa_id = $1', [programaId]),
  ]);
  const informadoPorAno = new Map(info.map((m) => [m.ano, m]));
  const anos = [...new Set([...calc.map((c) => c.ano), ...info.map((m) => m.ano)])].sort((a, b) => b - a);
  const calcPorAno = new Map(calc.map((c) => [c.ano, c]));

  return anos.map((ano) => {
    const c = calcPorAno.get(ano) || {};
    const m = informadoPorAno.get(ano) || {};
    const linha = { ano };
    const fontes = {};
    for (const campo of CALCULADOS) {
      const calculado = num(c[campo]) || 0;
      const informado = EQUIVALENTE_INFORMADO[campo] ? num(m[EQUIVALENTE_INFORMADO[campo]]) : null;
      if (calculado > 0 || informado == null) {
        linha[campo] = calculado;
        fontes[campo] = 'calculado';
      } else {
        linha[campo] = informado;
        fontes[campo] = 'informado';
      }
    }
    for (const campo of SO_INFORMADOS) {
      linha[campo] = campo === 'observacao' ? (m[campo] ?? null) : num(m[campo]);
      if (linha[campo] != null) fontes[campo] = 'informado';
    }
    linha.fontes = fontes;
    return linha;
  });
}
