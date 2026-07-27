-- Schema relacional do site da PRPG/UFRPE.
-- IDs sao TEXT pois os dados existentes usam slugs/timestamps como identificadores.
--
-- Baseline consolidado (Fase A.1 do PLANO.md, 27/07/2026): este arquivo reflete o
-- estado final do banco depois de aplicadas as 11 migracoes historicas de
-- server/db/migrations/arquivo/. As migracoes ficam arquivadas para o registro;
-- este arquivo e a fonte unica para `npm run db:migrate` reconstruir do zero.
--
-- As FKs dos 8 `programa_id` (Fase A.11) ja foram aplicadas. As FKs
-- polimorficas de `vinculos.pessoa_id` e `camara_relatorias.relator_id`
-- continuam pendentes de proposito: apertar `vinculos.pessoa_id` exige
-- reescrever simultaneamente a criacao de usuario, a listagem por pessoa e
-- a limpeza ao excluir usuario (ver nota em `vinculos` mais abaixo) - fica
-- para a Fase B.3.

-- ============================ Usuarios ============================
CREATE TABLE IF NOT EXISTS users (
  id                    TEXT PRIMARY KEY,
  email                 TEXT UNIQUE NOT NULL,
  password_hash         TEXT NOT NULL,
  -- TRUE quando a senha é provisória (padrão 'Mudar123' ou reset pelo admin):
  -- o usuário é obrigado a trocá-la no primeiro acesso antes de usar o painel.
  senha_temporaria      BOOLEAN DEFAULT FALSE,
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
  -- Perfis variaveis (estrutura livre conforme o papel) ficam como JSONB.
  perfil_aluno          JSONB,
  perfil_professor      JSONB,
  -- Gestor de Programa: vincula o usuario a um unico programa que ele administra.
  -- NULL = usuario sem programa (Administrator/Gestor da PRPG, professor, aluno, etc.).
  -- FK para programas(id) e adicionada mais abaixo, depois que a tabela existe.
  programa_id           TEXT,
  -- Fase A.2 (G1): identidade real da pessoa. FK+UNIQUE adicionadas mais abaixo,
  -- depois que `pessoas` existe. NULL ate o backfill (script de migracao).
  pessoa_id             TEXT,
  criado_em             TIMESTAMPTZ DEFAULT now(),
  atualizado_em         TIMESTAMPTZ DEFAULT now(),
  criado_por            TEXT,
  atualizado_por        TEXT
);
CREATE INDEX IF NOT EXISTS users_programa_id_idx ON users(programa_id);

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
  programa_id   TEXT, -- Fase 5: vincula a noticia a um programa (NULL = noticia global da PRPG)
  criado_por    TEXT,
  atualizado_por TEXT
);
CREATE INDEX IF NOT EXISTS news_programa_id_idx ON news(programa_id);

-- ============================ Editais =============================
CREATE TABLE IF NOT EXISTS editais (
  id                  TEXT PRIMARY KEY,
  category_id         TEXT,
  category_title      TEXT,
  title               TEXT NOT NULL,
  published_at        DATE,
  deadline            DATE,
  year                INTEGER,
  description         TEXT,
  download_link       TEXT,
  details_link        TEXT,
  periodo_data_inicio DATE,
  periodo_data_fim    DATE,
  numero              TEXT,
  erratas             JSONB DEFAULT '[]',
  resultado_parcial   TEXT,
  resultado_final     TEXT,
  programa_id         TEXT, -- Fase 5: vincula o edital a um programa (NULL = edital global da PRPG)
  proficiencia        BOOLEAN DEFAULT FALSE, -- quando TRUE, o edital define o período de inscrição da proficiência
  proficiencia_data_prova DATE, -- data da prova de proficiência (usada na declaração)
  criado_por          TEXT,
  atualizado_por      TEXT
);
CREATE INDEX IF NOT EXISTS editais_programa_id_idx ON editais(programa_id);

-- ===================== Resolucoes / Formularios ===================
-- Mesma estrutura (lista de documentos com link).
CREATE TABLE IF NOT EXISTS resolucoes (
  id             TEXT PRIMARY KEY,
  section_id     TEXT,
  section_title  TEXT,
  category_title TEXT,
  title          TEXT NOT NULL,
  descricao      TEXT,
  link           TEXT,
  programa_id    TEXT,
  criado_por     TEXT,
  atualizado_por TEXT
);
CREATE INDEX IF NOT EXISTS resolucoes_prog_idx ON resolucoes(programa_id);

CREATE TABLE IF NOT EXISTS formularios (
  id             TEXT PRIMARY KEY,
  section_id     TEXT,
  section_title  TEXT,
  category_title TEXT,
  title          TEXT NOT NULL,
  descricao      TEXT,
  link           TEXT,
  programa_id    TEXT,
  criado_por     TEXT,
  atualizado_por TEXT
);
CREATE INDEX IF NOT EXISTS formularios_prog_idx ON formularios(programa_id);

-- ========================== Calendarios ===========================
CREATE TABLE IF NOT EXISTS calendarios (
  id          TEXT PRIMARY KEY,
  ano         INTEGER,
  is_current  BOOLEAN DEFAULT FALSE,
  title       TEXT,
  pdf_link    TEXT,
  description TEXT,
  criado_por     TEXT,
  atualizado_por TEXT
);

CREATE TABLE IF NOT EXISTS calendario_milestones (
  id            SERIAL PRIMARY KEY,
  calendario_id TEXT REFERENCES calendarios(id) ON DELETE CASCADE,
  ord           INTEGER,
  event         TEXT,
  date          TEXT
);

