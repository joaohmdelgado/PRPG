-- =====================================================================
-- DOC-01 (docs/analise-prontidao-producao-2026-09-09.md): emitir() consultava
-- e depois inseria, sem trava — duas emissões simultâneas do mesmo documento
-- geravam dois códigos (dois QR codes) válidos. Passa a valer no máximo uma
-- declaração ativa (revogada_em IS NULL) por entidade e tipo.
-- Se já houver duplicata, ABORTA e lista os casos: decidir qual código vale e
-- revogar o outro (UPDATE declaracoes SET revogada_em = now(), revogada_motivo =
-- 'duplicada' WHERE codigo = ...) antes de rodar de novo. Uma transação
-- (migrateRunner); idempotente (o schema.sql já traz o índice em banco novo).
-- =====================================================================
DO $$
DECLARE dup TEXT;
BEGIN
  SELECT string_agg(format('%s/%s/%s (%s ativas)', entidade, entidade_id, tipo, n), '; ')
    INTO dup
    FROM (SELECT entidade, entidade_id, tipo, count(*) AS n FROM declaracoes
           WHERE revogada_em IS NULL GROUP BY 1, 2, 3 HAVING count(*) > 1) d;
  IF dup IS NOT NULL THEN
    RAISE EXCEPTION 'DOC-01: declarações ativas duplicadas — revogar uma de cada antes: %', dup;
  END IF;
END$$;

CREATE UNIQUE INDEX IF NOT EXISTS declaracoes_ativa_uidx
  ON declaracoes(entidade, entidade_id, tipo) WHERE revogada_em IS NULL;
