-- B.13 (G1) — pré-verificação (SOMENTE LEITURA). Rodar em cada banco antes de
-- aplicar a migração 2026-09-30_g1a_pessoa_e_vinculo_dados.sql:
--   docker exec -i prpg-postgres psql -U prpg -d prpg < docs/operations/g1-pre-verificacao.sql
-- No dev: seção 2 zerada, seção 6 = 0, seção 9 = 0 | 0, seção 10 = orfao 48 / vazio 25.
\pset pager off
\echo == 1. usuarios, pessoas e usuarios sem pessoa
SELECT (SELECT count(*) FROM users) usuarios, (SELECT count(*) FROM pessoas) pessoas,
       (SELECT count(*) FROM users WHERE pessoa_id IS NULL) usuarios_sem_pessoa;

\echo == 2. divergencia users x pessoas por campo (nao-vazio em users e diferente em pessoas)
WITH d AS (
  SELECT u.perfil_nome un, p.nome pn, regexp_replace(coalesce(u.perfil_cpf,''),'\D','','g') uc, regexp_replace(coalesce(p.cpf,''),'\D','','g') pc,
         u.perfil_siape us, p.siape ps, u.perfil_foto_url uf, p.foto_url pf,
         array_to_string(u.perfil_telefones, ', ') ut, p.telefones pt,
         u.acad_lattes ul, p.lattes pl, u.acad_orcid uo, p.orcid po,
         u.acad_google_scholar ug, p.google_scholar pg, u.acad_publons ub, p.publons pb
    FROM users u JOIN pessoas p ON p.id = u.pessoa_id)
SELECT count(*) FILTER (WHERE coalesce(un,'')<>'' AND un IS DISTINCT FROM pn) nome,
       count(*) FILTER (WHERE uc<>'' AND uc<>pc) cpf,
       count(*) FILTER (WHERE coalesce(us,'')<>'' AND us IS DISTINCT FROM ps) siape,
       count(*) FILTER (WHERE coalesce(uf,'')<>'' AND uf IS DISTINCT FROM pf) foto,
       count(*) FILTER (WHERE coalesce(ut,'')<>'' AND ut IS DISTINCT FROM pt) telefones,
       count(*) FILTER (WHERE coalesce(ul,'')<>'' AND ul IS DISTINCT FROM pl) lattes,
       count(*) FILTER (WHERE coalesce(uo,'')<>'' AND uo IS DISTINCT FROM po) orcid,
       count(*) FILTER (WHERE coalesce(ug,'')<>'' AND ug IS DISTINCT FROM pg) scholar,
       count(*) FILTER (WHERE coalesce(ub,'')<>'' AND ub IS DISTINCT FROM pb) publons
  FROM d;

\echo == 3. chaves de perfil_aluno (total / nao vazias)
SELECT k, count(*) total, count(*) FILTER (WHERE v::text NOT IN ('null','""','[]')) nao_vazias
  FROM users, jsonb_each(perfil_aluno) e(k, v) GROUP BY k ORDER BY k;
\echo == 4. chaves de perfil_professor
SELECT k, count(*) total, count(*) FILTER (WHERE v::text NOT IN ('null','""','[]')) nao_vazias
  FROM users, jsonb_each(perfil_professor) e(k, v) GROUP BY k ORDER BY k;

\echo == 5. qualificacao: valores repetidos (placeholder?)
SELECT perfil_aluno->>'qualificacao' valor, count(*) FROM users WHERE perfil_aluno->>'qualificacao' <> ''
  GROUP BY 1 HAVING count(*) > 3 ORDER BY 2 DESC;

\echo == 6. aluno sem vinculo de aluno
SELECT count(*) FROM users u WHERE u.perfil_aluno IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM vinculos v WHERE v.pessoa_id = u.pessoa_id
                     AND v.papel IN ('DISCENTE_MESTRADO','DISCENTE_DOUTORADO','DISCENTE_PROFISSIONAL','EGRESSO'));

\echo == 7. nivel x papel (aluno)
SELECT u.perfil_aluno->>'nivel' nivel, v.papel, v.ativo, count(*)
  FROM users u JOIN vinculos v ON v.pessoa_id = u.pessoa_id
 WHERE u.perfil_aluno IS NOT NULL AND v.papel IN ('DISCENTE_MESTRADO','DISCENTE_DOUTORADO','DISCENTE_PROFISSIONAL','EGRESSO')
 GROUP BY 1,2,3 ORDER BY 1,2;

\echo == 8. professor: tipo x papel do vinculo
SELECT coalesce(u.perfil_professor->>'tipo', u.perfil_professor->>'tipo_professor') tipo, v.papel, v.ativo, count(*)
  FROM users u JOIN vinculos v ON v.pessoa_id = u.pessoa_id
 WHERE u.perfil_professor IS NOT NULL AND v.papel LIKE 'DOCENTE%' GROUP BY 1,2,3 ORDER BY 1,2;

\echo == 9. professor: programas do array sem vinculo docente ativo (A) e vinculo docente ativo fora do array (B)
SELECT (SELECT count(*) FROM users u, jsonb_array_elements_text(u.perfil_professor->'programas') g(pid)
         WHERE NOT EXISTS (SELECT 1 FROM vinculos v WHERE v.pessoa_id = u.pessoa_id AND v.programa_id = g.pid
                             AND v.ativo AND v.papel LIKE 'DOCENTE%')) a_array_sem_vinculo,
       (SELECT count(*) FROM users u JOIN vinculos v ON v.pessoa_id = u.pessoa_id AND v.ativo AND v.papel LIKE 'DOCENTE%'
         WHERE u.perfil_professor IS NOT NULL AND NOT coalesce(u.perfil_professor->'programas', '[]'::jsonb) ? v.programa_id) b_vinculo_fora_do_array;

\echo == 10. orientador_id: a quem aponta
SELECT CASE WHEN coalesce(a.perfil_aluno->>'orientador_id','') = '' THEN 'vazio'
            WHEN EXISTS (SELECT 1 FROM users o WHERE o.id = a.perfil_aluno->>'orientador_id') THEN 'users.id'
            WHEN EXISTS (SELECT 1 FROM pessoas o WHERE o.id = a.perfil_aluno->>'orientador_id') THEN 'pessoas.id'
            ELSE 'orfao' END alvo, count(*)
  FROM users a WHERE a.perfil_aluno IS NOT NULL GROUP BY 1;

\echo == 11. uid_legado repetido entre usuarios (colisao de origem)
SELECT count(*) total, count(DISTINCT coalesce(perfil_aluno->>'uid_legado', perfil_professor->>'uid_legado')) distintos
  FROM users WHERE perfil_aluno IS NOT NULL OR perfil_professor IS NOT NULL;

\echo == 12. pessoas duplicadas por CPF
SELECT count(*) FROM (SELECT cpf FROM pessoas WHERE coalesce(cpf,'') <> '' GROUP BY cpf HAVING count(*) > 1) x;