-- ==================== Arquivos e anexos (Fase A.5, G5) =============
-- Registro de todo arquivo enviado por /api/upload. Uma linha por upload.
CREATE TABLE IF NOT EXISTS arquivos (
  id            TEXT PRIMARY KEY,
  url           TEXT NOT NULL,          -- '/uploads/xxx.pdf'
  nome_original TEXT,
  mime          TEXT,
  tamanho_bytes BIGINT,
  sha256        TEXT,                   -- dedupe e verificacao de integridade (nao preenchido ainda)
  sigiloso      BOOLEAN DEFAULT FALSE,  -- documento pessoal (LGPD)
  enviado_em    TIMESTAMPTZ DEFAULT now(),
  enviado_por   TEXT REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS arquivos_sha_idx ON arquivos(sha256);

-- Vinculo N:N entre um arquivo e qualquer entidade. Substitui as ~19 colunas
-- *_url espalhadas (a migracao dessas colunas e a Fase B, ainda nao aplicada).
CREATE TABLE IF NOT EXISTS anexos (
  id          TEXT PRIMARY KEY,
  entidade    TEXT NOT NULL,   -- 'processo'|'pos_doutorado'|'inscricao_proficiencia'|'programa'|...
  entidade_id TEXT NOT NULL,
  arquivo_id  TEXT NOT NULL REFERENCES arquivos(id) ON DELETE CASCADE,
  tipo        TEXT,            -- PLANO_TRABALHO|RELATORIO_FINAL|PARECER|ATA|COMPROVANTE_RESIDENCIA|...
  descricao   TEXT,
  ordem       INTEGER DEFAULT 0,
  criado_em   TIMESTAMPTZ DEFAULT now(),
  criado_por  TEXT
);
CREATE INDEX IF NOT EXISTS anexos_entidade_idx ON anexos(entidade, entidade_id);

-- ==================== Contatos (Fase A.5b, PLANO.md) ================
-- Meio de contato de qualquer entidade. Vai absorver, na Fase G, os 8 campos
-- hoje espalhados (pessoas.email_institucional/telefones, programas.email_
-- programa/telefone_secretaria/whatsapp, vinculos.email_funcao, etc.) — essa
-- migracao de dado e remocao das colunas antigas ainda nao foi aplicada
-- aqui, para nao mudar comportamento nesta fase.
CREATE TABLE IF NOT EXISTS contatos (
  id             TEXT PRIMARY KEY,
  entidade       TEXT NOT NULL,   -- 'pessoa'|'programa'|'unidade'
  entidade_id    TEXT NOT NULL,
  tipo           TEXT NOT NULL,   -- EMAIL|TELEFONE|CELULAR|WHATSAPP|RAMAL|SITE|INSTAGRAM|...
  valor          TEXT NOT NULL,   -- normalizado (e-mail minusculo; telefone so digitos com DDD)
  valor_exibicao TEXT,            -- '(81) 99611-6668'
  rotulo         TEXT,            -- 'institucional'|'pessoal'|'coordenacao'|'secretaria'
  -- FK para vinculos(id) adicionada mais abaixo, depois que a tabela existe.
  vinculo_id     TEXT,
  principal      BOOLEAN DEFAULT FALSE,
  publico        BOOLEAN DEFAULT FALSE,  -- controla o que vai ao site (LGPD)
  observacao     TEXT,
  ordem          INTEGER DEFAULT 0,
  criado_em      TIMESTAMPTZ DEFAULT now(),
  atualizado_em  TIMESTAMPTZ DEFAULT now(),
  criado_por     TEXT,
  atualizado_por TEXT
);
CREATE INDEX IF NOT EXISTS contatos_entidade_idx ON contatos(entidade, entidade_id);
CREATE INDEX IF NOT EXISTS contatos_valor_idx    ON contatos(tipo, valor);
CREATE INDEX IF NOT EXISTS contatos_vinculo_idx  ON contatos(vinculo_id);

-- ==================== Eventos (Fase A.6, G2) =======================
-- Linha do tempo append-only de qualquer entidade. NADA aqui e atualizado
-- ou apagado: cada linha e um fato datado e imutavel. Lista fechada de
-- entidades em server/db/core.js (ENTIDADES) - mesma lista do CHECK abaixo.
-- ato_id ganha FK real na Fase A.8, quando `atos` existir.
CREATE TABLE IF NOT EXISTS eventos (
  id          TEXT PRIMARY KEY,
  entidade    TEXT NOT NULL CHECK (entidade IN (
                'processo','pos_doutorado','inscricao_proficiencia','edital',
                'programa','pessoa','unidade','vinculo','ato'
              )),
  entidade_id TEXT NOT NULL,
  tipo        TEXT NOT NULL,
  data        DATE NOT NULL,
  descricao   TEXT,
  -- pessoa_id/unidade_id ganham FK mais abaixo, depois que essas tabelas existem.
  pessoa_id   TEXT,
  unidade_id  TEXT,
  arquivo_id  TEXT REFERENCES arquivos(id) ON DELETE SET NULL,
  ato_id      TEXT, -- FK para atos(id) adicionada na Fase A.8
  origem_tipo TEXT,
  origem_id   TEXT,
  dados       JSONB DEFAULT '{}',
  criado_em   TIMESTAMPTZ DEFAULT now(),
  criado_por  TEXT REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS eventos_entidade_idx ON eventos(entidade, entidade_id, data DESC);
CREATE INDEX IF NOT EXISTS eventos_tipo_idx     ON eventos(entidade, tipo);

-- Trigger generico de limpeza em cascata para as tabelas polimorficas
-- (eventos/anexos/declaracoes/contatos), aplicado tabela a tabela quando a
-- tabela dona existir (ver arquitetura-dados.md §5.10). `declaracoes` ainda
-- nao existe (Fase A.9); a funcao ja cobre a chamada para nao precisar
-- recriar depois.
CREATE OR REPLACE FUNCTION limpar_dependentes() RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM eventos  WHERE entidade = TG_ARGV[0] AND entidade_id = OLD.id;
  DELETE FROM anexos   WHERE entidade = TG_ARGV[0] AND entidade_id = OLD.id;
  DELETE FROM contatos WHERE entidade = TG_ARGV[0] AND entidade_id = OLD.id;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'declaracoes') THEN
    EXECUTE 'DELETE FROM declaracoes WHERE entidade = $1 AND entidade_id = $2'
      USING TG_ARGV[0], OLD.id;
  END IF;
  RETURN OLD;
END; $$ LANGUAGE plpgsql;

-- ===================== Programas e relacionados ===================
CREATE TABLE IF NOT EXISTS programas (
  id                TEXT PRIMARY KEY,
  nome              TEXT,
  sigla             TEXT,
  codigo_capes      TEXT,
  campus            TEXT,
  em_rede           BOOLEAN DEFAULT FALSE,
  nome_rede         TEXT,
  grande_area       TEXT,
  area_conhecimento TEXT,
  area_avaliacao    TEXT,
  -- Fase 1: situacao, contato/localizacao e documentos do programa.
  status                 TEXT NOT NULL DEFAULT 'ATIVO', -- ATIVO|SUSPENSO|DESATIVADO|EM_AVALIACAO
  status_descricao       TEXT,
  data_credenciamento    DATE, -- Fase A.3 (G7): DATE nativo; fromRow formata 'YYYY-MM-DD'
  data_descredenciamento DATE,
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
  atualizado_em     TIMESTAMPTZ DEFAULT now(),
  criado_por        TEXT,
  atualizado_por    TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS programas_slug_uidx ON programas(slug) WHERE slug IS NOT NULL;

-- users.programa_id so pode ganhar a FK depois que `programas` existe.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_programa_id_fkey') THEN
    ALTER TABLE users ADD CONSTRAINT users_programa_id_fkey
      FOREIGN KEY (programa_id) REFERENCES programas(id) ON DELETE SET NULL;
  END IF;
END$$;

-- Fase A.11 (PLANO.md): os 8 programa_id que ate aqui eram TEXT solto ganham
-- FK real, uma vez confirmado (antes de aplicar em producao) que nao ha
-- valor orfao em nenhuma das 8 tabelas.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'news_programa_id_fkey') THEN
    ALTER TABLE news ADD CONSTRAINT news_programa_id_fkey
      FOREIGN KEY (programa_id) REFERENCES programas(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'editais_programa_id_fkey') THEN
    ALTER TABLE editais ADD CONSTRAINT editais_programa_id_fkey
      FOREIGN KEY (programa_id) REFERENCES programas(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'resolucoes_programa_id_fkey') THEN
    ALTER TABLE resolucoes ADD CONSTRAINT resolucoes_programa_id_fkey
      FOREIGN KEY (programa_id) REFERENCES programas(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'formularios_programa_id_fkey') THEN
    ALTER TABLE formularios ADD CONSTRAINT formularios_programa_id_fkey
      FOREIGN KEY (programa_id) REFERENCES programas(id) ON DELETE SET NULL;
  END IF;
END$$;

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

-- Fase A.2 (G1, PLANO.md): pessoas passa a ser a identidade de quem tem login
-- (users.pessoa_id abaixo) e de quem nao tem (vinculos.pessoa_id legado,
-- camara_relatorias.relator_id). email_institucional/telefones ainda vivem
-- aqui (a extracao para `contatos` e a Fase A.5b, ainda nao aplicada).
CREATE TABLE IF NOT EXISTS pessoas (
  id                  TEXT PRIMARY KEY,
  nome                TEXT,
  cpf                 TEXT,
  cpf_valido          BOOLEAN DEFAULT TRUE,   -- FALSE = DV nao confere (aviso, nao bloqueio)
  siape               TEXT,
  sexo                TEXT,                   -- migrado de perfil_aluno/perfil_professor (A.2a)
  email_institucional TEXT,
  telefones           TEXT,
  endereco            TEXT,
  foto_url            TEXT,
  nacionalidade       TEXT,
  estrangeiro         BOOLEAN DEFAULT FALSE,
  lattes              TEXT,
  orcid               TEXT,
  google_scholar      TEXT,
  publons             TEXT,
  criado_em           TIMESTAMPTZ DEFAULT now(),
  atualizado_em       TIMESTAMPTZ DEFAULT now(),
  criado_por          TEXT,
  atualizado_por      TEXT
);

-- users.pessoa_id so pode ganhar FK/UNIQUE depois que `pessoas` existe.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_pessoa_id_fkey') THEN
    ALTER TABLE users ADD CONSTRAINT users_pessoa_id_fkey
      FOREIGN KEY (pessoa_id) REFERENCES pessoas(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_pessoa_id_key') THEN
    ALTER TABLE users ADD CONSTRAINT users_pessoa_id_key UNIQUE (pessoa_id);
  END IF;
END$$;

-- eventos.pessoa_id (Fase A.6) so pode ganhar FK depois que `pessoas` existe.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'eventos_pessoa_id_fkey') THEN
    ALTER TABLE eventos ADD CONSTRAINT eventos_pessoa_id_fkey
      FOREIGN KEY (pessoa_id) REFERENCES pessoas(id) ON DELETE SET NULL;
  END IF;
END$$;

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
  -- resolvido na aplicação. FK real fica para a Fase B.3, quando buildCombined
  -- vira JOIN — apertar a FK agora exigiria mudar simultaneamente a criação
  -- de usuário, a listagem por pessoa e a limpeza de vínculos ao excluir
  -- usuário (todas hoje comparam pessoa_id a users.id), risco desproporcional
  -- para o ganho nesta fase.
  pessoa_id       TEXT,
  papel           TEXT,
  portaria        TEXT,
  portaria_id     TEXT,
  data_vencimento DATE,
  email_funcao    TEXT,
  endereco        TEXT,
  -- Fase 2: período do mandato e motivo de encerramento. Fase A.3 (G7): DATE nativo.
  data_inicio_mandato DATE,
  data_fim_mandato    DATE,
  motivo_encerramento TEXT, -- FIM_MANDATO|RENUNCIA|AFASTADO|APOSENTADO|EXONERADO
  -- Fase A.10 (G9): carater/ordem/situacao_manual do modelo harmonizado.
  -- `situacao` NAO e coluna: e derivada de data_inicio/data_fim_mandato por
  -- server/utils/vigencia.js, com situacao_manual como unica excecao.
  carater             TEXT DEFAULT 'EFETIVO', -- EFETIVO|PRO_TEMPORE|SUBSTITUTO_EVENTUAL|INTERINO
  ordem               INTEGER DEFAULT 0,       -- ordenacao da equipe na exibicao
  situacao_manual     TEXT,                    -- so o que as datas nao dizem: RENUNCIA|AFASTADO|...
  ativo           BOOLEAN DEFAULT TRUE,
  criado_em       TIMESTAMPTZ DEFAULT now()
);

