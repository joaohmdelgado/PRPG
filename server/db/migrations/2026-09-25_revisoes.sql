
-- =====================================================================
-- Fase F.7 (docs/revisao-portal-conteudo-2026-09-24.md): histórico de
-- versões leve do conteúdo publicável. Cada linha é uma versão ANTERIOR de
-- um item, gravada quando alguém salva por cima dela: `snapshot` é o item
-- como a API o devolvia, `versao_de`/`autor` dizem quando e por quem aquela
-- versão tinha sido salva. A aplicação guarda só as últimas versões de cada
-- item (server/db/revisoesRepo.js) e apaga o histórico junto com o item.
-- =====================================================================
CREATE TABLE IF NOT EXISTS revisoes (
  id          BIGSERIAL PRIMARY KEY,
  entidade    TEXT NOT NULL,          -- nome da tabela (news, editais, pages...)
  entidade_id TEXT NOT NULL,
  snapshot    JSONB NOT NULL,
  versao_de   TIMESTAMPTZ,            -- atualizado_em da versão guardada
  autor       TEXT REFERENCES users(id) ON DELETE SET NULL,  -- quem salvou aquela versão
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT now()             -- quando foi substituída
);
CREATE INDEX IF NOT EXISTS idx_revisoes_item ON revisoes (entidade, entidade_id, id DESC);
