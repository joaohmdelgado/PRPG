-- Fase 3: auditoria (criado_por / atualizado_por) em todas as entidades de conteúdo.
-- Migracao idempotente para bancos JA existentes (o schema.sql ja traz estas
-- colunas em instalacoes novas e nos testes — mesmo bloco no fim do schema).
--
-- Aplicar com:
--   docker exec -i prpg-postgres psql -U prpg -d prpg < server/db/migrations/2026-06-13_auditoria_fase3.sql

ALTER TABLE news               ADD COLUMN IF NOT EXISTS criado_por TEXT, ADD COLUMN IF NOT EXISTS atualizado_por TEXT;
ALTER TABLE editais            ADD COLUMN IF NOT EXISTS criado_por TEXT, ADD COLUMN IF NOT EXISTS atualizado_por TEXT;
ALTER TABLE resolucoes         ADD COLUMN IF NOT EXISTS criado_por TEXT, ADD COLUMN IF NOT EXISTS atualizado_por TEXT;
ALTER TABLE formularios        ADD COLUMN IF NOT EXISTS criado_por TEXT, ADD COLUMN IF NOT EXISTS atualizado_por TEXT;
ALTER TABLE calendarios        ADD COLUMN IF NOT EXISTS criado_por TEXT, ADD COLUMN IF NOT EXISTS atualizado_por TEXT;
ALTER TABLE portarias          ADD COLUMN IF NOT EXISTS criado_por TEXT, ADD COLUMN IF NOT EXISTS atualizado_por TEXT;
ALTER TABLE grupos_pesquisa    ADD COLUMN IF NOT EXISTS criado_por TEXT, ADD COLUMN IF NOT EXISTS atualizado_por TEXT;
ALTER TABLE teses_dissertacoes ADD COLUMN IF NOT EXISTS criado_por TEXT, ADD COLUMN IF NOT EXISTS atualizado_por TEXT;
ALTER TABLE faq                ADD COLUMN IF NOT EXISTS criado_por TEXT, ADD COLUMN IF NOT EXISTS atualizado_por TEXT;
ALTER TABLE disciplinas        ADD COLUMN IF NOT EXISTS criado_por TEXT, ADD COLUMN IF NOT EXISTS atualizado_por TEXT;
ALTER TABLE bolsas             ADD COLUMN IF NOT EXISTS criado_por TEXT, ADD COLUMN IF NOT EXISTS atualizado_por TEXT;
ALTER TABLE pages              ADD COLUMN IF NOT EXISTS criado_por TEXT, ADD COLUMN IF NOT EXISTS atualizado_por TEXT;
ALTER TABLE programas          ADD COLUMN IF NOT EXISTS criado_por TEXT, ADD COLUMN IF NOT EXISTS atualizado_por TEXT;
ALTER TABLE users              ADD COLUMN IF NOT EXISTS criado_por TEXT, ADD COLUMN IF NOT EXISTS atualizado_por TEXT;
