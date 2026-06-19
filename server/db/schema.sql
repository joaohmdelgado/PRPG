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
  programa_id         TEXT, -- Fase 5: vincula o edital a um programa (NULL = edital global da PRPG)
  proficiencia        BOOLEAN DEFAULT FALSE -- quando TRUE, o edital define o período de inscrição da proficiência
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
  valores TEXT[] DEFAULT '{}',
  meta    JSONB  DEFAULT '{}'
);

-- ===================== Proficiência em Línguas ====================
-- Períodos (editais) de exame de proficiência. As inscrições só são aceitas
-- enquanto houver um período aberto (data_inicio <= hoje <= data_fim).
CREATE TABLE IF NOT EXISTS proficiencia_periodos (
  id            TEXT PRIMARY KEY,
  titulo        TEXT NOT NULL,
  descricao     TEXT,
  data_inicio   TEXT, -- 'YYYY-MM-DD' (padrão do projeto)
  data_fim      TEXT,
  ativo         BOOLEAN DEFAULT TRUE,
  criado_em     TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now(),
  criado_por    TEXT,
  atualizado_por TEXT
);

-- Inscrições de alunos no exame de proficiência.
CREATE TABLE IF NOT EXISTS inscricoes_proficiencia (
  id                          TEXT PRIMARY KEY,
  periodo_id                  TEXT REFERENCES editais(id) ON DELETE SET NULL, -- edital marcado como proficiencia=true
  aluno_id                    TEXT, -- users.id (resolvido na aplicação; pode ser nulo p/ cadastro avulso)
  nome                        TEXT NOT NULL,
  cpf                         TEXT,
  nivel                       TEXT, -- Mestrado | Doutorado
  estrangeiro                 BOOLEAN DEFAULT FALSE,
  linguas                     TEXT[] DEFAULT '{}', -- Português | Inglês | Espanhol
  comprovante_residencia_url  TEXT,
  titular_comprovante         BOOLEAN DEFAULT TRUE,
  comprovante_vinculo_url     TEXT, -- exigido quando titular_comprovante = FALSE
  status                      TEXT NOT NULL DEFAULT 'INSCRITO', -- INSCRITO | AVALIADO
  nota                        NUMERIC(4,2),
  resultado                   TEXT, -- INSUFICIENTE | SUFICIENCIA | PROFICIENCIA (calculado da nota)
  observacao                  TEXT,
  criado_em                   TIMESTAMPTZ DEFAULT now(),
  atualizado_em               TIMESTAMPTZ DEFAULT now(),
  criado_por                  TEXT,
  atualizado_por              TEXT
);
CREATE INDEX IF NOT EXISTS inscricoes_prof_aluno_idx   ON inscricoes_proficiencia(aluno_id);
CREATE INDEX IF NOT EXISTS inscricoes_prof_periodo_idx ON inscricoes_proficiencia(periodo_id);

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

ALTER TABLE news             ADD COLUMN IF NOT EXISTS programa_id TEXT;
ALTER TABLE editais          ADD COLUMN IF NOT EXISTS programa_id TEXT;
ALTER TABLE disciplinas      ADD COLUMN IF NOT EXISTS programa_id TEXT;
ALTER TABLE resolucoes       ADD COLUMN IF NOT EXISTS programa_id TEXT;
ALTER TABLE formularios      ADD COLUMN IF NOT EXISTS programa_id TEXT;
ALTER TABLE teses_dissertacoes ADD COLUMN IF NOT EXISTS programa_id TEXT;
ALTER TABLE faq              ADD COLUMN IF NOT EXISTS programa_id TEXT;
ALTER TABLE grupos_pesquisa  ADD COLUMN IF NOT EXISTS programa_id TEXT;

