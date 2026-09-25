-- =====================================================================
-- Fase S.3 (docs/revisao-portal-conteudo-2026-09-24.md): cada programa pode
-- ocultar, reordenar, renomear e mudar de grupo os itens do menu do seu
-- microsite. O modelo do menu fica no código (server/utils/micrositeMenu.js);
-- aqui só as diferenças. Sem linha = tudo no padrão.
-- chave: chave do modelo ('docentes', 'programa', 'noticias'...) ou
-- 'pagina:<pages.id>' para uma página criada pelo programa.
-- =====================================================================
CREATE TABLE IF NOT EXISTS programa_menu_itens (
  programa_id    TEXT NOT NULL REFERENCES programas(id) ON DELETE CASCADE,
  chave          TEXT NOT NULL,
  rotulo         TEXT,              -- NULL = nome padrão
  grupo          TEXT,              -- só itens de submenu; NULL = grupo padrão
  ordem          INTEGER,           -- posição dentro do grupo (ou no topo); NULL = padrão
  oculto         BOOLEAN NOT NULL DEFAULT FALSE,
  atualizado_em  TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_por TEXT,
  PRIMARY KEY (programa_id, chave)
);
