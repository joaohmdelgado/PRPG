// Fase N.2 (docs/revisao-portal-conteudo-2026-09-24.md): página pública
// automática de todo programa, com ou sem microsite — antes 40 dos 42
// programas não tinham página nenhuma no portal. Reúne só dado público:
// dados institucionais do programa, modalidades, coordenação (nomes),
// docentes (nome e Lattes), linhas, editais abertos e teses. Nenhum contato
// pessoal (e-mail/telefone de pessoa) sai daqui — só os do próprio programa.
import { query } from '../db/pool.js';
import { linhasPesquisaRepo } from '../db/repositories.js';
import { sqlPublicado } from '../utils/publicacao.js';
import { calculateEditalStatus } from './editaisController.js';
import { linkPrograma } from '../utils/programaResumo.js';
import { indicadoresDoPrograma } from '../db/indicadoresRepo.js';

const CAMPOS_PUBLICOS = [
  'nome', 'slug', 'status', 'campus', 'em_rede', 'nome_rede', 'grande_area', 'area_conhecimento',
  'area_avaliacao', 'descricao_curta', 'codigo_capes', 'sucupira_url', 'regimento_url', 'regulamento_url',
  'palavras_chave', 'email_programa', 'telefone_secretaria', 'whatsapp', 'horario_atendimento', 'bloco',
  'sala', 'endereco', 'cep', 'instagram_url', 'facebook_url', 'youtube_url',
];
const PAPEL_DOCENTE = { DOCENTE_PERMANENTE: 'Permanente', DOCENTE_COLABORADOR: 'Colaborador', DOCENTE_VISITANTE: 'Visitante' };

// Pessoa do vínculo: users OU pessoas (vinculos.pessoa_id é polimórfico).
const PESSOA_SQL = `
  SELECT v.papel, coalesce(u.perfil_nome, p.nome) AS nome, coalesce(u.acad_lattes, p.lattes) AS lattes
    FROM vinculos v
    LEFT JOIN users u ON u.id = v.pessoa_id
    LEFT JOIN pessoas p ON p.id = v.pessoa_id
   WHERE v.programa_id = $1 AND v.ativo IS NOT FALSE AND v.papel = ANY($2::text[])
     AND (v.data_fim_mandato IS NULL OR v.data_fim_mandato >= current_date)
   ORDER BY v.ordem, nome`;

export const getProgramaPublico = async (req, res) => {
  const { rows: [prog] } = await query('SELECT * FROM programas WHERE slug = $1', [req.params.slug]);
  if (!prog) return res.status(404).json({ message: 'Programa não encontrado.' });

  const [modalidades, coordenacao, docentes, linhas, editais, teses, indicadores] = await Promise.all([
    query('SELECT tipo, nota_capes, ano_inicio FROM modalidades WHERE programa_id = $1 ORDER BY tipo', [prog.id]),
    query(PESSOA_SQL, [prog.id, ['COORDENADOR_ATUAL', 'COORDENADOR', 'SUBSTITUTO', 'VICE_COORDENADOR']]),
    query(PESSOA_SQL, [prog.id, Object.keys(PAPEL_DOCENTE)]),
    linhasPesquisaRepo.getByPrograma(prog.id),
    query(`SELECT id, title, numero, year, published_at, deadline, periodo_data_inicio, periodo_data_fim
             FROM editais e WHERE programa_id = $1 AND ${sqlPublicado('e')}`, [prog.id]),
    query(`SELECT id, title, tipo, ano, arquivo_url, count(*) OVER () AS total
             FROM teses_dissertacoes t WHERE programa_id = $1 AND ${sqlPublicado('t')}
             ORDER BY ano DESC NULLS LAST LIMIT 5`, [prog.id]),
    indicadoresDoPrograma(prog.id),
  ]);

  const dados = Object.fromEntries(CAMPOS_PUBLICOS.map((c) => [c, prog[c] ?? null]));
  const editaisAbertos = editais.rows
    .map((e) => calculateEditalStatus({
      ...e, publishedAt: e.published_at,
      field_periodo: { data_inicio: e.periodo_data_inicio, data_fim: e.periodo_data_fim },
    }))
    .filter((e) => e.situation !== 'concluido')
    .map((e) => ({ id: e.id, title: e.title, situation: e.situation, situationLabel: e.situationLabel, dataFim: e.field_periodo.data_fim || e.deadline }));

  const resumo = { slug: prog.slug, site: !!prog.microsite_ativo };
  res.json({
    ...dados,
    sigla: prog.sigla && prog.sigla !== 'S/SIGLA' ? prog.sigla : null,
    site: !!prog.microsite_ativo,
    siteUrl: prog.microsite_ativo ? linkPrograma(resumo) : null,
    modalidades: modalidades.rows,
    coordenacao: coordenacao.rows.map((c) => ({
      nome: c.nome, papel: ['SUBSTITUTO', 'VICE_COORDENADOR'].includes(c.papel) ? 'Vice-coordenação' : 'Coordenação',
    })),
    docentes: docentes.rows.map((d) => ({ nome: d.nome, categoria: PAPEL_DOCENTE[d.papel], lattes: d.lattes || null })),
    linhas: linhas.map((l) => l.nome || l),
    editais: editaisAbertos,
    // Números por ano (Fase N.9), os 6 mais recentes.
    indicadores: indicadores.slice(0, 6),
    teses: {
      total: teses.rows[0] ? Number(teses.rows[0].total) : 0,
      recentes: teses.rows.map((t) => ({ id: t.id, title: t.title, tipo: t.tipo, ano: t.ano, arquivoUrl: t.arquivo_url })),
    },
  });
};
