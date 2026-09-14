-- Paginas do microsite: slug passa a ser unico POR PROGRAMA (nao mais
-- global) e "Sobre" vira pagina fixa editavel (`chave`), criada para todo
-- programa. Substitui `programa_paginas` (secoes rich-text que nenhuma tela
-- mais exibia desde o commit 3b513d7 — o formulario de programa removeu os
-- editores inline, e a aba "Sobre" do microsite parou de le-las). Ver
-- CLAUDE.md e a conversa do usuario em 14/09/2026 (paginas "sobre-1" vs.
-- "/profiap/sobre" vazia).
--
-- Migracao idempotente para bancos JA existentes (o schema.sql ja cria a
-- tabela `pages` no formato final e nao inclui mais `programa_paginas` em
-- instalacoes novas / no banco de teste).
--
-- Aplicar com:
--   npm run db:migrate:apply
-- ou:
--   docker exec -i prpg-postgres psql -U prpg -d prpg < server/db/migrations/2026-09-14_pages_programa_scoped.sql

-- 1. Nova coluna + indices unicos por escopo (substituem o UNIQUE global de slug).
ALTER TABLE pages ADD COLUMN IF NOT EXISTS chave TEXT;

ALTER TABLE pages DROP CONSTRAINT IF EXISTS pages_slug_key;

CREATE UNIQUE INDEX IF NOT EXISTS pages_slug_geral_uniq
  ON pages (slug) WHERE programa_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS pages_slug_programa_uniq
  ON pages (programa_id, slug) WHERE programa_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS pages_chave_programa_uniq
  ON pages (programa_id, chave) WHERE chave IS NOT NULL;

-- 2. Garante a pagina fixa "Sobre" para todo programa — aproveita o conteudo
--    da antiga secao 'sobre' de programa_paginas quando existir (ex.: PGH),
--    senao cria vazia (o admin preenche depois; ver ensureFixedSobre, chamado
--    tambem em createPrograma para programas novos daqui em diante).
INSERT INTO pages (id, title, slug, chave, body_value, body_summary, programa_id, criado_por, atualizado_por)
SELECT
  'sobre-fixa-' || pr.id,
  'Sobre o Programa',
  'sobre',
  'sobre',
  pp.body_value,
  pp.body_summary,
  pr.id,
  pp.criado_por,
  pp.atualizado_por
FROM programas pr
LEFT JOIN programa_paginas pp ON pp.programa_id = pr.id AND pp.secao = 'sobre'
WHERE NOT EXISTS (
  SELECT 1 FROM pages WHERE pages.programa_id = pr.id AND pages.chave = 'sobre'
);

-- 3. Migra as demais secoes visiveis com conteudo real para paginas comuns
--    vinculadas ao programa (endereco /<programaSlug>/<secao>).
INSERT INTO pages (id, title, slug, body_value, body_summary, programa_id, criado_por, atualizado_por)
SELECT
  'pagina-' || pp.id,
  COALESCE(NULLIF(pp.titulo, ''), initcap(pp.secao)),
  pp.secao,
  pp.body_value,
  pp.body_summary,
  pp.programa_id,
  pp.criado_por,
  pp.atualizado_por
FROM programa_paginas pp
WHERE pp.secao <> 'sobre'
  AND pp.visivel = TRUE
  AND pp.body_value IS NOT NULL AND pp.body_value <> ''
  AND NOT EXISTS (
    SELECT 1 FROM pages WHERE pages.programa_id = pp.programa_id AND pages.slug = pp.secao
  );

-- 4. programa_paginas totalmente substituida por pages (programa_id + chave/slug).
DROP TABLE IF EXISTS programa_paginas;