-- contatos.vinculo_id so pode ganhar FK depois que `vinculos` existe.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'contatos_vinculo_id_fkey') THEN
    ALTER TABLE contatos ADD CONSTRAINT contatos_vinculo_id_fkey
      FOREIGN KEY (vinculo_id) REFERENCES vinculos(id) ON DELETE CASCADE;
  END IF;
END$$;

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

-- ==================== Atos e documentos (Fase A.8, G4) ==============
-- Unifica, no futuro (Fase B, ainda nao aplicada), portarias + camara_atos +
-- resolucoes + o livro de numeracao de oficios/editais em uma unica tabela
-- que emite numero (nao so registra). Ver requisitos-expedientes.md §5.1-5.2.
-- Nenhuma tela consome isto ainda nesta fase.

-- Serie de numeracao: um "livro" (Oficio, Portaria PRPG, Edital PRPG, ...).
CREATE TABLE IF NOT EXISTS ato_series (
  id                 TEXT PRIMARY KEY,
  nome               TEXT NOT NULL,
  especie            TEXT NOT NULL,   -- OFICIO|PORTARIA|EDITAL|RESOLUCAO|DESPACHO|MEMORANDO|CIRCULAR
  sigla              TEXT,
  formato            TEXT DEFAULT '{sigla} Nº {sequencial}/{ano} - PRPG/UFRPE',
  -- FK para unidades(id) adicionada mais abaixo, depois que a tabela existe.
  unidade_id         TEXT,
  reinicia_por_ano   BOOLEAN DEFAULT TRUE,
  exige_destinatario BOOLEAN DEFAULT FALSE,
  publica_no_site    BOOLEAN DEFAULT FALSE,
  ativo              BOOLEAN DEFAULT TRUE,
  ordem              INTEGER DEFAULT 0
);

