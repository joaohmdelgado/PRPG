-- Schema relacional do site da PRPG/UFRPE.
-- IDs sao TEXT pois os dados existentes usam slugs/timestamps como identificadores.
--
-- Baseline consolidado (Fase A.1 do PLANO.md, 27/07/2026): este arquivo reflete o
-- estado final do banco depois de aplicadas as 11 migracoes historicas de
-- server/db/migrations/arquivo/. As migracoes ficam arquivadas para o registro;
-- este arquivo e a fonte unica para `npm run db:migrate` reconstruir do zero.
--
-- Os 8 `programa_id` sem FK e as FKs polimorficas ainda pendentes
-- (`vinculos.pessoa_id`, `camara_relatorias.relator_id`) sao dividia intencional
-- desta etapa: entram nas Fases A.2/A.10/A.11 do PLANO.md, ainda nao aplicadas.

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
  proficiencia        BOOLEAN DEFAULT FALSE, -- quando TRUE, o edital define o período de inscrição da proficiência
  proficiencia_data_prova TEXT, -- data da prova de proficiência (usada na declaração)
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
  -- resolvido na aplicação. Por isso não há FK aqui. (Fase A.10 substitui por FK real.)
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
-- NOTA: `camara_unidades` e `camara_processos` migram para `unidades` e
-- `processos` na Fase A.4/A.7 do PLANO.md — ainda não aplicado aqui.

-- Setores/unidades da UFRPE por onde os processos tramitam.
CREATE TABLE IF NOT EXISTS camara_unidades (
  id            TEXT PRIMARY KEY,
  sigla         TEXT NOT NULL,
  nome          TEXT NOT NULL,
  aliases       TEXT[] DEFAULT '{}',   -- grafias históricas da planilha
  interna_prpg  BOOLEAN DEFAULT FALSE, -- TRUE para Secretaria, Lato Sensu, Internacionalização, DADM
  ativo         BOOLEAN DEFAULT TRUE
);

-- Processo: o registro permanente. Chave de negócio = numero (NUP).
CREATE TABLE IF NOT EXISTS camara_processos (
  id                     TEXT PRIMARY KEY,
  numero                 TEXT NOT NULL UNIQUE,     -- 23082.XXXXXX/AAAA-DD
  numero_valido          BOOLEAN DEFAULT TRUE,     -- FALSE = fora do padrão (não bloqueia)
  link_sipac             TEXT,
  assunto                TEXT NOT NULL,
  tipo_materia           TEXT,                     -- vocabulário controlado
  interessado            TEXT,                     -- pessoa/unidade requerente
  programa_id            TEXT REFERENCES programas(id) ON DELETE SET NULL,
  unidade_responsavel_id TEXT REFERENCES camara_unidades(id), -- setor da PRPG que instrui
  status                 TEXT NOT NULL DEFAULT 'RECEBIDO',
  status_motivo          TEXT,                     -- motivo de retirada/diligência/etc.
  localizacao_id         TEXT REFERENCES camara_unidades(id),    -- derivado do último evento
  localizacao_em         TEXT,                     -- data do último evento
  data_entrada           TEXT,                     -- chegada à secretaria da Câmara
  data_encerramento      TEXT,
  processo_pai_id        TEXT REFERENCES camara_processos(id) ON DELETE SET NULL, -- apensamento
  sigiloso               BOOLEAN DEFAULT FALSE,    -- restringe visualização (dado sensível)
  observacoes            TEXT,                     -- campo livre que continua existindo
  obs_original           TEXT,                     -- coluna "Obs." da planilha, preservada na íntegra
  criado_em              TIMESTAMPTZ DEFAULT now(),
  atualizado_em          TIMESTAMPTZ DEFAULT now(),
  criado_por             TEXT,
  atualizado_por         TEXT
);
CREATE INDEX IF NOT EXISTS camara_proc_status_idx  ON camara_processos(status);
CREATE INDEX IF NOT EXISTS camara_proc_prog_idx    ON camara_processos(programa_id);

-- Histórico append-only. NADA aqui é atualizado ou apagado.
CREATE TABLE IF NOT EXISTS camara_eventos (
  id            TEXT PRIMARY KEY,
  processo_id   TEXT NOT NULL REFERENCES camara_processos(id) ON DELETE CASCADE,
  tipo          TEXT NOT NULL,  -- TRAMITACAO|STATUS|RELATORIA|PAUTA|PARECER|DELIBERACAO|ATO|NOTA|COBRANCA
  data          TEXT NOT NULL,  -- data do fato (não do registro)
  unidade_id    TEXT REFERENCES camara_unidades(id),
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
  data          TEXT NOT NULL,       -- 'YYYY-MM-DD'
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
  processo_id    TEXT NOT NULL REFERENCES camara_processos(id) ON DELETE CASCADE,
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
  processo_id         TEXT NOT NULL REFERENCES camara_processos(id) ON DELETE CASCADE,
  -- relator_id é polimórfico (users.id ou pessoas.id), como em vinculos.pessoa_id
  relator_id          TEXT,
  relator_nome        TEXT NOT NULL,   -- desnormalizado: nomes históricos sem cadastro
  programa_id         TEXT REFERENCES programas(id) ON DELETE SET NULL,
  data_designacao     TEXT,
  prazo_devolucao     TEXT,
  data_devolucao      TEXT,
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
  processo_id   TEXT NOT NULL REFERENCES camara_processos(id) ON DELETE CASCADE,
  tipo          TEXT,               -- RESOLUCAO_CEPE|RESOLUCAO_CONSU|DECISAO_SEG|PORTARIA|DESPACHO
  numero        TEXT,
  ano           INTEGER,
  data          TEXT,
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
