-- Schema relacional do site da PRPG/UFRPE.
-- IDs sao TEXT pois os dados existentes usam slugs/timestamps como identificadores.

-- ============================ Usuarios ============================
CREATE TABLE IF NOT EXISTS users (
  id                    TEXT PRIMARY KEY,
  email                 TEXT UNIQUE NOT NULL,
  password_hash         TEXT NOT NULL,
  roles                 TEXT[] NOT NULL DEFAULT '{}',
  priv_mostrar_email    BOOLEAN DEFAULT FALSE,
  priv_mostrar_telefone BOOLEAN DEFAULT FALSE,
  perfil_nome           TEXT,
  perfil_cpf            TEXT,
  perfil_siape          TEXT,
  perfil_foto_url       TEXT,
  perfil_telefones      TEXT[] DEFAULT '{}',
  acad_lattes           TEXT,
  acad_orcid            TEXT,
  acad_google_scholar   TEXT,
  acad_publons          TEXT,
  acad_linhas_pesquisa  TEXT[] DEFAULT '{}',
  -- Perfis variaveis (estrutura livre conforme o papel) ficam como JSONB.
  perfil_aluno          JSONB,
  perfil_professor      JSONB,
  criado_em             TIMESTAMPTZ DEFAULT now(),
  atualizado_em         TIMESTAMPTZ DEFAULT now()
);

-- ============================ Noticias ============================
CREATE TABLE IF NOT EXISTS news (
  id            TEXT PRIMARY KEY,
  title         TEXT NOT NULL,
  category      TEXT,
  category_slug TEXT,
  date          TEXT,
  year          TEXT,
  image         TEXT,
  excerpt       TEXT,
  content       TEXT[] DEFAULT '{}',
  author        TEXT,
  author_role   TEXT,
  image_caption TEXT,
  tags          TEXT[] DEFAULT '{}',
  quote_text    TEXT,
  quote_author  TEXT,
  programa_id   TEXT -- Fase 5: vincula a noticia a um programa (NULL = noticia global da PRPG)
);

-- ============================ Editais =============================
CREATE TABLE IF NOT EXISTS editais (
  id                  TEXT PRIMARY KEY,
  category_id         TEXT,
  category_title      TEXT,
  title               TEXT NOT NULL,
  published_at        TEXT,
  deadline            TEXT,
  year                INTEGER,
  description         TEXT,
  download_link       TEXT,
  details_link        TEXT,
  periodo_data_inicio TEXT,
  periodo_data_fim    TEXT,
  numero              TEXT,
  erratas             JSONB DEFAULT '[]',
  resultado_parcial   TEXT,
  resultado_final     TEXT,
  programa_id         TEXT -- Fase 5: vincula o edital a um programa (NULL = edital global da PRPG)
);

-- ===================== Resolucoes / Formularios ===================
-- Mesma estrutura (lista de documentos com link).
CREATE TABLE IF NOT EXISTS resolucoes (
  id             TEXT PRIMARY KEY,
  section_id     TEXT,
  section_title  TEXT,
  category_title TEXT,
  title          TEXT NOT NULL,
  descricao      TEXT,
  link           TEXT
);

CREATE TABLE IF NOT EXISTS formularios (
  id             TEXT PRIMARY KEY,
  section_id     TEXT,
  section_title  TEXT,
  category_title TEXT,
  title          TEXT NOT NULL,
  descricao      TEXT,
  link           TEXT
);

-- ========================== Calendarios ===========================
CREATE TABLE IF NOT EXISTS calendarios (
  id          TEXT PRIMARY KEY,
  ano         INTEGER,
  is_current  BOOLEAN DEFAULT FALSE,
  title       TEXT,
  pdf_link    TEXT,
  description TEXT
);

CREATE TABLE IF NOT EXISTS calendario_milestones (
  id            SERIAL PRIMARY KEY,
  calendario_id TEXT REFERENCES calendarios(id) ON DELETE CASCADE,
  ord           INTEGER,
  event         TEXT,
  date          TEXT
);