-- Ato administrativo expedido pela PRPG: oficio, portaria, edital, resolucao,
-- decisao, despacho. Referenciado por vinculos, processos, pos_doutorados e
-- editais (ato_id abaixo).
CREATE TABLE IF NOT EXISTS atos (
  id                      TEXT PRIMARY KEY,
  serie_id                TEXT NOT NULL REFERENCES ato_series(id),
  ano                     INTEGER NOT NULL,
  sequencial              INTEGER NOT NULL,
  numero_exibicao         TEXT,          -- cache: 'OFÍCIO Nº 49/2026 - PRPG/UFRPE'
  situacao                TEXT NOT NULL DEFAULT 'RESERVADO', -- RESERVADO|EMITIDO|PUBLICADO|CANCELADO|SEM_EFEITO|RETIFICADO
  situacao_motivo         TEXT,
  data                    DATE,          -- expedicao (NULL enquanto RESERVADO)
  titulo                  TEXT,
  assunto                 TEXT NOT NULL,
  ementa                  TEXT,
  solicitante_pessoa_id   TEXT REFERENCES pessoas(id)  ON DELETE SET NULL,
  -- unidade_origem_id/destinatario_unidade_id/processo_id ganham FK mais
  -- abaixo, depois que `unidades`/`processos` existem (criadas mais adiante).
  unidade_origem_id       TEXT,
  destinatario_unidade_id TEXT,
  destinatario_texto      TEXT,
  interessado_pessoa_id   TEXT REFERENCES pessoas(id)  ON DELETE SET NULL,
  processo_id             TEXT,
  programa_id             TEXT REFERENCES programas(id) ON DELETE SET NULL,
  arquivo_id              TEXT REFERENCES arquivos(id) ON DELETE SET NULL,
  link_externo            TEXT,
  vigencia_inicio         DATE,
  vigencia_fim            DATE,          -- era portarias.data_vencimento
  publicado               BOOLEAN DEFAULT FALSE,
  secao                   TEXT,          -- era resolucoes.section_title
  categoria               TEXT,          -- era resolucoes.category_title
  observacoes             TEXT,
  obs_original            TEXT,
  criado_em               TIMESTAMPTZ DEFAULT now(),
  atualizado_em           TIMESTAMPTZ DEFAULT now(),
  criado_por              TEXT,
  atualizado_por          TEXT,
  UNIQUE (serie_id, ano, sequencial)   -- impede numero duplicado por construcao
);
CREATE INDEX IF NOT EXISTS atos_serie_ano_idx ON atos(serie_id, ano, sequencial DESC);
CREATE INDEX IF NOT EXISTS atos_publicado_idx ON atos(publicado) WHERE publicado;

