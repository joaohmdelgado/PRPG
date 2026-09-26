-- =====================================================================
-- Fase O.4 (docs/revisao-portal-conteudo-2026-09-24.md): critério explícito
-- para aposentar cada planilha. Situação: EM_USO (a planilha ainda é a fonte)
-- -> PARALELO (registra-se nos dois, por um ciclo) -> SOMENTE_LEITURA (o
-- sistema é a fonte; a planilha é trancada e arquivada, nunca apagada).
-- A avaliação do critério fica em server/services/planilhas/aposentadoria.js;
-- ver docs/aposentadoria-planilhas.md.
-- =====================================================================
CREATE TABLE IF NOT EXISTS planilhas (
  fonte                  TEXT PRIMARY KEY,   -- contatos|expedientes|camara|pnpd
  nome                   TEXT NOT NULL,
  ciclo_dias             INTEGER NOT NULL DEFAULT 30,
  situacao               TEXT NOT NULL DEFAULT 'EM_USO', -- EM_USO|PARALELO|SOMENTE_LEITURA
  paralelo_desde         DATE,
  somente_leitura_desde  DATE,
  observacao             TEXT,
  atualizado_em          TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_por         TEXT REFERENCES users(id) ON DELETE SET NULL
);

INSERT INTO planilhas (fonte, nome, ciclo_dias) VALUES
  ('contatos', 'Contatos - Coordenações de PG.xlsx', 30),
  ('expedientes', 'OFÍCIOS_EDITAIS_PORTARIAS_PRPG.xlsx', 30),
  ('camara', 'Processos - Câmara de Pós Graduação.xlsx', 30),
  ('pnpd', 'PNPD Voluntário.xlsx', 30)
ON CONFLICT (fonte) DO NOTHING;
