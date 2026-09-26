-- =====================================================================
-- Fase O.7 (docs/revisao-portal-conteudo-2026-09-24.md): verificador
-- periódico de links (painel de qualidade de dados). Uma linha por URL
-- distinta em uso no conteúdo; `usos` diz onde ela aparece. O verificador
-- (server/services/verificadorLinks.js) roda por cron (npm run links) ou
-- pelo botão do painel e remove as URLs que deixaram de ser usadas.
-- =====================================================================
CREATE TABLE IF NOT EXISTS links_verificados (
  url             TEXT PRIMARY KEY,
  situacao        TEXT NOT NULL,        -- OK|QUEBRADO|INCERTO
  status_http     INTEGER,
  erro            TEXT,
  interno         BOOLEAN NOT NULL DEFAULT FALSE, -- /uploads/... (conferido no disco)
  usos            JSONB NOT NULL DEFAULT '[]',    -- [{tabela, id, titulo, campo, rota}]
  verificado_em   TIMESTAMPTZ NOT NULL DEFAULT now(),
  quebrado_desde  TIMESTAMPTZ           -- primeira verificação seguida que falhou
);
CREATE INDEX IF NOT EXISTS links_verificados_situacao_idx ON links_verificados (situacao);