-- ===================== Programas e relacionados ===================
CREATE TABLE IF NOT EXISTS programas (
  id                TEXT PRIMARY KEY,
  nome              TEXT,
  sigla             TEXT,
  site              TEXT,
  codigo_capes      TEXT,
  campus            TEXT,
  em_rede           BOOLEAN DEFAULT FALSE,
  nome_rede         TEXT,
  grande_area       TEXT,
  area_conhecimento TEXT,
  area_avaliacao    TEXT,
  linhas            TEXT[] DEFAULT '{}',
  -- Fase 1: situacao, contato/localizacao e documentos do programa.
  status                 TEXT NOT NULL DEFAULT 'ATIVO', -- ATIVO|SUSPENSO|DESATIVADO|EM_AVALIACAO
  status_descricao       TEXT,
  data_credenciamento    TEXT, -- datas como TEXT 'YYYY-MM-DD' (padrao do projeto)
  data_descredenciamento TEXT,
  bloco                  TEXT,
  sala                   TEXT,
  cep                    TEXT,
  telefone_secretaria    TEXT,
  horario_atendimento    TEXT,
  email_programa         TEXT,
  regimento_url          TEXT,
  regulamento_url        TEXT,
  sucupira_url           TEXT,
  palavras_chave         TEXT[] DEFAULT '{}',
  -- Fase 5: microsite dedicado do programa (identidade visual + contato/redes).
  slug                   TEXT, -- segmento de URL do microsite (ex.: 'pgh'); unico via indice parcial
  microsite_ativo        BOOLEAN DEFAULT FALSE,
  logo_url               TEXT,
  cor_primaria           TEXT, -- hex; fallback para o azul da PRPG
  cor_secundaria         TEXT, -- hex; fallback para o amarelo da PRPG
  descricao_curta        TEXT,
  hero_imagem_url        TEXT,
  endereco               TEXT,
  whatsapp               TEXT,
  instagram_url          TEXT,
  facebook_url           TEXT,
  youtube_url            TEXT,
  mapa_embed             TEXT, -- src do iframe do Google Maps
  criado_em         TIMESTAMPTZ DEFAULT now(),
  atualizado_em     TIMESTAMPTZ DEFAULT now()
);

-- Paginas de texto livre (rich-text) por secao do microsite de cada programa.
-- Uma linha por (programa, secao): 'sobre', 'historico', 'objetivos', 'linhas', etc.
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

CREATE TABLE IF NOT EXISTS pessoas (
  id                  TEXT PRIMARY KEY,
  nome                TEXT,
  cpf                 TEXT,
  siape               TEXT,
  email_institucional TEXT,
  telefones           TEXT,
  endereco            TEXT,
  criado_em           TIMESTAMPTZ DEFAULT now(),
  atualizado_em       TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS modalidades (
  id          TEXT PRIMARY KEY,
  programa_id TEXT REFERENCES programas(id) ON DELETE CASCADE,
  tipo        TEXT,
  ano_inicio  INTEGER,
  nota_capes  TEXT
);

CREATE TABLE IF NOT EXISTS vinculos (
  id              TEXT PRIMARY KEY,
  programa_id     TEXT REFERENCES programas(id) ON DELETE CASCADE,
  -- pessoa_id é polimórfico: aponta para users.id OU pessoas.id (legado),
  -- resolvido na aplicação. Por isso não há FK aqui.
  pessoa_id       TEXT,
  papel           TEXT,
  portaria        TEXT,
  portaria_id     TEXT,
  data_vencimento TEXT,
  email_funcao    TEXT,
  endereco        TEXT,
  -- Fase 2: período do mandato e motivo de encerramento (datas como TEXT 'YYYY-MM-DD').
  data_inicio_mandato TEXT,
  data_fim_mandato    TEXT,
  motivo_encerramento TEXT, -- FIM_MANDATO|RENUNCIA|AFASTADO|APOSENTADO|EXONERADO
  ativo           BOOLEAN DEFAULT TRUE,
  criado_em       TIMESTAMPTZ DEFAULT now()
);

-- Snapshot anual de indicadores por programa (Fase 4 / dashboard).
-- Um registro por (programa, ano) — dado de "foto do ano", não verdade corrente.
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
  taxa_conclusao             NUMERIC(5,2), -- % de conclusão no prazo
  indice_internacionalizacao NUMERIC(5,2), -- % de publicações internacionais
  observacao                 TEXT,
  criado_em                  TIMESTAMPTZ DEFAULT now(),
  atualizado_em              TIMESTAMPTZ DEFAULT now(),
  criado_por                 TEXT,
  atualizado_por             TEXT,
  UNIQUE (programa_id, ano)
);

