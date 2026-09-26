// Fase O.6/O.7 (docs/revisao-portal-conteudo-2026-09-24.md): painéis do admin.
//   GET /api/painel/pendencias — o que a secretaria precisa fazer, calculado
//     dos dados na hora (não depende de o agendador ter rodado): substitui
//     "ver na planilha o que falta".
//   GET /api/painel/qualidade  — problemas nos dados (ver qualidadeController).
// Admin/Gestor veem tudo; Gestor de Programa, só o que é do seu programa.
import { query } from '../db/pool.js';
import { hojeISO } from '../utils/datas.js';
import { sqlPublicado } from '../utils/publicacao.js';
import { isProgramaScoped } from '../middleware/authMiddleware.js';
import { posDoutoradoRepo } from '../db/posDoutoradoRepo.js';
import { estadoDoAgendador } from '../services/agendador.js';

const LIMITE_ITENS = 8;
const addDias = (iso, n) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const diasEntre = (a, b) => Math.round((new Date(b) - new Date(a)) / 86400000);
const fmt = (iso) => (iso ? String(iso).split('-').reverse().join('/') : '—');

// As 11 tabelas com envelope de publicação: rota de listagem e de edição no painel.
const CONTEUDOS = {
  news: { rotulo: 'Notícias', lista: '/admin/noticias', editar: '/admin/noticias/editar/', programa: true },
  editais: { rotulo: 'Editais', lista: '/admin/editais', editar: '/admin/editais/editar/', programa: true },
  resolucoes: { rotulo: 'Resoluções', lista: '/admin/resolucoes', editar: '/admin/resolucoes/editar/', programa: true },
  formularios: { rotulo: 'Formulários', lista: '/admin/formularios', editar: '/admin/formularios/editar/', programa: true },
  pages: { rotulo: 'Páginas', lista: '/admin/paginas', editar: '/admin/paginas/editar/', programa: true },
  faq: { rotulo: 'FAQ', lista: '/admin/faq', editar: '/admin/faq/editar/', programa: true },
  disciplinas: { rotulo: 'Disciplinas', lista: '/admin/disciplinas', editar: '/admin/disciplinas/editar/', programa: true },
  teses_dissertacoes: { rotulo: 'Teses e dissertações', lista: '/admin/teses-dissertacoes', editar: '/admin/teses-dissertacoes/editar/', programa: true },
  grupos_pesquisa: { rotulo: 'Grupos de pesquisa', lista: '/admin/grupos-pesquisa', editar: '/admin/grupos-pesquisa/editar/', programa: true },
  bolsas: { rotulo: 'Bolsas', lista: '/admin/bolsas', editar: '/admin/bolsas/editar/', programa: false },
  calendarios: { rotulo: 'Calendários', lista: '/admin/calendarios', editar: '/admin/calendarios/editar/', programa: false },
};

// severidade: alta (atrasado / precisa de ação hoje), media (vence logo),
// info (para conferir quando der).
const secao = (id, titulo, severidade, itens, { total = itens.length, link = null, vazio = null } = {}) => ({
  id, titulo, severidade, total, link, vazio, itens: itens.slice(0, LIMITE_ITENS),
});