CREATE INDEX IF NOT EXISTS news_programa_id_idx       ON news(programa_id);
CREATE INDEX IF NOT EXISTS editais_programa_id_idx    ON editais(programa_id);
CREATE INDEX IF NOT EXISTS disciplinas_prog_idx       ON disciplinas(programa_id);
CREATE INDEX IF NOT EXISTS resolucoes_prog_idx        ON resolucoes(programa_id);
CREATE INDEX IF NOT EXISTS formularios_prog_idx       ON formularios(programa_id);
CREATE INDEX IF NOT EXISTS teses_prog_idx             ON teses_dissertacoes(programa_id);
CREATE INDEX IF NOT EXISTS faq_prog_idx               ON faq(programa_id);
CREATE INDEX IF NOT EXISTS grupos_prog_idx            ON grupos_pesquisa(programa_id);

ALTER TABLE pages ADD COLUMN IF NOT EXISTS programa_id TEXT REFERENCES programas(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS pages_programa_id_idx ON pages(programa_id);

-- Gestor de Programa: vincula um usuario a um unico programa que ele administra.
-- NULL = usuario sem programa (Administrator/Gestor da PRPG, professor, aluno, etc.).
ALTER TABLE users ADD COLUMN IF NOT EXISTS programa_id TEXT REFERENCES programas(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS users_programa_id_idx ON users(programa_id);

-- ======= Linhas de pesquisa por programa: TEXT[] → JSONB [{label,target_id}] =======
-- Idempotente: só executa se a coluna ainda for TEXT[].
DO $$
BEGIN
  IF (SELECT data_type FROM information_schema.columns
      WHERE table_name='programas' AND column_name='linhas') = 'ARRAY' THEN
    ALTER TABLE programas ADD COLUMN IF NOT EXISTS linhas_jsonb JSONB DEFAULT '[]';
    UPDATE programas SET linhas_jsonb = (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('label', x, 'target_id', null)), '[]'::jsonb)
      FROM unnest(linhas) x
    ) WHERE linhas IS NOT NULL;
    ALTER TABLE programas DROP COLUMN linhas;
    ALTER TABLE programas RENAME COLUMN linhas_jsonb TO linhas;
    RAISE NOTICE 'Coluna linhas migrada para JSONB.';
  END IF;
END$$;

-- ======= Taxonomias: adiciona coluna meta JSONB (idempotente) =======
ALTER TABLE taxonomias ADD COLUMN IF NOT EXISTS meta JSONB DEFAULT '{}';

-- =================== Linhas de Pesquisa (tabela própria) ==========
-- Substitui programas.linhas JSONB e a entrada linhas_pesquisa em taxonomias.
-- programa_id = programa ao qual a linha está primariamente associada (opcional).
CREATE TABLE IF NOT EXISTS linhas_pesquisa (
  id          SERIAL PRIMARY KEY,
  nome        TEXT NOT NULL,
  programa_id TEXT REFERENCES programas(id) ON DELETE SET NULL,
  target_id   TEXT  -- ID legado do Drupal; remover após concluir importações
);
CREATE INDEX IF NOT EXISTS linhas_pesquisa_prog_idx ON linhas_pesquisa(programa_id);

-- Programas selecionam suas linhas de pesquisa (N:M).
CREATE TABLE IF NOT EXISTS programa_linhas_pesquisa (
  programa_id TEXT    REFERENCES programas(id)       ON DELETE CASCADE,
  linha_id    INTEGER REFERENCES linhas_pesquisa(id) ON DELETE CASCADE,
  PRIMARY KEY (programa_id, linha_id)
);

-- Usuários (professores e alunos) referenciam suas linhas de pesquisa (N:M).
CREATE TABLE IF NOT EXISTS user_linhas_pesquisa (
  user_id  TEXT    REFERENCES users(id)              ON DELETE CASCADE,
  linha_id INTEGER REFERENCES linhas_pesquisa(id)    ON DELETE CASCADE,
  PRIMARY KEY (user_id, linha_id)
);

