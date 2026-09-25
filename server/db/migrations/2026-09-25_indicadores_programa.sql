
-- =====================================================================
-- Fase N.9 (docs/revisao-portal-conteudo-2026-09-24.md): indicadores por
-- programa e ano calculados dos dados (vinculos e teses) — `metricas_anuais`
-- fica só para o que não dá para calcular (produção, bolsas, taxas).
--
-- Regras de contagem (pessoas distintas):
--   * vínculo com datas conta nos anos em que esteve vigente;
--   * vínculo SEM datas é um retrato do cadastro atual: conta só no ano
--     corrente, e só se estiver ativo — não inventa histórico;
--   * egresso conta no ano da titulação (data de fim do vínculo, ou de
--     início quando só ela existe); sem data, fica fora da série anual;
--   * teses e dissertações publicadas contam no ano da defesa (`ano`).
-- Anos: do primeiro com dado até o corrente.
-- =====================================================================
CREATE OR REPLACE VIEW indicadores_programa_ano AS
WITH ano_atual AS (SELECT extract(year FROM current_date)::int AS ano),
vig AS (
  SELECT v.programa_id, v.pessoa_id, v.papel,
         CASE WHEN v.data_inicio_mandato IS NULL AND v.data_fim_mandato IS NULL
              THEN CASE WHEN v.ativo IS NOT FALSE THEN (SELECT ano FROM ano_atual) END
              ELSE extract(year FROM coalesce(v.data_inicio_mandato, v.data_fim_mandato))::int END AS ano_ini,
         CASE WHEN v.data_inicio_mandato IS NULL AND v.data_fim_mandato IS NULL
              THEN CASE WHEN v.ativo IS NOT FALSE THEN (SELECT ano FROM ano_atual) END
              ELSE coalesce(extract(year FROM v.data_fim_mandato)::int,
                            CASE WHEN v.ativo IS NOT FALSE THEN (SELECT ano FROM ano_atual) END,
                            extract(year FROM v.data_inicio_mandato)::int) END AS ano_fim,
         extract(year FROM coalesce(v.data_fim_mandato, v.data_inicio_mandato))::int AS ano_titulacao
    FROM vinculos v
   WHERE v.programa_id IS NOT NULL
),
teses AS (
  SELECT programa_id, extract(year FROM ano)::int AS ano, tipo
    FROM teses_dissertacoes
   WHERE programa_id IS NOT NULL AND ano IS NOT NULL
     AND status = 'PUBLICADO' AND (publicado_em IS NULL OR publicado_em <= now())
),
anos AS (
  SELECT p.id AS programa_id, generate_series(
           least((SELECT ano FROM ano_atual),
                 coalesce((SELECT min(ano_ini) FROM vig WHERE vig.programa_id = p.id), (SELECT ano FROM ano_atual)),
                 coalesce((SELECT min(ano) FROM teses WHERE teses.programa_id = p.id), (SELECT ano FROM ano_atual))),
           (SELECT ano FROM ano_atual)) AS ano
    FROM programas p
)
SELECT a.programa_id, a.ano,
  (SELECT count(DISTINCT pessoa_id) FROM vig WHERE vig.programa_id = a.programa_id AND papel = 'DOCENTE_PERMANENTE' AND a.ano BETWEEN ano_ini AND ano_fim)::int AS docentes_permanentes,
  (SELECT count(DISTINCT pessoa_id) FROM vig WHERE vig.programa_id = a.programa_id AND papel LIKE 'DOCENTE%' AND a.ano BETWEEN ano_ini AND ano_fim)::int AS docentes,
  (SELECT count(DISTINCT pessoa_id) FROM vig WHERE vig.programa_id = a.programa_id AND papel = 'DISCENTE_MESTRADO' AND a.ano BETWEEN ano_ini AND ano_fim)::int AS discentes_mestrado,
  (SELECT count(DISTINCT pessoa_id) FROM vig WHERE vig.programa_id = a.programa_id AND papel = 'DISCENTE_DOUTORADO' AND a.ano BETWEEN ano_ini AND ano_fim)::int AS discentes_doutorado,
  (SELECT count(DISTINCT pessoa_id) FROM vig WHERE vig.programa_id = a.programa_id AND papel = 'DISCENTE_PROFISSIONAL' AND a.ano BETWEEN ano_ini AND ano_fim)::int AS discentes_profissional,
  (SELECT count(DISTINCT pessoa_id) FROM vig WHERE vig.programa_id = a.programa_id AND papel = 'EGRESSO' AND ano_titulacao = a.ano)::int AS egressos,
  (SELECT count(*) FROM teses WHERE teses.programa_id = a.programa_id AND teses.ano = a.ano AND tipo ILIKE 'tese%')::int AS teses_defendidas,
  (SELECT count(*) FROM teses WHERE teses.programa_id = a.programa_id AND teses.ano = a.ano AND tipo ILIKE 'disserta%')::int AS dissertacoes_defendidas
FROM anos a;
