-- =====================================================================
-- Fase O.2 (docs/revisao-portal-conteudo-2026-09-24.md): importar fielmente
-- e revisar depois. As planilhas entram como estão; o que depende de uma
-- decisão ainda sem resposta (PLANO.md §4) vira pendência de revisão, com a
-- decisão que a responde. Ver server/services/planilhas/.
-- =====================================================================

-- Uma execução de importador (simulação ou gravação). A simulação roda a
-- importação inteira numa transação desfeita no fim: o relatório é exatamente
-- o que a gravação faria. O arquivo original fica guardado, imutável.
CREATE TABLE IF NOT EXISTS importacoes (
  id              TEXT PRIMARY KEY,
  fonte           TEXT NOT NULL,          -- contatos|expedientes|camara|pnpd
  simulacao       BOOLEAN NOT NULL,
  arquivo_nome    TEXT,
  arquivo_sha256  TEXT,
  arquivo_caminho TEXT,                   -- cópia em server/private-uploads/importacoes/
  resumo          JSONB NOT NULL DEFAULT '{}',
  relatorio       JSONB NOT NULL DEFAULT '[]',
  erro            TEXT,
  executado_em    TIMESTAMPTZ NOT NULL DEFAULT now(),
  executado_por   TEXT REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS importacoes_fonte_idx ON importacoes (fonte, executado_em DESC);

-- Origem de cada registro importado, pela chave natural (NUP; série:ano:número;
-- CPF+período; programa+papel). É o que torna a reexecução segura: chave já
-- vista não é criada de novo, e o hash diz se a linha mudou na planilha
-- depois da importação (divergência — critério de aposentadoria, O.4).
CREATE TABLE IF NOT EXISTS importacao_origens (
  fonte         TEXT NOT NULL,
  chave         TEXT NOT NULL,
  entidade      TEXT NOT NULL,
  entidade_id   TEXT NOT NULL,
  hash          TEXT NOT NULL,            -- sha256 da linha de origem normalizada
  dados         JSONB NOT NULL DEFAULT '{}', -- a linha como veio: aba, linha, colunas
  importacao_id TEXT REFERENCES importacoes(id) ON DELETE SET NULL,
  importado_em  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (fonte, chave)
);
CREATE INDEX IF NOT EXISTS importacao_origens_entidade_idx ON importacao_origens (entidade, entidade_id);

-- O que precisa de interpretação humana. `chave` identifica a origem (a
-- chave natural do registro, ou 'valor:<grafia>' quando a pendência é de uma
-- grafia que se repete em vários registros — um de-para). `decisao` é o ID do
-- PLANO.md §4 que responde a pendência, quando houver. Reimportar não reabre
-- pendência resolvida.
CREATE TABLE IF NOT EXISTS importacao_pendencias (
  id             TEXT PRIMARY KEY,
  fonte          TEXT NOT NULL,
  chave          TEXT NOT NULL,
  tipo           TEXT NOT NULL,           -- catálogo em server/services/planilhas/pendencias.js
  campo          TEXT NOT NULL DEFAULT '',
  entidade       TEXT,
  entidade_id    TEXT,
  valor_original TEXT,
  sugestao       JSONB,
  decisao        TEXT,
  mensagem       TEXT,
  situacao       TEXT NOT NULL DEFAULT 'ABERTA', -- ABERTA|RESOLVIDA|DESCARTADA
  resolucao      JSONB,
  resolvido_em   TIMESTAMPTZ,
  resolvido_por  TEXT REFERENCES users(id) ON DELETE SET NULL,
  importacao_id  TEXT REFERENCES importacoes(id) ON DELETE SET NULL,
  criado_em      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (fonte, chave, tipo, campo)
);
CREATE INDEX IF NOT EXISTS importacao_pendencias_situacao_idx ON importacao_pendencias (fonte, situacao, tipo);
CREATE INDEX IF NOT EXISTS importacao_pendencias_entidade_idx ON importacao_pendencias (entidade, entidade_id);

-- De-para definido na revisão ("ECOLOGIA" -> programa X, cor #B6D7A8 ->
-- situação Y). A próxima importação já usa a resposta.
CREATE TABLE IF NOT EXISTS importacao_depara (
  fonte        TEXT NOT NULL,
  dominio      TEXT NOT NULL,             -- programa|unidade|cor|pessoa|papel
  valor        TEXT NOT NULL,             -- grafia normalizada da planilha
  destino      TEXT NOT NULL,
  definido_em  TIMESTAMPTZ NOT NULL DEFAULT now(),
  definido_por TEXT REFERENCES users(id) ON DELETE SET NULL,
  PRIMARY KEY (fonte, dominio, valor)
);

-- Número de processo como veio da planilha do PNPD (NUP, formato curto pré-SEI
-- ou vazio) — pos_doutorados só tinha processo_id, e o estágio não deve criar
-- processo na fila da Câmara só para guardar o texto.
ALTER TABLE pos_doutorados ADD COLUMN IF NOT EXISTS processo_original TEXT;

-- Situação neutra do processo importado cuja situação real depende da cor da
-- linha (D-B1): nem trabalho novo (RECEBIDO), nem resolvido.
INSERT INTO vocabularios (dominio, valor, rotulo, cor, ordem) VALUES
  ('processo.situacao', 'A_CLASSIFICAR', 'A classificar (importado)', 'bg-yellow-100 text-yellow-800', 21)
ON CONFLICT (dominio, valor, COALESCE(programa_id, '')) DO NOTHING;