-- Migração: programas.linhas JSONB → tabela linhas_pesquisa + programa_linhas_pesquisa
-- Idempotente: só executa se a coluna ainda existir em programas.
DO $$
DECLARE
  r        RECORD;
  elem     JSONB;
  lnome    TEXT;
  ltid     TEXT;
  new_id   INTEGER;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'programas' AND column_name = 'linhas'
  ) THEN
    FOR r IN SELECT id, linhas FROM programas WHERE linhas IS NOT NULL LOOP
      FOR elem IN SELECT * FROM jsonb_array_elements(COALESCE(r.linhas, '[]'::jsonb)) LOOP
        lnome := trim(elem->>'label');
        ltid  := NULLIF(trim(COALESCE(elem->>'target_id', '')), '');
        IF lnome IS NOT NULL AND lnome <> '' THEN
          INSERT INTO linhas_pesquisa (nome, programa_id, target_id)
          VALUES (lnome, r.id, ltid)
          RETURNING id INTO new_id;
          INSERT INTO programa_linhas_pesquisa (programa_id, linha_id)
          VALUES (r.id, new_id);
        END IF;
      END LOOP;
    END LOOP;
    ALTER TABLE programas DROP COLUMN linhas;
    RAISE NOTICE 'Coluna programas.linhas migrada para tabela linhas_pesquisa.';
  END IF;
END$$;

-- Remove entrada linhas_pesquisa de taxonomias (agora tem tabela própria).
DELETE FROM taxonomias WHERE chave = 'linhas_pesquisa';

-- Remove acad_linhas_pesquisa de users (substituída por user_linhas_pesquisa).
ALTER TABLE users DROP COLUMN IF EXISTS acad_linhas_pesquisa;

-- ============== Referências de Taxonomia (importação legada) ==============
-- Mapeia o target_id legado do Drupal para um valor canônico, por campo.
-- Espelha linhas_pesquisa: editável via CRUD, com target_id temporário.
-- programa_id NULL = referência GLOBAL (padrão); uma linha com programa_id
-- preenchido SOBRESCREVE a global para aquele programa. A resolução na
-- importação busca primeiro a do programa, depois cai na global.
CREATE TABLE IF NOT EXISTS taxonomia_refs (
  id          SERIAL PRIMARY KEY,
  campo       TEXT NOT NULL,        -- 'entrada' | 'situacao_aluno'
  valor       TEXT NOT NULL,        -- valor canônico ('2023.1', 'Egresso')
  programa_id TEXT REFERENCES programas(id) ON DELETE CASCADE,  -- NULL = global
  target_id   TEXT                  -- ID legado do Drupal (chave de resolução)
);
-- A chave de resolução é (campo, programa_id, target_id). COALESCE trata o
-- NULL global como valor concreto para que a unicidade/idempotência funcione.
CREATE UNIQUE INDEX IF NOT EXISTS taxonomia_refs_uidx
  ON taxonomia_refs(campo, COALESCE(programa_id, ''), target_id);
CREATE INDEX IF NOT EXISTS taxonomia_refs_lookup_idx ON taxonomia_refs(campo, target_id);

