
-- =====================================================================
-- Fase H.5 (docs/revisao-portal-conteudo-2026-09-24.md): busca pública com
-- índice full-text em português, sem acento (ex.: "proficiencia" acha
-- "Proficiência"), sobre notícias, editais, páginas, resoluções,
-- formulários, programas e teses. A consulta (server/controllers/
-- buscaPublicaController.js) usa exatamente as mesmas expressões dos índices.
--
-- As funções são IMMUTABLE para poderem entrar em índice: unaccent() e
-- array_to_string() são STABLE no catálogo só porque dependem de
-- configuração (dicionário/saída de tipo), que aqui é fixa — o padrão
-- documentado do Postgres para indexar texto sem acento.
-- =====================================================================
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Texto de busca: sem tags HTML (o conteúdo vem do editor) e sem acento.
CREATE OR REPLACE FUNCTION busca_limpar(t text) RETURNS text
  LANGUAGE sql IMMUTABLE PARALLEL SAFE AS
$$ SELECT public.unaccent('public.unaccent'::regdictionary, regexp_replace(coalesce(t, ''), '<[^>]*>', ' ', 'g')) $$;

CREATE OR REPLACE FUNCTION busca_juntar(t text[]) RETURNS text
  LANGUAGE sql IMMUTABLE PARALLEL SAFE AS
$$ SELECT array_to_string(t, ' ') $$;

-- Documento com pesos: a (título) > b (resumo) > c (corpo).
CREATE OR REPLACE FUNCTION busca_tsv(a text, b text, c text) RETURNS tsvector
  LANGUAGE sql IMMUTABLE PARALLEL SAFE AS
$$ SELECT setweight(to_tsvector('portuguese'::regconfig, busca_limpar(a)), 'A')
       || setweight(to_tsvector('portuguese'::regconfig, busca_limpar(b)), 'B')
       || setweight(to_tsvector('portuguese'::regconfig, busca_limpar(c)), 'C') $$;

CREATE OR REPLACE FUNCTION busca_consulta(q text) RETURNS tsquery
  LANGUAGE sql IMMUTABLE PARALLEL SAFE AS
$$ SELECT websearch_to_tsquery('portuguese'::regconfig, busca_limpar(q)) $$;

CREATE INDEX IF NOT EXISTS idx_busca_news ON news
  USING gin (busca_tsv(title, excerpt, busca_juntar(content)));
CREATE INDEX IF NOT EXISTS idx_busca_editais ON editais
  USING gin (busca_tsv(title, numero, description));
CREATE INDEX IF NOT EXISTS idx_busca_pages ON pages
  USING gin (busca_tsv(title, body_summary, body_value));
CREATE INDEX IF NOT EXISTS idx_busca_resolucoes ON resolucoes
  USING gin (busca_tsv(title, descricao, coalesce(section_title, '') || ' ' || coalesce(category_title, '')));
CREATE INDEX IF NOT EXISTS idx_busca_formularios ON formularios
  USING gin (busca_tsv(title, descricao, coalesce(section_title, '') || ' ' || coalesce(category_title, '')));
CREATE INDEX IF NOT EXISTS idx_busca_programas ON programas
  USING gin (busca_tsv(nome || ' ' || coalesce(sigla, ''), descricao_curta,
    coalesce(grande_area, '') || ' ' || coalesce(area_conhecimento, '') || ' ' || busca_juntar(palavras_chave)));
CREATE INDEX IF NOT EXISTS idx_busca_teses ON teses_dissertacoes
  USING gin (busca_tsv(title, tipo, ''));