export const getPendencias = async (req, res) => {
  const hoje = hojeISO();
  const escopado = isProgramaScoped(req.user);
  if (escopado && !req.user.programaId) return res.status(403).json({ message: 'Gestor sem programa vinculado.' });
  const programaId = escopado ? req.user.programaId : null;
  const secoes = [];

  // ---- Câmara: relatorias (só a PRPG)
  if (!escopado) {
    const { rows: rel } = await query(
      `SELECT r.id, r.relator_nome, r.prazo_devolucao, p.id AS processo_id, p.numero
         FROM camara_relatorias r JOIN processos p ON p.id = r.processo_id
        WHERE r.ativa AND r.data_devolucao IS NULL AND r.prazo_devolucao IS NOT NULL AND r.prazo_devolucao <= $1
        ORDER BY r.prazo_devolucao`, [addDias(hoje, 7)]);
    const atrasadas = rel.filter((r) => r.prazo_devolucao < hoje);
    const item = (r) => ({
      rotulo: `${r.relator_nome} — ${r.numero}`,
      detalhe: r.prazo_devolucao < hoje ? `${diasEntre(r.prazo_devolucao, hoje)} dia(s) de atraso (prazo ${fmt(r.prazo_devolucao)})` : `vence em ${fmt(r.prazo_devolucao)}`,
      link: `/admin/camara/${r.processo_id}`,
    });
    secoes.push(secao('relatorias_atrasadas', 'Relatorias atrasadas', 'alta', atrasadas.map(item), { link: '/admin/camara', vazio: 'Nenhuma relatoria atrasada.' }));
    secoes.push(secao('relatorias_vencendo', 'Relatorias que vencem em até 7 dias', 'media', rel.filter((r) => r.prazo_devolucao >= hoje).map(item), { link: '/admin/camara' }));

    const { rows: aClass } = await query(
      `SELECT id, numero, assunto FROM processos WHERE status = 'A_CLASSIFICAR' ORDER BY numero`);
    secoes.push(secao('processos_a_classificar', 'Processos importados a classificar (D-B1)', 'info',
      aClass.map((p) => ({ rotulo: p.numero, detalhe: String(p.assunto || '').slice(0, 90), link: `/admin/camara/${p.id}` })),
      { link: '/admin/planilhas/revisao?fonte=camara' }));

    // ---- Expedientes: reservas de número em aberto
    const { rows: res } = await query(
      `SELECT a.id, a.ano, a.sequencial, a.assunto, a.criado_em, s.sigla, s.nome
         FROM atos a JOIN ato_series s ON s.id = a.serie_id
        WHERE a.situacao = 'RESERVADO' ORDER BY a.criado_em`);
    const idade = (a) => Math.floor((Date.now() - new Date(a.criado_em).getTime()) / 86400000);
    secoes.push(secao('reservas_abertas', 'Números reservados e não usados', res.some((a) => idade(a) > 15) ? 'alta' : 'media',
      res.map((a) => ({
        rotulo: `${a.sigla || a.nome} Nº ${a.sequencial}/${a.ano}`,
        detalhe: `reservado há ${idade(a)} dia(s)${a.assunto ? ` — ${String(a.assunto).slice(0, 70)}` : ''}`,
        link: `/admin/atos/${a.id}`,
      })), { link: '/admin/atos', vazio: 'Nenhuma reserva em aberto.' }));

    // ---- Vigências: mandatos e portarias vencendo em 30 dias
    const { rows: mand } = await query(
      `SELECT v.id, v.papel, v.data_fim_mandato, pr.sigla, pr.nome AS programa_nome, pr.id AS programa_id,
              COALESCE(pe.nome, u.perfil_nome) AS pessoa
         FROM vinculos v
         LEFT JOIN programas pr ON pr.id = v.programa_id
         LEFT JOIN pessoas pe ON pe.id = v.pessoa_id
         LEFT JOIN users u ON u.id = v.pessoa_id
        WHERE v.ativo AND v.data_fim_mandato BETWEEN $1 AND $2
          AND v.papel IN ('COORDENADOR_ATUAL', 'COORDENADOR', 'VICE_COORDENADOR', 'SUBSTITUTO')
        ORDER BY v.data_fim_mandato`, [hoje, addDias(hoje, 30)]);
    secoes.push(secao('mandatos_vencendo', 'Mandatos de coordenação que vencem em 30 dias', 'media',
      mand.map((m) => ({
        rotulo: `${m.pessoa || '—'} — ${m.papel.replace(/_/g, ' ').toLowerCase()} ${m.sigla && m.sigla !== 'S/SIGLA' ? m.sigla : (m.programa_nome || '')}`,
        detalhe: `até ${fmt(m.data_fim_mandato)}`, link: m.programa_id ? `/admin/programas/editar/${m.programa_id}` : null,
      }))));
    const { rows: port } = await query(
      `SELECT a.id, a.ano, a.sequencial, a.assunto, a.vigencia_fim, s.sigla FROM atos a JOIN ato_series s ON s.id = a.serie_id
        WHERE a.situacao IN ('EMITIDO', 'PUBLICADO') AND a.vigencia_fim BETWEEN $1 AND $2 ORDER BY a.vigencia_fim`, [hoje, addDias(hoje, 30)]);
    secoes.push(secao('atos_vencendo', 'Portarias e atos que vencem em 30 dias', 'media',
      port.map((a) => ({ rotulo: `${a.sigla} Nº ${a.sequencial}/${a.ano}`, detalhe: `até ${fmt(a.vigencia_fim)} — ${String(a.assunto || '').slice(0, 70)}`, link: `/admin/atos/${a.id}` }))));
  }

  // ---- Pós-doutorado: vencendo (90 dias) e sem relatório
  const posdocs = await posDoutoradoRepo.getAll(programaId ? { programa: programaId } : {});
  const vencendo = posdocs.filter((p) => p.situacao === 'VIGENTE' && p.diasRestantes != null && p.diasRestantes >= 0 && p.diasRestantes <= 90)
    .sort((a, b) => a.diasRestantes - b.diasRestantes);
  secoes.push(secao('posdocs_vencendo', 'Estágios pós-doutorais que vencem em 90 dias', 'media',
    vencendo.map((p) => ({ rotulo: `${p.nome || '—'} — ${p.programaSigla || p.programaNome || 'sem programa'}`, detalhe: `termina em ${fmt(p.dataFim)} (${p.diasRestantes} dia(s))`, link: `/admin/pos-doutorado/${p.id}` })),
    { link: '/admin/pos-doutorado' }));
  const semRelatorio = posdocs.filter((p) => p.situacao === 'ENCERRADO_SEM_RELATORIO' && p.dataFim);
  semRelatorio.sort((a, b) => a.dataFim.localeCompare(b.dataFim));
  secoes.push(secao('posdocs_sem_relatorio', 'Estágios encerrados sem relatório final', 'info',
    semRelatorio.map((p) => ({ rotulo: `${p.nome || '—'} — ${p.programaSigla || p.programaNome || 'sem programa'}`, detalhe: `encerrou em ${fmt(p.dataFim)}`, link: `/admin/pos-doutorado/${p.id}` })),
    { link: '/admin/pos-doutorado' }));

  // ---- Editais com prazo nos próximos 14 dias
  const params = [hoje, addDias(hoje, 14)];
  let filtroEd = '';
  if (programaId) { params.push(programaId); filtroEd = `AND programa_id = $${params.length}`; }
  const { rows: eds } = await query(
    `SELECT id, title, programa_id, COALESCE(periodo_data_fim, deadline) AS fim FROM editais
      WHERE ${sqlPublicado()} AND COALESCE(periodo_data_fim, deadline) BETWEEN $1 AND $2 ${filtroEd}
      ORDER BY fim`, params);
  secoes.push(secao('editais_prazo', 'Editais com inscrições que terminam em 14 dias', 'media',
    eds.map((e) => ({ rotulo: e.title, detalhe: `termina em ${fmt(e.fim)} (${diasEntre(hoje, e.fim)} dia(s))`, link: `/admin/editais/editar/${e.id}` })),
    { link: '/admin/editais' }));

  // ---- Rascunhos e agendados (11 tabelas)
  const rascunhos = [];
  const agendados = [];
  for (const [tabela, c] of Object.entries(CONTEUDOS)) {
    if (programaId && !c.programa) continue;
    const filtro = programaId ? 'AND programa_id = $1' : '';
    const p = programaId ? [programaId] : [];
    const { rows: r } = await query(
      `SELECT id, title FROM ${tabela} WHERE status = 'RASCUNHO' ${filtro} ORDER BY atualizado_em DESC NULLS LAST`, p);
    for (const x of r) rascunhos.push({ rotulo: x.title || x.id, detalhe: c.rotulo, link: `${c.editar}${x.id}` });
    const { rows: a } = await query(
      `SELECT id, title, publicado_em FROM ${tabela} WHERE status = 'PUBLICADO' AND publicado_em > now() ${filtro} ORDER BY publicado_em`, p);
    for (const x of a) agendados.push({ rotulo: x.title || x.id, detalhe: `${c.rotulo} — sai em ${new Date(x.publicado_em).toLocaleString('pt-BR')}`, link: `${c.editar}${x.id}` });
  }
  secoes.push(secao('rascunhos', 'Rascunhos não publicados', 'info', rascunhos, { vazio: 'Nenhum rascunho.' }));
  secoes.push(secao('agendados', 'Publicações agendadas', 'info', agendados));

  // ---- Cadastros incompletos
  const { rows: progsSemSigla } = await query(
    `SELECT id, nome FROM programas WHERE status = 'ATIVO' AND (sigla IS NULL OR sigla IN ('', 'S/SIGLA')) ${programaId ? 'AND id = $1' : ''} ORDER BY nome`,
    programaId ? [programaId] : []);
  secoes.push(secao('programas_sem_sigla', 'Programas sem sigla', 'info',
    progsSemSigla.map((p) => ({ rotulo: p.nome, detalhe: 'cadastrar a sigla', link: `/admin/programas/editar/${p.id}` }))));
  const { rows: progsSemCoord } = await query(
    `SELECT pr.id, pr.nome FROM programas pr
      WHERE pr.status = 'ATIVO' ${programaId ? 'AND pr.id = $2' : ''} AND NOT EXISTS (
        SELECT 1 FROM vinculos v WHERE v.programa_id = pr.id AND v.ativo AND v.papel IN ('COORDENADOR', 'COORDENADOR_ATUAL')
          AND (v.data_fim_mandato IS NULL OR v.data_fim_mandato >= $1))
      ORDER BY pr.nome`, programaId ? [hoje, programaId] : [hoje]);
  secoes.push(secao('programas_sem_coordenacao', 'Programas sem coordenação vigente', 'info',
    progsSemCoord.map((p) => ({ rotulo: p.nome, detalhe: 'sem coordenador(a) com mandato vigente', link: `/admin/programas/editar/${p.id}` }))));
  const emAnalise = posdocs.filter((p) => p.situacao === 'EM_ANALISE' || (!p.dataInicio || !p.dataFim));
  secoes.push(secao('posdocs_incompletos', 'Estágios pós-doutorais com período incompleto', 'info',
    emAnalise.map((p) => ({ rotulo: p.nome || '—', detalhe: p.periodoOriginal ? `planilha: "${p.periodoOriginal}"` : 'sem período', link: `/admin/pos-doutorado/${p.id}` })),
    { link: '/admin/pos-doutorado' }));

  // ---- Planilhas: pendências de revisão e agendador (só a PRPG)
  if (!escopado) {
    const { rows: pend } = await query(
      `SELECT fonte, count(*)::int AS n FROM importacao_pendencias WHERE situacao = 'ABERTA' GROUP BY fonte ORDER BY fonte`);
    secoes.push(secao('revisao_planilhas', 'Pendências de revisão da importação das planilhas', 'info',
      pend.map((p) => ({ rotulo: p.fonte, detalhe: `${p.n} pendência(s) aberta(s)`, link: `/admin/planilhas/revisao?fonte=${p.fonte}` })),
      { total: pend.reduce((a, p) => a + p.n, 0), link: '/admin/planilhas' }));
    if (req.user?.roles?.includes('Administrator')) {
      const ag = await estadoDoAgendador();
      if (ag.atrasado) {
        secoes.push(secao('agendador_parado', 'O agendador de prazos não está rodando', 'alta',
          [{ rotulo: ag.ultima ? `Última execução em ${new Date(ag.ultima.iniciadoEm).toLocaleString('pt-BR')}` : 'Nunca executou',
            detalhe: 'Deve rodar todo dia (npm run agendador, por cron).', link: '/admin/notificacoes' }]));
      }
    }
  }

  const contam = secoes.filter((s) => s.severidade !== 'info');
  res.json({
    geradoEm: new Date().toISOString(), escopo: escopado ? 'programa' : 'prpg',
    alertas: contam.reduce((a, s) => a + s.total, 0),
    secoes,
  });
};
