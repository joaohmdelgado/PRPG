-- Remove o campo `site` de programas: os sites dos programas agora sao
-- microsites dentro do portal da PRPG, entao a URL externa nao e mais armazenada.
-- Aplicar com:
--   docker exec -i prpg-postgres psql -U prpg -d prpg < server/db/migrations/2026-06-19_drop_programas_site.sql

ALTER TABLE programas DROP COLUMN IF EXISTS site;