-- Fase A.11: eventos.ato_id (criada em A.6, antes de `atos` existir) e
-- vinculos.ato_id (nova - portaria de designacao, ainda sem populador; a
-- Fase E.14 preenche retroativamente a partir das portarias importadas)
-- so podem ganhar FK agora que `atos` existe.
ALTER TABLE vinculos ADD COLUMN IF NOT EXISTS ato_id TEXT;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'eventos_ato_id_fkey') THEN
    ALTER TABLE eventos ADD CONSTRAINT eventos_ato_id_fkey
      FOREIGN KEY (ato_id) REFERENCES atos(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'vinculos_ato_id_fkey') THEN
    ALTER TABLE vinculos ADD CONSTRAINT vinculos_ato_id_fkey
      FOREIGN KEY (ato_id) REFERENCES atos(id) ON DELETE SET NULL;
  END IF;
END$$;

-- Aloca o proximo sequencial de uma serie/ano de forma atomica (lock
-- transacional por serie+ano - concorrentes serializam, sem numero repetido
-- ou buraco). Uso pleno (reserva formal) e da Fase E; a funcao ja existe aqui
-- porque faz parte do modelo de `atos`.
CREATE OR REPLACE FUNCTION proximo_sequencial(p_serie_id TEXT, p_ano INTEGER) RETURNS INTEGER AS $$
DECLARE
  v_next INTEGER;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext(p_serie_id || ':' || p_ano::text));
  SELECT COALESCE(MAX(sequencial), 0) + 1 INTO v_next FROM atos WHERE serie_id = p_serie_id AND ano = p_ano;
  RETURN v_next;
END; $$ LANGUAGE plpgsql;

-- Referencia entre atos: revoga, torna sem efeito, retifica, publica, encaminha...
CREATE TABLE IF NOT EXISTS ato_referencias (
  id            TEXT PRIMARY KEY,
  ato_id        TEXT NOT NULL REFERENCES atos(id) ON DELETE CASCADE,
  ato_ref_id    TEXT REFERENCES atos(id) ON DELETE SET NULL,
  ato_ref_texto TEXT,            -- quando o referenciado nao esta cadastrado
  tipo          TEXT NOT NULL,   -- REVOGA|TORNA_SEM_EFEITO|RETIFICA|PUBLICA|ENCAMINHA|COMPLEMENTA|FUNDAMENTA
  criado_em     TIMESTAMPTZ DEFAULT now(),
  criado_por    TEXT
);

-- O edital publicado no site aponta para o ato que lhe deu numero.
ALTER TABLE editais ADD COLUMN IF NOT EXISTS ato_id TEXT REFERENCES atos(id) ON DELETE SET NULL;

-- Documentos para download que NAO sao atos (sem numero/ano/orgao emissor):
-- formularios, manuais, modelos, cartilhas. Sera o destino de `formularios`
-- na Fase B (D-A3: conferido o conteudo real de formularios.json - nenhum
-- item e ato normativo disfarcado; a tabela formularios continua em uso
-- ate a Fase B migrar as telas).
CREATE TABLE IF NOT EXISTS documentos (
  id             TEXT PRIMARY KEY,
  tipo           TEXT NOT NULL DEFAULT 'FORMULARIO', -- FORMULARIO|MANUAL|MODELO|CARTILHA
  titulo         TEXT NOT NULL,
  descricao      TEXT,
  secao          TEXT,
  categoria      TEXT,
  arquivo_id     TEXT REFERENCES arquivos(id) ON DELETE SET NULL,
  link_externo   TEXT,
  programa_id    TEXT REFERENCES programas(id) ON DELETE SET NULL,
  ordem          INTEGER DEFAULT 0,
  criado_em      TIMESTAMPTZ DEFAULT now(),
  atualizado_em  TIMESTAMPTZ DEFAULT now(),
  criado_por     TEXT,
  atualizado_por TEXT
);

-- ================ Declarações verificáveis (Fase A.9, G6) ===========
-- Documento emitido com codigo de verificacao publica (padrao hoje existente
-- so na proficiencia - inscricoes_proficiencia.codigo_verificacao/emitida_em).
-- O snapshot congela o que era verdade na emissao. A migracao da proficiencia
-- para usar esta tabela e a Fase B.2, ainda nao aplicada.
CREATE TABLE IF NOT EXISTS declaracoes (
  id              TEXT PRIMARY KEY,
  codigo          TEXT NOT NULL UNIQUE,   -- UUID (crypto.randomUUID()) no QR e no link
  tipo            TEXT NOT NULL,          -- PROFICIENCIA|VINCULO_POSDOC|CONCLUSAO_POSDOC|VINCULO_DISCENTE|ESPELHO_PROCESSO
  entidade        TEXT NOT NULL,
  entidade_id     TEXT NOT NULL,
  pessoa_id       TEXT REFERENCES pessoas(id) ON DELETE SET NULL,
  dados           JSONB NOT NULL,         -- snapshot: nome, CPF, periodo, resultado...
  emitida_em      TIMESTAMPTZ NOT NULL DEFAULT now(),  -- congelada na 1a emissao
  emitida_por     TEXT REFERENCES users(id) ON DELETE SET NULL,
  valida_ate      DATE,                   -- ex.: proficiencia vale 4 anos
  revogada_em     TIMESTAMPTZ,
  revogada_motivo TEXT
);
CREATE INDEX IF NOT EXISTS declaracoes_entidade_idx ON declaracoes(entidade, entidade_id);

