
-- =====================================================================
-- Fase H.3 (docs/revisao-portal-conteudo-2026-09-24.md): as páginas
-- institucionais da PRPG (Sobre, Histórico, Financeiro...) passam a ser
-- `pages` com `chave` fixa e sem programa. A chave de página fixa já era
-- única por programa (pages_chave_programa_uniq); entre as páginas gerais
-- (programa_id NULL) aquele índice não vale — NULLs não colidem —, então
-- este cobre o escopo geral. O conteúdo inicial é criado pela aplicação a
-- partir de server/data/paginas-institucionais.json (paginasInstitucionais.js).
-- =====================================================================
CREATE UNIQUE INDEX IF NOT EXISTS pages_chave_geral_uniq
  ON pages (chave) WHERE programa_id IS NULL AND chave IS NOT NULL;
