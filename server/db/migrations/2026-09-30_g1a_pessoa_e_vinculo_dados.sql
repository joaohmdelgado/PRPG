-- =====================================================================
-- B.13 / G1 (docs/analise-g1-users-credencial.md): estrutura que recebe o que hoje
-- mora em users.perfil_*. Aditiva e idempotente; nada lê o novo ainda.
-- Até aqui só users era editável pelo painel e pelo /minha-conta: o valor do
-- usuário vence quando está preenchido.
-- =====================================================================
ALTER TABLE vinculos ADD COLUMN IF NOT EXISTS dados JSONB;
ALTER TABLE pessoas ADD COLUMN IF NOT EXISTS priv_mostrar_email BOOLEAN DEFAULT FALSE;
ALTER TABLE pessoas ADD COLUMN IF NOT EXISTS priv_mostrar_telefone BOOLEAN DEFAULT FALSE;

UPDATE pessoas p SET
  priv_mostrar_email    = COALESCE(u.priv_mostrar_email, FALSE),
  priv_mostrar_telefone = COALESCE(u.priv_mostrar_telefone, FALSE)
  FROM users u WHERE u.pessoa_id = p.id;

UPDATE pessoas p SET
  sexo          = COALESCE(NULLIF(COALESCE(u.perfil_aluno, u.perfil_professor) ->> 'sexo', ''), p.sexo),
  nacionalidade = COALESCE(NULLIF(COALESCE(u.perfil_aluno, u.perfil_professor) ->> 'nacionalidade', ''), p.nacionalidade),
  estrangeiro   = CASE WHEN COALESCE(u.perfil_aluno, u.perfil_professor) ->> 'estrangeiro' IS NULL THEN p.estrangeiro
                       ELSE COALESCE(u.perfil_aluno, u.perfil_professor) ->> 'estrangeiro' = 'true' END
  FROM users u
 WHERE u.pessoa_id = p.id AND (u.perfil_aluno IS NOT NULL OR u.perfil_professor IS NOT NULL);

-- Aluno: todo vínculo de aluno da pessoa ganha os dados do perfil. `nivel` só para
-- egresso (o papel EGRESSO não diz se foi mestrado ou doutorado). A data de
-- qualificação 2020-10-29 é placeholder da importação (69 de 73 no dev): não entra.
-- orientador_id guarda o users.id do professor: vira a pessoa dele; o texto cru só
-- fica (orientador_legado) quando não resolve.
UPDATE vinculos v SET dados = COALESCE(v.dados, '{}'::jsonb) || jsonb_strip_nulls(jsonb_build_object(
    'nivel', CASE WHEN v.papel = 'EGRESSO' THEN
               CASE WHEN lower(u.perfil_aluno ->> 'nivel') LIKE 'dout%' THEN 'DOUTORADO'
                    WHEN lower(u.perfil_aluno ->> 'nivel') LIKE 'mestr%' THEN 'MESTRADO' END END,
    'entrada', NULLIF(u.perfil_aluno ->> 'entrada', ''),
    'situacao', NULLIF(u.perfil_aluno ->> 'situacao', ''),
    'qualificacao', NULLIF(NULLIF(u.perfil_aluno ->> 'qualificacao', ''), '2020-10-29'),
    'defesa', NULLIF(u.perfil_aluno ->> 'defesa', ''),
    'egresso', CASE WHEN u.perfil_aluno ? 'egresso' THEN (u.perfil_aluno ->> 'egresso') = 'true' END,
    'orientador_pessoa_id', o.pessoa_id,
    'orientador_legado', CASE WHEN o.pessoa_id IS NULL THEN NULLIF(u.perfil_aluno ->> 'orientador_id', '') END,
    'uid_legado', NULLIF(u.perfil_aluno ->> 'uid_legado', ''),
    'origem_import', NULLIF(u.perfil_aluno ->> 'origem_import', '')))
  FROM users u LEFT JOIN users o ON o.id = u.perfil_aluno ->> 'orientador_id'
 WHERE u.pessoa_id = v.pessoa_id AND u.perfil_aluno IS NOT NULL
   AND v.papel IN ('DISCENTE_MESTRADO', 'DISCENTE_DOUTORADO', 'DISCENTE_PROFISSIONAL', 'EGRESSO');

-- Docente: o tipo já é o papel; o array de programas já é o conjunto de vínculos.
UPDATE vinculos v SET dados = COALESCE(v.dados, '{}'::jsonb) || jsonb_strip_nulls(jsonb_build_object(
    'uid_legado', NULLIF(u.perfil_professor ->> 'uid_legado', ''),
    'origem_import', NULLIF(u.perfil_professor ->> 'origem_import', '')))
  FROM users u
 WHERE u.pessoa_id = v.pessoa_id AND u.perfil_professor IS NOT NULL
   AND v.papel IN ('DOCENTE_PERMANENTE', 'DOCENTE_COLABORADOR', 'DOCENTE_VISITANTE');

-- Só avisa (não corrige): divergência entre o array de programas e os vínculos.
-- (`programas` que não seja array conta como vazio, para não derrubar a migração.)
DO $$
DECLARE n INT;
BEGIN
  SELECT count(*) INTO n
    FROM users u,
         jsonb_array_elements_text(CASE WHEN jsonb_typeof(u.perfil_professor -> 'programas') = 'array'
                                        THEN u.perfil_professor -> 'programas' ELSE '[]'::jsonb END) g(pid)
   WHERE NOT EXISTS (SELECT 1 FROM vinculos v WHERE v.pessoa_id = u.pessoa_id AND v.programa_id = g.pid
                       AND v.ativo AND v.papel LIKE 'DOCENTE%');
  IF n > 0 THEN RAISE NOTICE 'G1: % programa(s) em perfil_professor.programas sem vínculo docente ativo (a API passa a mostrar só os vínculos)', n; END IF;
END$$;
