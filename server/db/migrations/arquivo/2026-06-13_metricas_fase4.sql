-- Fase 4: tabela de indicadores anuais por programa (dashboard).
-- Migracao idempotente para bancos JA existentes (o schema.sql ja cria a
-- tabela em instalacoes novas e nos testes).
--
-- Aplicar com:
--   docker exec -i prpg-postgres psql -U prpg -d prpg < server/db/migrations/2026-06-13_metricas_fase4.sql

CREATE TABLE IF NOT EXISTS metricas_anuais (
  id                         TEXT PRIMARY KEY,
  programa_id                TEXT REFERENCES programas(id) ON DELETE CASCADE,
  ano                        INTEGER NOT NULL,
  docentes_permanentes       INTEGER,
  discentes_mestrado         INTEGER,
  discentes_doutorado        INTEGER,
  discentes_profissional     INTEGER,
  producao_artigos           INTEGER,
  teses_defendidas           INTEGER,
  bolsistas_capes            INTEGER,
  taxa_conclusao             NUMERIC(5,2),
  indice_internacionalizacao NUMERIC(5,2),
  observacao                 TEXT,
  criado_em                  TIMESTAMPTZ DEFAULT now(),
  atualizado_em              TIMESTAMPTZ DEFAULT now(),
  criado_por                 TEXT,
  atualizado_por             TEXT,
  UNIQUE (programa_id, ano)
);
