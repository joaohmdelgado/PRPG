-- Fase 6 (Microsites): vincula disciplinas, resoluções, formulários,
-- teses, FAQ e grupos de pesquisa a programas.
ALTER TABLE disciplinas        ADD COLUMN IF NOT EXISTS programa_id TEXT;
ALTER TABLE resolucoes         ADD COLUMN IF NOT EXISTS programa_id TEXT;
ALTER TABLE formularios        ADD COLUMN IF NOT EXISTS programa_id TEXT;
ALTER TABLE teses_dissertacoes ADD COLUMN IF NOT EXISTS programa_id TEXT;
ALTER TABLE faq                ADD COLUMN IF NOT EXISTS programa_id TEXT;
ALTER TABLE grupos_pesquisa    ADD COLUMN IF NOT EXISTS programa_id TEXT;

CREATE INDEX IF NOT EXISTS disciplinas_prog_idx ON disciplinas(programa_id);
CREATE INDEX IF NOT EXISTS resolucoes_prog_idx  ON resolucoes(programa_id);
CREATE INDEX IF NOT EXISTS formularios_prog_idx ON formularios(programa_id);
CREATE INDEX IF NOT EXISTS teses_prog_idx       ON teses_dissertacoes(programa_id);
CREATE INDEX IF NOT EXISTS faq_prog_idx         ON faq(programa_id);
CREATE INDEX IF NOT EXISTS grupos_prog_idx      ON grupos_pesquisa(programa_id);
