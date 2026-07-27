-- Autenticação/verificação da declaração de proficiência.
-- Adiciona o código público de verificação (UUID, imprevisível) e a data de
-- emissão congelada na 1a geração da declaração — assim o PDF é reproduzível e
-- a página pública mostra os dados canônicos para conferência.
-- Migracao idempotente para bancos JA existentes (schema.sql espelha estas
-- colunas em instalacoes novas e nos testes).
--
-- Aplicar com:
--   docker exec -i prpg-postgres psql -U prpg -d prpg < server/db/migrations/2026-06-20_proficiencia_verificacao.sql

ALTER TABLE inscricoes_proficiencia
  ADD COLUMN IF NOT EXISTS codigo_verificacao TEXT,
  ADD COLUMN IF NOT EXISTS emitida_em         TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS inscricoes_prof_codigo_idx
  ON inscricoes_proficiencia(codigo_verificacao);
