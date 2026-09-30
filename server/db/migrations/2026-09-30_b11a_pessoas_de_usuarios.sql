-- =====================================================================
-- B.11 / D-B11b (docs/analise-fk-vinculos-pessoa-id-b3.md): `pessoas` passa a
-- ser a fonte dos dados da pessoa (usersRepo propaga as edições desde este
-- deploy — server/db/pessoaDoUsuario.js). Esta migração deixa o ponto de
-- partida certo:
--   1. todo usuário ganha uma `pessoas` (mesmo mapeamento de
--      server/db/backfill-pessoas.mjs);
--   2. reconciliação: até aqui só `users` era editável pelo painel e pelo
--      /minha-conta, então o valor do usuário vence — menos a foto, que a
--      tela de Estrutura grava só em `pessoas` (lá só se preenche o vazio).
-- CPF fica de fora: exige recalcular cpf_valido; a sincronização faz isso na
-- próxima edição. Idempotente.
-- =====================================================================
CREATE TEMP TABLE b11_novas ON COMMIT DROP AS
  SELECT id AS user_id, gen_random_uuid()::text AS pessoa_id FROM users WHERE pessoa_id IS NULL;

INSERT INTO pessoas (id, nome, cpf, siape, sexo, nacionalidade, estrangeiro, foto_url, telefones,
                     lattes, orcid, google_scholar, publons)
SELECT n.pessoa_id,
       NULLIF(u.perfil_nome, ''), NULLIF(u.perfil_cpf, ''), NULLIF(u.perfil_siape, ''),
       NULLIF(COALESCE(u.perfil_aluno, u.perfil_professor) ->> 'sexo', ''),
       NULLIF(COALESCE(u.perfil_aluno, u.perfil_professor) ->> 'nacionalidade', ''),
       COALESCE(COALESCE(u.perfil_aluno, u.perfil_professor) ->> 'estrangeiro', '') = 'true',
       NULLIF(u.perfil_foto_url, ''), NULLIF(array_to_string(u.perfil_telefones, ', '), ''),
       NULLIF(u.acad_lattes, ''), NULLIF(u.acad_orcid, ''),
       NULLIF(u.acad_google_scholar, ''), NULLIF(u.acad_publons, '')
  FROM b11_novas n JOIN users u ON u.id = n.user_id;

UPDATE users u SET pessoa_id = n.pessoa_id FROM b11_novas n WHERE u.id = n.user_id;

UPDATE pessoas p SET
  nome           = COALESCE(NULLIF(u.perfil_nome, ''), p.nome),
  siape          = COALESCE(NULLIF(u.perfil_siape, ''), p.siape),
  telefones      = COALESCE(NULLIF(array_to_string(u.perfil_telefones, ', '), ''), p.telefones),
  lattes         = COALESCE(NULLIF(u.acad_lattes, ''), p.lattes),
  orcid          = COALESCE(NULLIF(u.acad_orcid, ''), p.orcid),
  google_scholar = COALESCE(NULLIF(u.acad_google_scholar, ''), p.google_scholar),
  publons        = COALESCE(NULLIF(u.acad_publons, ''), p.publons),
  foto_url       = COALESCE(NULLIF(p.foto_url, ''), NULLIF(u.perfil_foto_url, ''))
  FROM users u
 WHERE u.pessoa_id = p.id;
