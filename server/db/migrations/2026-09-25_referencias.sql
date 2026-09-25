
-- =====================================================================
-- Fase N.5 (docs/revisao-portal-conteudo-2026-09-24.md): ligações editoriais
-- entre conteúdos ("Relacionados": edital -> resolução que o fundamenta,
-- notícia -> edital, página -> formulário...). Lista fechada de tipos, no
-- mesmo padrão já aceito para `anexos` (polimórfico sem FK, com CHECK). A
-- ligação vale nos dois sentidos: é gravada uma vez e aparece nos dois itens.
-- A aplicação apaga as ligações de um item quando ele é excluído.
-- =====================================================================
CREATE TABLE IF NOT EXISTS referencias (
  id           BIGSERIAL PRIMARY KEY,
  origem_tipo  TEXT NOT NULL CHECK (origem_tipo IN ('noticia', 'edital', 'resolucao', 'formulario', 'pagina')),
  origem_id    TEXT NOT NULL,
  destino_tipo TEXT NOT NULL CHECK (destino_tipo IN ('noticia', 'edital', 'resolucao', 'formulario', 'pagina')),
  destino_id   TEXT NOT NULL,
  tipo         TEXT NOT NULL DEFAULT 'RELACIONADO',
  ordem        INTEGER NOT NULL DEFAULT 0,
  criado_em    TIMESTAMPTZ NOT NULL DEFAULT now(),
  criado_por   TEXT,
  CHECK (NOT (origem_tipo = destino_tipo AND origem_id = destino_id)),
  UNIQUE (origem_tipo, origem_id, destino_tipo, destino_id)
);
CREATE INDEX IF NOT EXISTS idx_referencias_destino ON referencias (destino_tipo, destino_id);
