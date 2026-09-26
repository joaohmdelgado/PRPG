-- =====================================================================
-- Fase O.5 (docs/revisao-portal-conteudo-2026-09-24.md): o agendador de
-- prazos roda fora do processo web (cron ou processo próprio — ver
-- server/scripts/agendador.mjs). Cada execução fica registrada para o painel
-- mostrar "última execução" e para detectar que ele parou de rodar.
-- =====================================================================
CREATE TABLE IF NOT EXISTS agendador_execucoes (
  id           SERIAL PRIMARY KEY,
  iniciado_em  TIMESTAMPTZ NOT NULL DEFAULT now(),
  concluido_em TIMESTAMPTZ,
  modo         TEXT NOT NULL,              -- SO_PAINEL|EMAIL
  origem       TEXT NOT NULL DEFAULT 'cron', -- cron|manual
  resumo       JSONB,
  erro         TEXT
);
CREATE INDEX IF NOT EXISTS agendador_execucoes_iniciado_idx ON agendador_execucoes (iniciado_em DESC);
