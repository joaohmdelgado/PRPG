-- =====================================================================
-- B.12 (docs/analise-fk-vinculos-pessoa-id-b3.md §10): a inscrição de
-- proficiência passa a apontar para a PESSOA do aluno, não para o login —
-- mesma regra de identidade da B.11. inscricoes_proficiencia.aluno_id
-- (users.id, sem FK) vira aluno_pessoa_id -> pessoas(id) ON DELETE SET NULL,
-- como declaracoes.pessoa_id: a inscrição guarda nome e CPF, e a anônima já
-- não tem aluno. Excluir o login não tira a inscrição da pessoa.
-- Aluno que já não existe (login excluído antes, sem limpeza) vira NULL — o
-- mesmo que o SET NULL faria. Uma transação (migrateRunner); idempotente.
-- =====================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
              WHERE table_schema = 'public' AND table_name = 'inscricoes_proficiencia' AND column_name = 'aluno_id') THEN
    ALTER TABLE inscricoes_proficiencia RENAME COLUMN aluno_id TO aluno_pessoa_id;
  END IF;
END$$;

UPDATE inscricoes_proficiencia i SET aluno_pessoa_id = u.pessoa_id
  FROM users u WHERE u.id = i.aluno_pessoa_id AND u.pessoa_id IS NOT NULL;

DO $$
DECLARE n INTEGER;
BEGIN
  UPDATE inscricoes_proficiencia i SET aluno_pessoa_id = NULL
   WHERE i.aluno_pessoa_id IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM pessoas p WHERE p.id = i.aluno_pessoa_id);
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n > 0 THEN
    RAISE NOTICE 'B.12: % inscrição(ões) apontavam para aluno inexistente e ficaram sem pessoa', n;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'inscricoes_proficiencia_aluno_pessoa_id_fkey') THEN
    ALTER TABLE inscricoes_proficiencia ADD CONSTRAINT inscricoes_proficiencia_aluno_pessoa_id_fkey
      FOREIGN KEY (aluno_pessoa_id) REFERENCES pessoas(id) ON DELETE SET NULL;
  END IF;
END$$;

ALTER INDEX IF EXISTS inscricoes_prof_aluno_idx RENAME TO inscricoes_prof_aluno_pessoa_idx;
CREATE INDEX IF NOT EXISTS inscricoes_prof_aluno_pessoa_idx ON inscricoes_proficiencia(aluno_pessoa_id);
