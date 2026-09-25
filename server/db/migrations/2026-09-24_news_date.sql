-- Noticias: `date` deixa de ser texto livre e vira DATE nativo (Fase R.5 de
-- docs/revisao-portal-conteudo-2026-09-24.md).
--
-- Antes: texto misturando "20 de Março, 2026" (legado Drupal/seed) e
-- "2026-03-20" (gravado pelo painel). Como a lista era ordenada por `id`, a
-- pagina /noticias saia em ordem alfabetica de slug, nao por data.
--
-- O contrato da API nao muda: o parser de DATE em server/db/pool.js devolve
-- 'YYYY-MM-DD', formato que todas as telas ja formatam por extenso.
--
-- Idempotente: se a coluna ja for DATE (schema.sql novo), nao faz nada.
-- Seguro: se algum valor nao for reconhecido, a migracao ABORTA (nada e
-- convertido pela metade nem vira NULL em silencio).
--
-- Aplicar com: npm run db:migrate:apply

DO $$
DECLARE
  v_tipo TEXT;
  v_invalidas TEXT;
BEGIN
  SELECT data_type INTO v_tipo
    FROM information_schema.columns
   WHERE table_name = 'news' AND column_name = 'date';
  IF v_tipo = 'date' THEN
    RETURN;
  END IF;

  CREATE TEMP TABLE news_date_conv ON COMMIT DROP AS
  SELECT id, date AS original,
    CASE
      WHEN btrim(coalesce(date, '')) = '' THEN NULL
      WHEN date ~ '^\d{4}-\d{2}-\d{2}$' THEN date::date
      WHEN date ~* '^\s*\d{1,2}\s+de\s+[a-zç]+,?\s+(de\s+)?\d{4}\s*$' THEN
        make_date(
          substring(date from '(\d{4})\s*$')::int,
          CASE lower(substring(date from '(?i)de\s+([a-zç]+)'))
            WHEN 'janeiro' THEN 1 WHEN 'fevereiro' THEN 2 WHEN 'março' THEN 3
            WHEN 'marco' THEN 3 WHEN 'abril' THEN 4 WHEN 'maio' THEN 5
            WHEN 'junho' THEN 6 WHEN 'julho' THEN 7 WHEN 'agosto' THEN 8
            WHEN 'setembro' THEN 9 WHEN 'outubro' THEN 10 WHEN 'novembro' THEN 11
            WHEN 'dezembro' THEN 12
          END,
          substring(date from '^\s*(\d{1,2})')::int
        )
    END AS convertida
  FROM news;

  SELECT string_agg(id || ' = "' || original || '"', '; ') INTO v_invalidas
    FROM news_date_conv
   WHERE convertida IS NULL AND btrim(coalesce(original, '')) <> '';
  IF v_invalidas IS NOT NULL THEN
    RAISE EXCEPTION 'news.date com formato nao reconhecido (corrija antes de migrar): %', v_invalidas;
  END IF;

  ALTER TABLE news ADD COLUMN date_nova DATE;
  UPDATE news n SET date_nova = c.convertida FROM news_date_conv c WHERE c.id = n.id;
  ALTER TABLE news DROP COLUMN date;
  ALTER TABLE news RENAME COLUMN date_nova TO date;
END$$;

CREATE INDEX IF NOT EXISTS news_date_idx ON news (date DESC NULLS LAST);
