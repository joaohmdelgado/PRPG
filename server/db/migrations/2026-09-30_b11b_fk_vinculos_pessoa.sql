-- =====================================================================
-- B.11 (docs/analise-fk-vinculos-pessoa-id-b3.md): vinculos.pessoa_id e
-- camara_relatorias.relator_id passam a apontar só para pessoas(id), com FK
-- ON DELETE RESTRICT (D-B11a: nada apaga `pessoas`; uma futura mescla de
-- duplicadas terá de repontar os vínculos antes). Pré-requisito: migração
-- 2026-09-30_b11a (todo usuário tem pessoa) e o código da Task 9 no ar.
-- Uma transação (migrateRunner): se sobrar id que não é de ninguém, aborta
-- inteira e nada muda — a mensagem lista os ids (até 50).
-- Pré-verificação: docs/operations/b11-pre-verificacao.sql.
-- =====================================================================
UPDATE vinculos v SET pessoa_id = u.pessoa_id
  FROM users u WHERE u.id = v.pessoa_id AND u.pessoa_id IS NOT NULL;
UPDATE camara_relatorias r SET relator_id = u.pessoa_id
  FROM users u WHERE u.id = r.relator_id AND u.pessoa_id IS NOT NULL;

DO $$
DECLARE orfaos TEXT;
BEGIN
  SELECT string_agg(x.descr, '; ') INTO orfaos FROM (
    SELECT format('vinculos %s -> %s', v.id, v.pessoa_id) AS descr FROM vinculos v
     WHERE v.pessoa_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pessoas p WHERE p.id = v.pessoa_id)
    UNION ALL
    SELECT format('camara_relatorias %s -> %s', r.id, r.relator_id) FROM camara_relatorias r
     WHERE r.relator_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pessoas p WHERE p.id = r.relator_id)
    LIMIT 50
  ) x;
  IF orfaos IS NOT NULL THEN
    RAISE EXCEPTION 'B.11: ids que não são pessoa nem usuário (corrija ou apague antes): %', orfaos;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'vinculos_pessoa_id_fkey') THEN
    ALTER TABLE vinculos ADD CONSTRAINT vinculos_pessoa_id_fkey
      FOREIGN KEY (pessoa_id) REFERENCES pessoas(id) ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'camara_relatorias_relator_id_fkey') THEN
    ALTER TABLE camara_relatorias ADD CONSTRAINT camara_relatorias_relator_id_fkey
      FOREIGN KEY (relator_id) REFERENCES pessoas(id) ON DELETE RESTRICT;
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS vinculos_pessoa_idx ON vinculos(pessoa_id);
CREATE INDEX IF NOT EXISTS camara_rel_relator_idx ON camara_relatorias(relator_id);
