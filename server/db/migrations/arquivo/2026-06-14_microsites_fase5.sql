-- Fase 5: microsites dedicados por programa de pos-graduacao.
-- Adiciona identidade visual/contato/redes e o slug do microsite em `programas`,
-- a tabela de paginas de texto livre `programa_paginas`, e o vinculo opcional
-- `programa_id` em noticias e editais.
--
-- Migracao idempotente para bancos JA existentes (o schema.sql ja traz tudo
-- isso em instalacoes novas e nos testes).
--
-- Aplicar com:
--   docker exec -i prpg-postgres psql -U prpg -d prpg < server/db/migrations/2026-06-14_microsites_fase5.sql

-- ----- programas: identidade do microsite -----
ALTER TABLE programas
  ADD COLUMN IF NOT EXISTS slug            TEXT,
  ADD COLUMN IF NOT EXISTS microsite_ativo BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS logo_url        TEXT,
  ADD COLUMN IF NOT EXISTS cor_primaria    TEXT,
  ADD COLUMN IF NOT EXISTS cor_secundaria  TEXT,
  ADD COLUMN IF NOT EXISTS descricao_curta TEXT,
  ADD COLUMN IF NOT EXISTS hero_imagem_url TEXT,
  ADD COLUMN IF NOT EXISTS endereco        TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp        TEXT,
  ADD COLUMN IF NOT EXISTS instagram_url   TEXT,
  ADD COLUMN IF NOT EXISTS facebook_url    TEXT,
  ADD COLUMN IF NOT EXISTS youtube_url     TEXT,
  ADD COLUMN IF NOT EXISTS mapa_embed      TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS programas_slug_uidx ON programas(slug) WHERE slug IS NOT NULL;

-- ----- paginas de texto livre por secao do microsite -----
CREATE TABLE IF NOT EXISTS programa_paginas (
  id            TEXT PRIMARY KEY,
  programa_id   TEXT REFERENCES programas(id) ON DELETE CASCADE,
  secao         TEXT NOT NULL,
  titulo        TEXT,
  body_value    TEXT,
  body_summary  TEXT,
  ord           INTEGER DEFAULT 0,
  visivel       BOOLEAN DEFAULT TRUE,
  criado_em     TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now(),
  criado_por    TEXT,
  atualizado_por TEXT,
  UNIQUE (programa_id, secao)
);

-- ----- conteudo vinculado a um programa -----
ALTER TABLE news    ADD COLUMN IF NOT EXISTS programa_id TEXT;
ALTER TABLE editais ADD COLUMN IF NOT EXISTS programa_id TEXT;
CREATE INDEX IF NOT EXISTS news_programa_id_idx    ON news(programa_id);
CREATE INDEX IF NOT EXISTS editais_programa_id_idx ON editais(programa_id);
