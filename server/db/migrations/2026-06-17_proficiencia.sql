-- Proficiência em línguas: períodos (editais) e inscrições.
-- Migracao idempotente para bancos JA existentes (o schema.sql ja cria estas
-- tabelas em instalacoes novas e nos testes).
--
-- Aplicar com:
--   docker exec -i prpg-postgres psql -U prpg -d prpg < server/db/migrations/2026-06-17_proficiencia.sql

CREATE TABLE IF NOT EXISTS proficiencia_periodos (
  id            TEXT PRIMARY KEY,
  titulo        TEXT NOT NULL,
  descricao     TEXT,
  data_inicio   TEXT,
  data_fim      TEXT,
  ativo         BOOLEAN DEFAULT TRUE,
  criado_em     TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now(),
  criado_por    TEXT,
  atualizado_por TEXT
);

CREATE TABLE IF NOT EXISTS inscricoes_proficiencia (
  id                          TEXT PRIMARY KEY,
  periodo_id                  TEXT REFERENCES proficiencia_periodos(id) ON DELETE SET NULL,
  aluno_id                    TEXT,
  nome                        TEXT NOT NULL,
  cpf                         TEXT,
  nivel                       TEXT,
  estrangeiro                 BOOLEAN DEFAULT FALSE,
  linguas                     TEXT[] DEFAULT '{}',
  comprovante_residencia_url  TEXT,
  titular_comprovante         BOOLEAN DEFAULT TRUE,
  comprovante_vinculo_url     TEXT,
  status                      TEXT NOT NULL DEFAULT 'INSCRITO',
  nota                        NUMERIC(4,2),
  resultado                   TEXT,
  observacao                  TEXT,
  criado_em                   TIMESTAMPTZ DEFAULT now(),
  atualizado_em               TIMESTAMPTZ DEFAULT now(),
  criado_por                  TEXT,
  atualizado_por              TEXT
);
CREATE INDEX IF NOT EXISTS inscricoes_prof_aluno_idx   ON inscricoes_proficiencia(aluno_id);
CREATE INDEX IF NOT EXISTS inscricoes_prof_periodo_idx ON inscricoes_proficiencia(periodo_id);
