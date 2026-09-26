// Fase O.4: quando uma planilha pode deixar de ser a fonte da verdade.
// Critério (docs/aposentadoria-planilhas.md; proposto na oficina, O.1 §5):
//   1. a importação inicial foi gravada;
//   2. nenhuma pendência aberta de decisão que muda o dado (as ★ da oficina);
//   3. um ciclo inteiro em paralelo (registra-se no sistema E na planilha) —
//      na Câmara, o ciclo precisa conter ao menos uma reunião;
//   4. ao fim do ciclo, a simulação com a planilha do dia não tem divergência:
//      nenhuma linha nova (registrada só na planilha), nenhuma alterada depois
//      da importação, nenhum conflito com o sistema.
// Cumpridos os quatro, a planilha pode passar a "somente leitura".
import { query } from '../../db/pool.js';
import { hojeISO } from '../../utils/datas.js';

// Decisões que mudam o dado importado (as ★ de docs/oficina-decisoes-planilhas.md).
export const DECISOES_BLOQUEANTES = {
  contatos: ['D-G2', 'D-G3', 'D-G5/D-G6'],
  expedientes: ['D-E2', 'D-E3', 'D-E5'],
  camara: ['D-B1', 'D-G8'],
  pnpd: ['D-C3', 'D-C8', 'D-C9'],
};

const addDias = (iso, n) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

export const SITUACOES_PLANILHA = ['EM_USO', 'PARALELO', 'SOMENTE_LEITURA'];

export async function avaliarAposentadoria(fonte, hoje = hojeISO()) {
  const { rows } = await query('SELECT * FROM planilhas WHERE fonte = $1', [fonte]);
  const pl = rows[0];
  if (!pl) return null;
  const criterios = [];

  const { rows: grav } = await query(
    `SELECT executado_em FROM importacoes WHERE fonte = $1 AND NOT simulacao AND erro IS NULL ORDER BY executado_em LIMIT 1`, [fonte]);
  criterios.push({ id: 'importada', rotulo: 'Importação inicial gravada', ok: !!grav[0],
    detalhe: grav[0] ? `em ${new Date(grav[0].executado_em).toLocaleDateString('pt-BR')}` : 'ainda não importada' });

  const bloqueantes = DECISOES_BLOQUEANTES[fonte] || [];
  const { rows: pend } = await query(
    `SELECT decisao, count(*)::int AS n FROM importacao_pendencias
     WHERE fonte = $1 AND situacao = 'ABERTA' AND decisao = ANY($2) GROUP BY decisao ORDER BY decisao`, [fonte, bloqueantes]);
  criterios.push({ id: 'decisoes', rotulo: `Sem pendência aberta das decisões ${bloqueantes.join(', ')}`, ok: pend.length === 0,
    detalhe: pend.length ? pend.map((p) => `${p.n} de ${p.decisao}`).join(', ') : 'nenhuma' });

  const fimCiclo = pl.paralelo_desde ? addDias(pl.paralelo_desde, pl.ciclo_dias) : null;
  let cicloOk = pl.situacao !== 'EM_USO' && !!fimCiclo && hoje >= fimCiclo;
  let detalheCiclo = pl.situacao === 'EM_USO' ? 'o paralelo ainda não começou'
    : `${pl.ciclo_dias} dias a partir de ${pl.paralelo_desde.split('-').reverse().join('/')}; termina em ${fimCiclo.split('-').reverse().join('/')}`;
  if (fonte === 'camara' && pl.paralelo_desde) {
    const { rows: reun } = await query(
      `SELECT count(*)::int AS n FROM camara_reunioes WHERE data > $1 AND data <= $2 AND status <> 'CANCELADA'`, [pl.paralelo_desde, hoje]);
    if (!reun[0].n) { cicloOk = false; detalheCiclo += '; nenhuma reunião no período ainda'; }
    else detalheCiclo += `; ${reun[0].n} reunião(ões) no período`;
  }
  criterios.push({ id: 'ciclo', rotulo: 'Um ciclo completo em paralelo', ok: cicloOk, detalhe: detalheCiclo });

  let simulacao = null;
  if (fimCiclo) {
    const { rows: sims } = await query(
      `SELECT id, resumo, executado_em FROM importacoes
       WHERE fonte = $1 AND simulacao AND erro IS NULL AND executado_em::date >= $2
       ORDER BY executado_em DESC LIMIT 1`, [fonte, fimCiclo]);
    simulacao = sims[0] || null;
  }
  const div = simulacao ? ['criado', 'divergente', 'conflito'].reduce((a, k) => a + (simulacao.resumo?.[k] || 0), 0) : null;
  criterios.push({
    id: 'divergencia', rotulo: 'Simulação ao fim do ciclo sem divergência', ok: simulacao ? div === 0 : false,
    detalhe: !fimCiclo ? 'depende do ciclo'
      : !simulacao ? `rode a simulação com a planilha do dia a partir de ${fimCiclo.split('-').reverse().join('/')}`
        : div === 0 ? 'nenhuma linha nova, alterada ou em conflito'
          : `${simulacao.resumo.criado || 0} nova(s), ${simulacao.resumo.divergente || 0} alterada(s), ${simulacao.resumo.conflito || 0} em conflito`,
    importacaoId: simulacao?.id || null,
  });

  return {
    fonte, nome: pl.nome, situacao: pl.situacao, cicloDias: pl.ciclo_dias,
    paraleloDesde: pl.paralelo_desde, somenteLeituraDesde: pl.somente_leitura_desde, observacao: pl.observacao,
    fimCiclo, criterios, apta: criterios.every((c) => c.ok),
  };
}

// Divergências da última simulação: o que a planilha tem e o sistema não.
export async function divergencias(fonte) {
  const { rows } = await query(
    `SELECT id, executado_em, relatorio FROM importacoes WHERE fonte = $1 AND simulacao AND erro IS NULL
     ORDER BY executado_em DESC LIMIT 1`, [fonte]);
  if (!rows[0]) return null;
  const itens = Array.isArray(rows[0].relatorio) ? rows[0].relatorio : (rows[0].relatorio?.itens || []);
  return {
    importacaoId: rows[0].id, executadoEm: rows[0].executado_em,
    itens: itens.filter((i) => ['criado', 'divergente', 'conflito'].includes(i.acao)),
  };
}