-- =========================== Portarias ============================
CREATE TABLE IF NOT EXISTS portarias (
  id              TEXT PRIMARY KEY,
  title           TEXT NOT NULL,
  data_portaria   DATE,
  data_vencimento DATE,
  download_link   TEXT,
  criado_por      TEXT,
  atualizado_por  TEXT
);

-- ======================= Grupos de Pesquisa =======================
CREATE TABLE IF NOT EXISTS grupos_pesquisa (
  id            TEXT PRIMARY KEY,
  title         TEXT NOT NULL,
  body_value    TEXT,
  body_summary  TEXT,
  field_lideres JSONB DEFAULT '[]',
  programa_id   TEXT,
  criado_por    TEXT,
  atualizado_por TEXT
);
CREATE INDEX IF NOT EXISTS grupos_prog_idx ON grupos_pesquisa(programa_id);

-- ====================== Teses e Dissertacoes ======================
CREATE TABLE IF NOT EXISTS teses_dissertacoes (
  id            TEXT PRIMARY KEY,
  title         TEXT NOT NULL,
  field_ano     TEXT,
  field_arquivo TEXT,
  field_autor   TEXT,
  field_tipo_td TEXT,
  programa_id   TEXT,
  criado_por    TEXT,
  atualizado_por TEXT
);
CREATE INDEX IF NOT EXISTS teses_prog_idx ON teses_dissertacoes(programa_id);

-- ============================== FAQ ===============================
CREATE TABLE IF NOT EXISTS faq (
  id             TEXT PRIMARY KEY,
  title          TEXT NOT NULL,
  field_resposta TEXT,
  programa_id    TEXT,
  criado_por     TEXT,
  atualizado_por TEXT
);
CREATE INDEX IF NOT EXISTS faq_prog_idx ON faq(programa_id);

-- =========================== Disciplinas ==========================
CREATE TABLE IF NOT EXISTS disciplinas (
  id                     TEXT PRIMARY KEY,
  title                  TEXT NOT NULL,
  field_carga_horaria    TEXT,
  field_docente          TEXT,
  field_ementa           TEXT,
  field_tipo_disciplina  TEXT,
  programa_id            TEXT,
  criado_por             TEXT,
  atualizado_por         TEXT
);
CREATE INDEX IF NOT EXISTS disciplinas_prog_idx ON disciplinas(programa_id);

-- Fase A.11: as 4 tabelas acima sao criadas depois de `programas` no arquivo,
-- mas antes do bloco de FKs la de cima - por isso ganham a FK aqui.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'teses_dissertacoes_programa_id_fkey') THEN
    ALTER TABLE teses_dissertacoes ADD CONSTRAINT teses_dissertacoes_programa_id_fkey
      FOREIGN KEY (programa_id) REFERENCES programas(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'faq_programa_id_fkey') THEN
    ALTER TABLE faq ADD CONSTRAINT faq_programa_id_fkey
      FOREIGN KEY (programa_id) REFERENCES programas(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'disciplinas_programa_id_fkey') THEN
    ALTER TABLE disciplinas ADD CONSTRAINT disciplinas_programa_id_fkey
      FOREIGN KEY (programa_id) REFERENCES programas(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'grupos_pesquisa_programa_id_fkey') THEN
    ALTER TABLE grupos_pesquisa ADD CONSTRAINT grupos_pesquisa_programa_id_fkey
      FOREIGN KEY (programa_id) REFERENCES programas(id) ON DELETE SET NULL;
  END IF;
END$$;

-- ============================= Bolsas =============================
CREATE TABLE IF NOT EXISTS bolsas (
  id                    TEXT PRIMARY KEY,
  title                 TEXT NOT NULL,
  field_aluno           TEXT,
  field_periodo_inicio  TEXT,
  field_periodo_fim     TEXT,
  field_tipo_bolsa      TEXT,
  criado_por            TEXT,
  atualizado_por        TEXT
);

-- ============================= Paginas ============================
CREATE TABLE IF NOT EXISTS pages (
  id             TEXT PRIMARY KEY,
  title          TEXT NOT NULL,
  slug           TEXT UNIQUE,
  body_value     TEXT,
  body_summary   TEXT,
  programa_id    TEXT REFERENCES programas(id) ON DELETE SET NULL,
  criado_por     TEXT,
  atualizado_por TEXT
);
CREATE INDEX IF NOT EXISTS pages_programa_id_idx ON pages(programa_id);

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
-- NOTA: tabela morta (sem controller/rota) — removida na Fase A.12 do PLANO.md.
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
  codigo_verificacao          TEXT, -- UUID público p/ verificar autenticidade (gerado na 1a emissão)
  emitida_em                  TIMESTAMPTZ, -- data congelada da 1a emissão da declaração
  criado_em                   TIMESTAMPTZ DEFAULT now(),
  atualizado_em               TIMESTAMPTZ DEFAULT now(),
  criado_por                  TEXT,
  atualizado_por              TEXT
);
CREATE INDEX IF NOT EXISTS inscricoes_prof_aluno_idx   ON inscricoes_proficiencia(aluno_id);
CREATE INDEX IF NOT EXISTS inscricoes_prof_periodo_idx ON inscricoes_proficiencia(periodo_id);
CREATE UNIQUE INDEX IF NOT EXISTS inscricoes_prof_codigo_idx ON inscricoes_proficiencia(codigo_verificacao);

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

