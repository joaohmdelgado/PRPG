// Fase H.5 (docs/revisao-portal-conteudo-2026-09-24.md): busca pública do
// portal. Full-text em português e sem acento (índices e funções em
// migrations/2026-09-25_busca_publica.sql — as expressões aqui são as mesmas
// dos índices, para o Postgres usá-los), só sobre o que é público.
// A busca interna do painel (processos, atos, pós-doc) continua em /api/busca.
import { query } from '../db/pool.js';
import { sqlPublicado } from '../utils/publicacao.js';

const POR_GRUPO = 10;
const TRECHO = `'MaxWords=28, MinWords=12, MaxFragments=1, StartSel=<mark>, StopSel=</mark>'`;

// Cada grupo: rótulo e a consulta. $1 = tsquery (busca_consulta), $2 = LIKE
// sem acento para palavras incompletas ("profic"; NULL em buscas curtas, em
// que o trecho casaria com quase tudo), $3 = limite.
// `onde` já restringe ao que o público vê.
const GRUPOS = [
  {
    tipo: 'noticias', rotulo: 'Notícias',
    sql: `SELECT n.id, n.title AS titulo, n.date AS data, nullif(p.sigla, 'S/SIGLA') AS programa,
            CASE WHEN n.programa_id IS NULL OR n.destaque THEN '/noticia/' || n.id
                 ELSE '/' || p.slug || '/noticias/' || n.id END AS destino,
            ts_headline('pt_sem_acento', busca_sem_tags(coalesce(n.excerpt, '') || ' ' || busca_juntar(n.content)), $1, ${TRECHO}) AS trecho,
            ts_rank(busca_tsv(n.title, n.excerpt, busca_juntar(n.content)), $1) AS nota
          FROM news n LEFT JOIN programas p ON p.id = n.programa_id
          WHERE ${sqlPublicado('n')}
            AND (n.programa_id IS NULL OR n.destaque OR p.microsite_ativo)
            AND (busca_tsv(n.title, n.excerpt, busca_juntar(n.content)) @@ $1 OR busca_limpar(n.title) ILIKE $2)`,
    ordem: 'nota DESC, data DESC NULLS LAST',
  },
  {
    tipo: 'editais', rotulo: 'Editais',
    sql: `SELECT e.id, e.title AS titulo, e.published_at AS data, nullif(p.sigla, 'S/SIGLA') AS programa,
            '/editais/' || e.id AS destino,
            ts_headline('pt_sem_acento', busca_sem_tags(e.description), $1, ${TRECHO}) AS trecho,
            ts_rank(busca_tsv(e.title, e.numero, e.description), $1) AS nota
          FROM editais e LEFT JOIN programas p ON p.id = e.programa_id
          WHERE ${sqlPublicado('e')}
            AND (busca_tsv(e.title, e.numero, e.description) @@ $1 OR busca_limpar(e.title) ILIKE $2)`,
    ordem: 'nota DESC, data DESC NULLS LAST',
  },
  {
    tipo: 'paginas', rotulo: 'Páginas',
    sql: `SELECT pg.id, pg.title AS titulo, NULL::date AS data, nullif(p.sigla, 'S/SIGLA') AS programa,
            CASE WHEN pg.programa_id IS NULL THEN '/' || pg.slug ELSE '/' || p.slug || '/' || pg.slug END AS destino,
            ts_headline('pt_sem_acento', busca_sem_tags(coalesce(pg.body_summary, '') || ' ' || coalesce(pg.body_value, '')), $1, ${TRECHO}) AS trecho,
            ts_rank(busca_tsv(pg.title, pg.body_summary, pg.body_value), $1) AS nota
          FROM pages pg LEFT JOIN programas p ON p.id = pg.programa_id
          WHERE ${sqlPublicado('pg')}
            AND (pg.programa_id IS NULL OR p.microsite_ativo)
            AND (busca_tsv(pg.title, pg.body_summary, pg.body_value) @@ $1 OR busca_limpar(pg.title) ILIKE $2)`,
    ordem: 'nota DESC, titulo',
  },
  {
    tipo: 'documentos', rotulo: 'Resoluções e formulários',
    sql: `SELECT id, titulo, NULL::date AS data, programa, destino, trecho, nota, tipo_doc FROM (
            SELECT r.id, r.title AS titulo, nullif(p.sigla, 'S/SIGLA') AS programa,
              coalesce(nullif(r.link, ''), '/resolucoes') AS destino, 'Resolução' AS tipo_doc,
              ts_headline('pt_sem_acento', busca_sem_tags(r.descricao), $1, ${TRECHO}) AS trecho,
              ts_rank(busca_tsv(r.title, r.descricao, coalesce(r.section_title, '') || ' ' || coalesce(r.category_title, '')), $1) AS nota
            FROM resolucoes r LEFT JOIN programas p ON p.id = r.programa_id
            WHERE ${sqlPublicado('r')}
              AND (busca_tsv(r.title, r.descricao, coalesce(r.section_title, '') || ' ' || coalesce(r.category_title, '')) @@ $1
                   OR busca_limpar(r.title) ILIKE $2)
            UNION ALL
            SELECT f.id, f.title, nullif(p.sigla, 'S/SIGLA'),
              coalesce(nullif(f.link, ''), '/formularios'), 'Formulário',
              ts_headline('pt_sem_acento', busca_sem_tags(f.descricao), $1, ${TRECHO}),
              ts_rank(busca_tsv(f.title, f.descricao, coalesce(f.section_title, '') || ' ' || coalesce(f.category_title, '')), $1)
            FROM formularios f LEFT JOIN programas p ON p.id = f.programa_id
            WHERE ${sqlPublicado('f')}
              AND (busca_tsv(f.title, f.descricao, coalesce(f.section_title, '') || ' ' || coalesce(f.category_title, '')) @@ $1
                   OR busca_limpar(f.title) ILIKE $2)
          ) d`,
    ordem: 'nota DESC, titulo',
  },
  {
    tipo: 'programas', rotulo: 'Programas de pós-graduação',
    sql: `SELECT p.id, p.nome AS titulo, NULL::date AS data, nullif(p.sigla, 'S/SIGLA') AS programa,
            CASE WHEN p.microsite_ativo AND p.slug IS NOT NULL THEN '/' || p.slug ELSE '/programas' END AS destino,
            ts_headline('pt_sem_acento', busca_sem_tags(coalesce(p.descricao_curta, '') || ' ' || coalesce(p.area_conhecimento, '')), $1, ${TRECHO}) AS trecho,
            ts_rank(busca_tsv(p.nome || ' ' || coalesce(p.sigla, ''), p.descricao_curta,
              coalesce(p.grande_area, '') || ' ' || coalesce(p.area_conhecimento, '') || ' ' || busca_juntar(p.palavras_chave)), $1) AS nota
          FROM programas p
          WHERE p.status = 'ATIVO'
            AND (busca_tsv(p.nome || ' ' || coalesce(p.sigla, ''), p.descricao_curta,
                   coalesce(p.grande_area, '') || ' ' || coalesce(p.area_conhecimento, '') || ' ' || busca_juntar(p.palavras_chave)) @@ $1
                 OR busca_limpar(p.nome || ' ' || coalesce(p.sigla, '')) ILIKE $2)`,
    ordem: 'nota DESC, titulo',
  },
  {
    tipo: 'teses', rotulo: 'Teses e dissertações',
    sql: `SELECT t.id, t.title AS titulo, NULL::date AS data, nullif(p.sigla, 'S/SIGLA') AS programa,
            coalesce(nullif(t.arquivo_url, ''), CASE WHEN p.microsite_ativo THEN '/' || p.slug || '/teses' END) AS destino,
            concat_ws(' · ', t.tipo, t.ano::text, pe.nome) AS trecho,
            ts_rank(busca_tsv(t.title, t.tipo, ''), $1) AS nota
          FROM teses_dissertacoes t
          LEFT JOIN programas p ON p.id = t.programa_id
          LEFT JOIN pessoas pe ON pe.id = t.autor_pessoa_id
          WHERE ${sqlPublicado('t')}
            AND (busca_tsv(t.title, t.tipo, '') @@ $1 OR busca_limpar(t.title) ILIKE $2)`,
    ordem: 'nota DESC, titulo',
  },
];

