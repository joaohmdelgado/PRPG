-- Módulo Câmara de Pós-Graduação — Fase 0 (modelo de dados).
-- Substitui a planilha "Processos - Câmara de Pós Graduação.xlsx" usada hoje
-- pela secretaria. Ver requisitos-camara.md (raiz do projeto) para o
-- levantamento completo (diagnóstico, riscos, telas, indicadores, fases).
--
-- Migracao idempotente para bancos JA existentes (o schema.sql ja cria estas
-- tabelas em instalacoes novas e nos testes).
--
-- Aplicar com:
--   docker exec -i prpg-postgres psql -U prpg -d prpg < server/db/migrations/2026-07-26_camara.sql

CREATE TABLE IF NOT EXISTS camara_unidades (
  id            TEXT PRIMARY KEY,
  sigla         TEXT NOT NULL,
  nome          TEXT NOT NULL,
  aliases       TEXT[] DEFAULT '{}',
  interna_prpg  BOOLEAN DEFAULT FALSE,
  ativo         BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS camara_processos (
  id                     TEXT PRIMARY KEY,
  numero                 TEXT NOT NULL UNIQUE,
  numero_valido          BOOLEAN DEFAULT TRUE,
  link_sipac             TEXT,
  assunto                TEXT NOT NULL,
  tipo_materia           TEXT,
  interessado            TEXT,
  programa_id            TEXT REFERENCES programas(id) ON DELETE SET NULL,
  unidade_responsavel_id TEXT REFERENCES camara_unidades(id),
  status                 TEXT NOT NULL DEFAULT 'RECEBIDO',
  status_motivo          TEXT,
  localizacao_id         TEXT REFERENCES camara_unidades(id),
  localizacao_em         TEXT,
  data_entrada           TEXT,
  data_encerramento      TEXT,
  processo_pai_id        TEXT REFERENCES camara_processos(id) ON DELETE SET NULL,
  sigiloso               BOOLEAN DEFAULT FALSE,
  observacoes            TEXT,
  obs_original           TEXT,
  criado_em              TIMESTAMPTZ DEFAULT now(),
  atualizado_em          TIMESTAMPTZ DEFAULT now(),
  criado_por             TEXT,
  atualizado_por         TEXT
);
CREATE INDEX IF NOT EXISTS camara_proc_status_idx  ON camara_processos(status);
CREATE INDEX IF NOT EXISTS camara_proc_prog_idx    ON camara_processos(programa_id);

CREATE TABLE IF NOT EXISTS camara_eventos (
  id            TEXT PRIMARY KEY,
  processo_id   TEXT NOT NULL REFERENCES camara_processos(id) ON DELETE CASCADE,
  tipo          TEXT NOT NULL,
  data          TEXT NOT NULL,
  unidade_id    TEXT REFERENCES camara_unidades(id),
  descricao     TEXT,
  reuniao_id    TEXT,
  relatoria_id  TEXT,
  anexo_url     TEXT,
  criado_em     TIMESTAMPTZ DEFAULT now(),
  criado_por    TEXT
);
CREATE INDEX IF NOT EXISTS camara_ev_proc_idx ON camara_eventos(processo_id, data);

CREATE TABLE IF NOT EXISTS camara_reunioes (
  id            TEXT PRIMARY KEY,
  data          TEXT NOT NULL,
  numero        TEXT,
  tipo          TEXT DEFAULT 'ORDINARIA',
  local         TEXT,
  hora          TEXT,
  status        TEXT NOT NULL DEFAULT 'RASCUNHO',
  pauta_pdf_url TEXT,
  ata_url       TEXT,
  observacoes   TEXT,
  criado_em     TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now(),
  criado_por    TEXT,
  atualizado_por TEXT
);

CREATE TABLE IF NOT EXISTS camara_pauta_itens (
  id             TEXT PRIMARY KEY,
  reuniao_id     TEXT NOT NULL REFERENCES camara_reunioes(id) ON DELETE CASCADE,
  processo_id    TEXT NOT NULL REFERENCES camara_processos(id) ON DELETE CASCADE,
  ordem          INTEGER DEFAULT 0,
  bloco          TEXT,
  deliberacao    TEXT,
  motivo_saida   TEXT,
  registro       TEXT,
  criado_em      TIMESTAMPTZ DEFAULT now(),
  criado_por     TEXT,
  UNIQUE (reuniao_id, processo_id)
);

CREATE TABLE IF NOT EXISTS camara_relatorias (
  id                  TEXT PRIMARY KEY,
  processo_id         TEXT NOT NULL REFERENCES camara_processos(id) ON DELETE CASCADE,
  relator_id          TEXT,
  relator_nome        TEXT NOT NULL,
  programa_id         TEXT REFERENCES programas(id) ON DELETE SET NULL,
  data_designacao     TEXT,
  prazo_devolucao     TEXT,
  data_devolucao      TEXT,
  resultado_parecer   TEXT,
  parecer_url         TEXT,
  ativa               BOOLEAN DEFAULT TRUE,
  motivo_substituicao TEXT,
  criado_em           TIMESTAMPTZ DEFAULT now(),
  criado_por          TEXT
);
CREATE INDEX IF NOT EXISTS camara_rel_proc_idx ON camara_relatorias(processo_id);

CREATE TABLE IF NOT EXISTS camara_atos (
  id            TEXT PRIMARY KEY,
  processo_id   TEXT NOT NULL REFERENCES camara_processos(id) ON DELETE CASCADE,
  tipo          TEXT,
  numero        TEXT,
  ano           INTEGER,
  data          TEXT,
  ementa        TEXT,
  link          TEXT,
  resolucao_id  TEXT REFERENCES resolucoes(id) ON DELETE SET NULL,
  criado_em     TIMESTAMPTZ DEFAULT now(),
  criado_por    TEXT,
  atualizado_por TEXT
);
ALTER TABLE camara_atos ADD COLUMN IF NOT EXISTS atualizado_por TEXT; -- idempotente p/ bancos ja migrados

-- Seed do vocabulário de unidades/setores (ver requisitos-camara.md §6 e §12).
-- Não depende das decisões pendentes (§16): cores e prazo de relatoria seguem
-- em aberto e não fazem parte deste seed.
INSERT INTO camara_unidades (id, sigla, nome, aliases, interna_prpg) VALUES
  ('prpg-secretaria-camara', 'Secretaria da Câmara', 'PRPG - Secretaria da Câmara de Pós-Graduação', '{}', TRUE),
  ('prpg-lato-sensu', 'Lato Sensu', 'PRPG - Lato Sensu', '{}', TRUE),
  ('prpg-internacionalizacao', 'Internacionalização', 'PRPG - Internacionalização', '{}', TRUE),
  ('prpg-dadm', 'DADM', 'PRPG - DADM', '{}', TRUE),
  ('coord-stricto-excelencia', 'CPSE', 'Coordenadoria de Programas Stricto Sensu de Excelência', '{}', TRUE),
  ('seg', 'SEG', 'Secretaria Geral dos Conselhos da Administração Superior', '{"Secretaria Geral dos Conselhos","SECRETARIA GERAL DOS CONSELHOS DA ADMINISTRAÇÃO SUPERIOR-SEG"}', FALSE),
  ('cepe', 'CEPE', 'Conselho de Ensino, Pesquisa e Extensão', '{}', FALSE),
  ('consu', 'CONSU', 'Conselho Universitário', '{}', FALSE),
  ('reitoria', 'Reitoria', 'Reitoria da UFRPE', '{}', FALSE),
  ('progepe', 'PROGEPE', 'Pró-Reitoria de Gestão de Pessoas e Educação', '{}', FALSE),
  ('preg', 'PREG', 'Pró-Reitoria de Ensino de Graduação', '{}', FALSE),
  ('procuradoria-federal', 'Procuradoria Federal', 'Procuradoria Federal junto à UFRPE', '{}', FALSE),
  ('drca', 'DRCA', 'Divisão de Registro e Controle Acadêmico', '{}', FALSE),
  ('arquivo', 'Arquivo', 'Arquivo Geral da UFRPE', '{}', FALSE),
  ('sede', 'Sede', 'Unidades Acadêmicas da Sede (Recife/Dois Irmãos)', '{}', FALSE),
  ('uag', 'UAG', 'Unidade Acadêmica de Garanhuns', '{}', FALSE),
  ('uacsa', 'UACSA', 'Unidade Acadêmica de Cabo de Santo Agostinho', '{}', FALSE),
  ('uast', 'UAST', 'Unidade Acadêmica de Serra Talhada', '{}', FALSE),
  ('uaeadtec', 'UAEADTec', 'Unidade Acadêmica de Educação a Distância e Tecnologia', '{}', FALSE)
ON CONFLICT (id) DO NOTHING;
