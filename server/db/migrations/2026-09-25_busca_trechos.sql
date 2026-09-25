
-- =====================================================================
-- Fase H.5: trechos da busca com o texto original (acentos preservados).
-- ts_headline compara o texto com a consulta usando esta configuração —
-- unaccent + radical em português, o mesmo caminho de busca_tsv() —, então
-- "Veterinária" no texto casa com "veterinaria" na consulta e é destacado
-- sem perder o acento na exibição.
-- =====================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_ts_config WHERE cfgname = 'pt_sem_acento') THEN
    CREATE TEXT SEARCH CONFIGURATION pt_sem_acento (COPY = portuguese);
    ALTER TEXT SEARCH CONFIGURATION pt_sem_acento
      ALTER MAPPING FOR hword, hword_part, word WITH unaccent, portuguese_stem;
  END IF;
END$$;

CREATE OR REPLACE FUNCTION busca_sem_tags(t text) RETURNS text
  LANGUAGE sql IMMUTABLE PARALLEL SAFE AS
$$ SELECT regexp_replace(coalesce(t, ''), '<[^>]*>', ' ', 'g') $$;