// Caracteres especiais do LIKE viram literais.
const escaparLike = (s) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

// GET /portal/busca?q=&tipo=  (tipo: um grupo só, com até 50 resultados)
export const buscaPublica = async (req, res) => {
  const q = String(req.query.q || '').trim().slice(0, 200);
  if (q.length < 2) return res.json({ q, total: 0, grupos: [] });
  const tipo = GRUPOS.some((g) => g.tipo === req.query.tipo) ? req.query.tipo : null;
  const limite = tipo ? 50 : POR_GRUPO;
  const { rows: [{ consulta, like }] } = await query(
    `SELECT busca_consulta($1)::text AS consulta,
            CASE WHEN length($2) >= 4 THEN '%' || busca_limpar($2) || '%' END AS like`,
    [q, escaparLike(q)]
  );

  const grupos = await Promise.all(GRUPOS.filter((g) => !tipo || g.tipo === tipo).map(async (g) => {
    const { rows } = await query(
      `SELECT *, count(*) OVER () AS total FROM (${g.sql}) x ORDER BY ${g.ordem} LIMIT $3`,
      [consulta || '', like, limite]
    );
    return {
      tipo: g.tipo, rotulo: g.rotulo, total: rows[0] ? Number(rows[0].total) : 0,
      itens: rows.map((r) => ({
        id: r.id, titulo: r.titulo, destino: r.destino || null, data: r.data || null,
        programa: r.programa || null, trecho: r.trecho || null, tipoDocumento: r.tipo_doc || null,
      })),
    };
  }));
  const comResultado = grupos.filter((g) => g.total > 0);
  return res.json({ q, total: comResultado.reduce((s, g) => s + g.total, 0), grupos: comResultado });
};
