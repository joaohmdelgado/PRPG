-- Fase 2: periodo do mandato e motivo de encerramento em vinculos.
-- Migracao idempotente para bancos JA existentes (o schema.sql ja traz
-- estas colunas em instalacoes novas e nos testes).
--
-- Aplicar com:
--   docker exec -i prpg-postgres psql -U prpg -d prpg < server/db/migrations/2026-06-13_vinculos_fase2.sql

ALTER TABLE vinculos
  ADD COLUMN IF NOT EXISTS data_inicio_mandato TEXT,
  ADD COLUMN IF NOT EXISTS data_fim_mandato    TEXT,
  ADD COLUMN IF NOT EXISTS motivo_encerramento TEXT;
