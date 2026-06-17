-- Proficiência via edital: o período de inscrição passa a ser controlado por
-- um edital marcado com proficiencia=TRUE, em vez da tabela proficiencia_periodos.
--
-- Aplicar com:
--   docker exec -i prpg-postgres psql -U prpg -d prpg < server/db/migrations/2026-06-17_editais_proficiencia.sql

-- 1. Coluna proficiencia no edital
ALTER TABLE editais ADD COLUMN IF NOT EXISTS proficiencia BOOLEAN DEFAULT FALSE;

-- 2. FK de inscricoes_proficiencia passa a apontar para editais
--    (só altera se a FK antiga ainda existir)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'inscricoes_proficiencia_periodo_id_fkey'
      AND table_name = 'inscricoes_proficiencia'
  ) THEN
    ALTER TABLE inscricoes_proficiencia
      DROP CONSTRAINT inscricoes_proficiencia_periodo_id_fkey;
  END IF;
END$$;

ALTER TABLE inscricoes_proficiencia
  ADD CONSTRAINT inscricoes_proficiencia_periodo_id_fkey
  FOREIGN KEY (periodo_id) REFERENCES editais(id) ON DELETE SET NULL;