-- ===================== Câmara de Pós-Graduação (Fase 0) ====================
-- Substitui a planilha de controle de processos da secretaria da Câmara.
-- Ver requisitos-camara.md (raiz do projeto) para o levantamento completo.
-- Modelo: o processo é o registro permanente (chave = NUP); a reunião é um
-- evento; "estar na pauta" é uma relação N:N (camara_pauta_itens); a
-- tramitação é um histórico append-only (camara_eventos) — nada é sobrescrito.
-- Setores/unidades da UFRPE por onde os processos tramitam. Fase A.4 (G8):
-- era `camara_unidades`; nada nela é específico da Câmara (serve também a
-- Expedientes/Contatos). O binding JS (camaraUnidadesRepo) só muda na Fase B.
CREATE TABLE IF NOT EXISTS unidades (
  id             TEXT PRIMARY KEY,
  sigla          TEXT NOT NULL,
  nome           TEXT NOT NULL,
  tipo           TEXT,                  -- PROREITORIA|SETOR|CONSELHO|UNIDADE_ACADEMICA|DEPARTAMENTO|EXTERNO
  unidade_pai_id TEXT REFERENCES unidades(id) ON DELETE SET NULL,
  aliases        TEXT[] DEFAULT '{}',   -- grafias históricas da planilha
  interna_prpg   BOOLEAN DEFAULT FALSE, -- TRUE para Secretaria, Lato Sensu, Internacionalização, DADM
  ativo          BOOLEAN DEFAULT TRUE
);

-- eventos.unidade_id (Fase A.6) so pode ganhar FK depois que `unidades` existe.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'eventos_unidade_id_fkey') THEN
    ALTER TABLE eventos ADD CONSTRAINT eventos_unidade_id_fkey
      FOREIGN KEY (unidade_id) REFERENCES unidades(id) ON DELETE SET NULL;
  END IF;
END$$;

-- ato_series.unidade_id / atos.unidade_origem_id / atos.destinatario_unidade_id
-- (Fase A.8) so podem ganhar FK depois que `unidades` existe.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ato_series_unidade_id_fkey') THEN
    ALTER TABLE ato_series ADD CONSTRAINT ato_series_unidade_id_fkey
      FOREIGN KEY (unidade_id) REFERENCES unidades(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'atos_unidade_origem_id_fkey') THEN
    ALTER TABLE atos ADD CONSTRAINT atos_unidade_origem_id_fkey
      FOREIGN KEY (unidade_origem_id) REFERENCES unidades(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'atos_destinatario_unidade_id_fkey') THEN
    ALTER TABLE atos ADD CONSTRAINT atos_destinatario_unidade_id_fkey
      FOREIGN KEY (destinatario_unidade_id) REFERENCES unidades(id) ON DELETE SET NULL;
  END IF;
END$$;

-- Processo: o registro permanente. Chave de negócio = numero (NUP). Fase A.7
-- (G3): era `camara_processos`; o NUP é conceito da universidade, não do
-- colegiado. O binding JS (camaraProcessosRepo) só muda na Fase B.
CREATE TABLE IF NOT EXISTS processos (
  id                     TEXT PRIMARY KEY,
  numero                 TEXT NOT NULL UNIQUE,     -- 23082.XXXXXX/AAAA-DD
  numero_valido          BOOLEAN DEFAULT TRUE,     -- FALSE = fora do padrão (não bloqueia)
  link_sipac             TEXT,
  assunto                TEXT NOT NULL,
  tipo_materia           TEXT,                     -- vocabulário controlado
  interessado            TEXT,                     -- pessoa/unidade requerente (texto historico)
  interessado_pessoa_id  TEXT REFERENCES pessoas(id) ON DELETE SET NULL, -- Fase A.7: quando a pessoa é cadastrada
  programa_id            TEXT REFERENCES programas(id) ON DELETE SET NULL,
  unidade_responsavel_id TEXT REFERENCES unidades(id), -- setor da PRPG que instrui
  status                 TEXT NOT NULL DEFAULT 'RECEBIDO',
  status_motivo          TEXT,                     -- motivo de retirada/diligência/etc.
  localizacao_id         TEXT REFERENCES unidades(id),    -- derivado do último evento
  localizacao_em         DATE,                     -- data do último evento
  data_entrada           DATE,                     -- chegada à secretaria da Câmara
  data_encerramento      DATE,
  processo_pai_id        TEXT REFERENCES processos(id) ON DELETE SET NULL, -- apensamento
  sigiloso               BOOLEAN DEFAULT FALSE,    -- restringe visualização (dado sensível)
  observacoes            TEXT,                     -- campo livre que continua existindo
  obs_original           TEXT,                     -- coluna "Obs." da planilha, preservada na íntegra
  criado_em              TIMESTAMPTZ DEFAULT now(),
  atualizado_em          TIMESTAMPTZ DEFAULT now(),
  criado_por             TEXT,
  atualizado_por         TEXT
);
CREATE INDEX IF NOT EXISTS camara_proc_status_idx  ON processos(status);
CREATE INDEX IF NOT EXISTS camara_proc_prog_idx    ON processos(programa_id);

