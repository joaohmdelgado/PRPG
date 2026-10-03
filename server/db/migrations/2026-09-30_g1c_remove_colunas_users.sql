-- =====================================================================
-- B.13 / G1 (docs/analise-g1-users-credencial.md): remove de users a cópia legada dos dados da
-- pessoa (a fonte é `pessoas` e `vinculos.dados` desde as migrações g1a/g1b e o código da G1).
-- FORWARD-ONLY: tire backup antes. users.pessoa_id passa a NOT NULL.
-- Aborta inteira (o runner a envolve numa transação) se algum login não tiver pessoa.
-- Idempotente. É o BASELINE_ATE do migrateRunner: um banco criado do schema.sql
-- já nasce assim e a registra sem rodar.
-- =====================================================================
DO $$
DECLARE n INT;
BEGIN
  SELECT count(*) INTO n FROM users WHERE pessoa_id IS NULL;
  IF n > 0 THEN RAISE EXCEPTION 'G1: % usuário(s) sem pessoa_id — rode a migração b11a antes', n; END IF;
END$$;

ALTER TABLE users ALTER COLUMN pessoa_id SET NOT NULL;
ALTER TABLE users
  DROP COLUMN IF EXISTS priv_mostrar_email,
  DROP COLUMN IF EXISTS priv_mostrar_telefone,
  DROP COLUMN IF EXISTS perfil_nome,
  DROP COLUMN IF EXISTS perfil_cpf,
  DROP COLUMN IF EXISTS perfil_siape,
  DROP COLUMN IF EXISTS perfil_foto_url,
  DROP COLUMN IF EXISTS perfil_telefones,
  DROP COLUMN IF EXISTS acad_lattes,
  DROP COLUMN IF EXISTS acad_orcid,
  DROP COLUMN IF EXISTS acad_google_scholar,
  DROP COLUMN IF EXISTS acad_publons,
  DROP COLUMN IF EXISTS perfil_aluno,
  DROP COLUMN IF EXISTS perfil_professor;
