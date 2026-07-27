-- Fase 1: situacao, contato/localizacao e documentos do programa.
-- Migracao idempotente para bancos JA existentes (o schema.sql ja traz
-- estas colunas em instalacoes novas e nos testes).
--
-- Aplicar com:
--   docker exec -i prpg-postgres psql -U prpg -d prpg < server/db/migrations/2026-06-13_programas_fase1.sql

ALTER TABLE programas
  ADD COLUMN IF NOT EXISTS status                 TEXT NOT NULL DEFAULT 'ATIVO',
  ADD COLUMN IF NOT EXISTS status_descricao       TEXT,
  ADD COLUMN IF NOT EXISTS data_credenciamento    TEXT,
  ADD COLUMN IF NOT EXISTS data_descredenciamento TEXT,
  ADD COLUMN IF NOT EXISTS bloco                  TEXT,
  ADD COLUMN IF NOT EXISTS sala                   TEXT,
  ADD COLUMN IF NOT EXISTS cep                    TEXT,
  ADD COLUMN IF NOT EXISTS telefone_secretaria    TEXT,
  ADD COLUMN IF NOT EXISTS horario_atendimento    TEXT,
  ADD COLUMN IF NOT EXISTS email_programa         TEXT,
  ADD COLUMN IF NOT EXISTS regimento_url          TEXT,
  ADD COLUMN IF NOT EXISTS regulamento_url        TEXT,
  ADD COLUMN IF NOT EXISTS sucupira_url           TEXT,
  ADD COLUMN IF NOT EXISTS palavras_chave         TEXT[] DEFAULT '{}';
