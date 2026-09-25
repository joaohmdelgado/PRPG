
-- =====================================================================
-- Fase H.4 (docs/revisao-portal-conteudo-2026-09-24.md): Equipe e Estrutura
-- Organizacional geradas dos dados (antes JSX fixo, repetindo pessoas e
-- e-mails que também estão em unidades/vinculos/contatos).
--   unidades.descricao/ordem/exibir_no_site: o organograma público mostra só
--     as unidades marcadas, na ordem definida, a partir da raiz 'prpg'.
--   vinculos.unidade_id: servidor/coordenador ligado a um setor da PRPG (até
--     aqui vínculo era sempre de programa ou grupo de pesquisa).
--   vinculos.funcao: nome exibido da função ("Coordenador Financeiro"); sem
--     ele, vale o rótulo do papel.
-- A carga inicial (setores, equipe, contatos) é feita pela aplicação a partir
-- de server/data/estrutura-prpg.json (estruturaPrpg.js).
-- =====================================================================
ALTER TABLE unidades ADD COLUMN IF NOT EXISTS descricao TEXT;
ALTER TABLE unidades ADD COLUMN IF NOT EXISTS ordem INTEGER NOT NULL DEFAULT 0;
ALTER TABLE unidades ADD COLUMN IF NOT EXISTS exibir_no_site BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE vinculos ADD COLUMN IF NOT EXISTS unidade_id TEXT REFERENCES unidades(id) ON DELETE CASCADE;
ALTER TABLE vinculos ADD COLUMN IF NOT EXISTS funcao TEXT;
CREATE INDEX IF NOT EXISTS idx_vinculos_unidade ON vinculos (unidade_id) WHERE unidade_id IS NOT NULL;

INSERT INTO vocabularios (dominio, valor, rotulo, ordem) VALUES
  ('vinculo.papel', 'PRO_REITOR', 'Pró-Reitor(a)', 100),
  ('vinculo.papel', 'SERVIDOR', 'Servidor(a)', 101)
ON CONFLICT (dominio, valor, COALESCE(programa_id, '')) DO NOTHING;