-- Seed GLOBAL (programa_id NULL) dos mapeamentos do Profiap. Idempotente:
-- só insere se ainda não houver nenhuma referência global para o campo.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM taxonomia_refs WHERE campo='entrada' AND programa_id IS NULL) THEN
    INSERT INTO taxonomia_refs (campo, valor, target_id) VALUES
      ('entrada','2000.1','17'),('entrada','2000.2','18'),
      ('entrada','2001.1','19'),('entrada','2001.2','20'),
      ('entrada','2002.1','21'),('entrada','2002.2','22'),
      ('entrada','2003.1','23'),('entrada','2003.2','24'),
      ('entrada','2004.1','25'),('entrada','2004.2','26'),
      ('entrada','2005.1','27'),('entrada','2005.2','45'),
      ('entrada','2006.1','28'),('entrada','2006.2','46'),
      ('entrada','2007.1','29'),('entrada','2007.2','47'),
      ('entrada','2008.1','30'),('entrada','2008.1','31'),
      ('entrada','2008.2','48'),
      ('entrada','2009.1','32'),('entrada','2009.2','49'),
      ('entrada','2010.1','33'),('entrada','2010.2','50'),
      ('entrada','2011.1','34'),('entrada','2011.2','51'),
      ('entrada','2012.1','35'),('entrada','2012.2','52'),
      ('entrada','2013.1','36'),('entrada','2013.2','53'),
      ('entrada','2014.1','37'),('entrada','2014.2','54'),
      ('entrada','2015.1','38'),('entrada','2015.2','55'),
      ('entrada','2016.1','39'),('entrada','2016.2','56'),
      ('entrada','2017.1','40'),('entrada','2017.2','57'),
      ('entrada','2018.1','41'),('entrada','2018.2','58'),
      ('entrada','2019.1','42'),('entrada','2019.2','59'),
      ('entrada','2020.1','43'),('entrada','2020.2','60'),
      ('entrada','2021.1','44'),('entrada','2021.2','61'),
      ('entrada','2022.1','2111'),('entrada','2022.2','2112'),
      ('entrada','2023.1','2107'),('entrada','2023.2','2108'),
      ('entrada','2024.1','2109'),('entrada','2024.2','2110');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM taxonomia_refs WHERE campo='situacao_aluno' AND programa_id IS NULL) THEN
    INSERT INTO taxonomia_refs (campo, valor, target_id) VALUES
      ('situacao_aluno','Matriculado','5'),
      ('situacao_aluno','Egresso','6'),
      ('situacao_aluno','Desistente','7');
  END IF;
END$$;

-- 'Trancado' não vem da importação (não tem target_id), mas compõe a lista de
-- situações possíveis do aluno. Inserido como global, idempotente.
INSERT INTO taxonomia_refs (campo, valor, target_id)
SELECT 'situacao_aluno', 'Trancado', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM taxonomia_refs
  WHERE campo='situacao_aluno' AND valor='Trancado' AND programa_id IS NULL
);

-- Unificação: 'Períodos de Entrada' antes vivia em taxonomias.entradas (lista
-- simples) e agora tem fonte única em taxonomia_refs. Migra quaisquer períodos
-- que existiam só na lista antiga (sem target_id), preservando-os. Idempotente.
INSERT INTO taxonomia_refs (campo, valor, target_id)
SELECT 'entrada', t.v, NULL
FROM (SELECT unnest(valores) AS v FROM taxonomias WHERE chave='entradas') t
WHERE NOT EXISTS (
  SELECT 1 FROM taxonomia_refs r
  WHERE r.campo='entrada' AND r.valor = t.v AND r.programa_id IS NULL
);
-- A chave 'entradas' deixa de ser usada (derivada de taxonomia_refs em getAll).
DELETE FROM taxonomias WHERE chave='entradas';

-- Renomeia as situações antigas dos alunos para o vocabulário unificado.
-- Ativo→Matriculado, Desligado→Desistente, Concluído→Egresso (Trancado mantém).
UPDATE users SET perfil_aluno = jsonb_set(perfil_aluno, '{situacao}', '"Matriculado"')
  WHERE perfil_aluno ? 'situacao' AND perfil_aluno->>'situacao' = 'Ativo';
UPDATE users SET perfil_aluno = jsonb_set(perfil_aluno, '{situacao}', '"Desistente"')
  WHERE perfil_aluno ? 'situacao' AND perfil_aluno->>'situacao' = 'Desligado';
UPDATE users SET perfil_aluno = jsonb_set(perfil_aluno, '{situacao}', '"Egresso"')
  WHERE perfil_aluno ? 'situacao' AND perfil_aluno->>'situacao' = 'Concluído';