-- =========================== Portarias ============================
CREATE TABLE IF NOT EXISTS portarias (
  id              TEXT PRIMARY KEY,
  title           TEXT NOT NULL,
  data_portaria   TEXT,
  data_vencimento TEXT,
  download_link   TEXT
);

-- ======================= Grupos de Pesquisa =======================
CREATE TABLE IF NOT EXISTS grupos_pesquisa (
  id            TEXT PRIMARY KEY,
  title         TEXT NOT NULL,
  body_value    TEXT,
  body_summary  TEXT,
  field_lideres JSONB DEFAULT '[]'
);

-- ====================== Teses e Dissertacoes ======================
CREATE TABLE IF NOT EXISTS teses_dissertacoes (
  id            TEXT PRIMARY KEY,
  title         TEXT NOT NULL,
  field_ano     TEXT,
  field_arquivo TEXT,
  field_autor   TEXT,
  field_tipo_td TEXT
);

-- ============================== FAQ ===============================
CREATE TABLE IF NOT EXISTS faq (
  id             TEXT PRIMARY KEY,
  title          TEXT NOT NULL,
  field_resposta TEXT
);

-- =========================== Disciplinas ==========================
CREATE TABLE IF NOT EXISTS disciplinas (
  id                     TEXT PRIMARY KEY,
  title                  TEXT NOT NULL,
  field_carga_horaria    TEXT,
  field_docente          TEXT,
  field_ementa           TEXT,
  field_tipo_disciplina  TEXT
);

-- ============================= Bolsas =============================
CREATE TABLE IF NOT EXISTS bolsas (
  id                    TEXT PRIMARY KEY,
  title                 TEXT NOT NULL,
  field_aluno           TEXT,
  field_periodo_inicio  TEXT,
  field_periodo_fim     TEXT,
  field_tipo_bolsa      TEXT
);

-- ============================= Paginas ============================
CREATE TABLE IF NOT EXISTS pages (
  id           TEXT PRIMARY KEY,
  title        TEXT NOT NULL,
  slug         TEXT UNIQUE,
  body_value   TEXT,
  body_summary TEXT
);

-- =========================== Taxonomias ===========================
-- Configuracao chave -> lista de valores (entradas, linhas_pesquisa, etc.).
CREATE TABLE IF NOT EXISTS taxonomias (
  chave   TEXT PRIMARY KEY,
  valores TEXT[] DEFAULT '{}'
);

-- ===================== Auditoria (Fase 3) =========================
-- criado_por / atualizado_por (id do usuário) em todas as entidades de
-- conteúdo. Bloco idempotente: vale para instalações novas, testes e
-- bancos já existentes (espelhado em server/db/migrations).
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

-- ===================== Microsites por programa (Fase 5) ===========
-- Bloco idempotente: aplica as colunas/indices do microsite em bancos ja
-- existentes (instalacoes novas ja recebem tudo via CREATE TABLE acima).
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

ALTER TABLE news    ADD COLUMN IF NOT EXISTS programa_id TEXT;
ALTER TABLE editais ADD COLUMN IF NOT EXISTS programa_id TEXT;
CREATE INDEX IF NOT EXISTS news_programa_id_idx    ON news(programa_id);
CREATE INDEX IF NOT EXISTS editais_programa_id_idx ON editais(programa_id);