-- atos.processo_id (Fase A.8) so pode ganhar FK depois que `processos` existe.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'atos_processo_id_fkey') THEN
    ALTER TABLE atos ADD CONSTRAINT atos_processo_id_fkey
      FOREIGN KEY (processo_id) REFERENCES processos(id) ON DELETE SET NULL;
  END IF;
END$$;

-- Histórico append-only. NADA aqui é atualizado ou apagado.
CREATE TABLE IF NOT EXISTS camara_eventos (
  id            TEXT PRIMARY KEY,
  processo_id   TEXT NOT NULL REFERENCES processos(id) ON DELETE CASCADE,
  tipo          TEXT NOT NULL,  -- TRAMITACAO|STATUS|RELATORIA|PAUTA|PARECER|DELIBERACAO|ATO|NOTA|COBRANCA
  data          DATE NOT NULL,  -- data do fato (não do registro)
  unidade_id    TEXT REFERENCES unidades(id),
  descricao     TEXT,
  reuniao_id    TEXT,
  relatoria_id  TEXT,
  anexo_url     TEXT,
  criado_em     TIMESTAMPTZ DEFAULT now(),
  criado_por    TEXT
);
CREATE INDEX IF NOT EXISTS camara_ev_proc_idx ON camara_eventos(processo_id, data);

-- Reuniões da Câmara.
CREATE TABLE IF NOT EXISTS camara_reunioes (
  id            TEXT PRIMARY KEY,
  data          DATE NOT NULL,       -- 'YYYY-MM-DD'
  numero        TEXT,                -- "VIII Reunião Ordinária"
  tipo          TEXT DEFAULT 'ORDINARIA', -- ORDINARIA|EXTRAORDINARIA
  local         TEXT,
  hora          TEXT,
  status        TEXT NOT NULL DEFAULT 'RASCUNHO', -- RASCUNHO|CONVOCADA|REALIZADA|CANCELADA
  pauta_pdf_url TEXT,
  ata_url       TEXT,
  observacoes   TEXT,
  criado_em     TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now(),
  criado_por    TEXT,
  atualizado_por TEXT
);

-- Relação N:N processo ↔ reunião. Substitui a cópia entre abas.
CREATE TABLE IF NOT EXISTS camara_pauta_itens (
  id             TEXT PRIMARY KEY,
  reuniao_id     TEXT NOT NULL REFERENCES camara_reunioes(id) ON DELETE CASCADE,
  processo_id    TEXT NOT NULL REFERENCES processos(id) ON DELETE CASCADE,
  ordem          INTEGER DEFAULT 0,
  bloco          TEXT,               -- agrupamento na pauta (ex.: por setor responsável)
  deliberacao    TEXT,               -- APROVADO|APROVADO_RESSALVAS|INDEFERIDO|DILIGENCIA|RETIRADO|SOBRESTADO|ENCAMINHADO|HOMOLOGADO
  motivo_saida   TEXT,               -- vocabulário controlado, quando retirado/adiado
  registro       TEXT,               -- síntese da discussão para a ata
  criado_em      TIMESTAMPTZ DEFAULT now(),
  criado_por     TEXT,
  UNIQUE (reuniao_id, processo_id)
);

-- Designação de relatoria, com prazo e devolução. Histórico: um processo pode
-- ter várias relatorias (troca de relator ocorre nos dados reais).
CREATE TABLE IF NOT EXISTS camara_relatorias (
  id                  TEXT PRIMARY KEY,
  processo_id         TEXT NOT NULL REFERENCES processos(id) ON DELETE CASCADE,
  -- relator_id é polimórfico (users.id ou pessoas.id), como em vinculos.pessoa_id
  relator_id          TEXT,
  relator_nome        TEXT NOT NULL,   -- desnormalizado: nomes históricos sem cadastro
  programa_id         TEXT REFERENCES programas(id) ON DELETE SET NULL,
  data_designacao     DATE,
  prazo_devolucao     DATE,
  data_devolucao      DATE,
  resultado_parecer   TEXT,            -- FAVORAVEL|FAVORAVEL_RESSALVAS|DESFAVORAVEL|DILIGENCIA|ENCAMINHAMENTO
  parecer_url         TEXT,
  ativa               BOOLEAN DEFAULT TRUE,
  motivo_substituicao TEXT,
  criado_em           TIMESTAMPTZ DEFAULT now(),
  criado_por          TEXT
);
CREATE INDEX IF NOT EXISTS camara_rel_proc_idx ON camara_relatorias(processo_id);

-- Atos resultantes (resolução, decisão, portaria).
CREATE TABLE IF NOT EXISTS camara_atos (
  id            TEXT PRIMARY KEY,
  processo_id   TEXT NOT NULL REFERENCES processos(id) ON DELETE CASCADE,
  tipo          TEXT,               -- RESOLUCAO_CEPE|RESOLUCAO_CONSU|DECISAO_SEG|PORTARIA|DESPACHO
  numero        TEXT,
  ano           INTEGER,
  data          DATE,
  ementa        TEXT,
  link          TEXT,
  resolucao_id  TEXT REFERENCES resolucoes(id) ON DELETE SET NULL, -- publicação no site
  criado_em     TIMESTAMPTZ DEFAULT now(),
  criado_por    TEXT,
  atualizado_por TEXT
);

-- Seed do vocabulário de unidades/setores (não depende das decisões pendentes
-- em requisitos-camara.md §16 — cores e prazo de relatoria seguem em aberto).
-- Idempotente: ON CONFLICT (id) DO NOTHING.
INSERT INTO unidades (id, sigla, nome, aliases, interna_prpg) VALUES
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
