-- B.11 — pré-verificação (SOMENTE LEITURA). Rodar em cada banco antes de
-- aplicar a migração 2026-09-30_b11b_fk_vinculos_pessoa.sql:
--   docker exec -i prpg-postgres psql -U prpg -d prpg < docs/operations/b11-pre-verificacao.sql
-- "orfaos" e "colisoes" precisam dar 0; se não derem, a migração aborta.
SELECT 'vinculos: total' AS item, count(*) AS n FROM vinculos
UNION ALL SELECT 'vinculos: aponta para users.id', count(*) FROM vinculos v WHERE EXISTS (SELECT 1 FROM users u WHERE u.id = v.pessoa_id)
UNION ALL SELECT 'vinculos: aponta para pessoas.id', count(*) FROM vinculos v WHERE EXISTS (SELECT 1 FROM pessoas p WHERE p.id = v.pessoa_id)
UNION ALL SELECT 'vinculos: orfaos', count(*) FROM vinculos v
  WHERE v.pessoa_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM users u WHERE u.id = v.pessoa_id)
    AND NOT EXISTS (SELECT 1 FROM pessoas p WHERE p.id = v.pessoa_id)
UNION ALL SELECT 'relatorias: total', count(*) FROM camara_relatorias
UNION ALL SELECT 'relatorias: aponta para users.id', count(*) FROM camara_relatorias r WHERE EXISTS (SELECT 1 FROM users u WHERE u.id = r.relator_id)
UNION ALL SELECT 'relatorias: orfaos', count(*) FROM camara_relatorias r
  WHERE r.relator_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM users u WHERE u.id = r.relator_id)
    AND NOT EXISTS (SELECT 1 FROM pessoas p WHERE p.id = r.relator_id)
UNION ALL SELECT 'colisoes users.id = pessoas.id', count(*) FROM users u JOIN pessoas p ON p.id = u.id
UNION ALL SELECT 'usuarios sem pessoa', count(*) FROM users WHERE pessoa_id IS NULL
UNION ALL SELECT 'mesma pessoa com vinculo pelos dois ids', count(*) FROM users u
  WHERE EXISTS (SELECT 1 FROM vinculos WHERE pessoa_id = u.id) AND EXISTS (SELECT 1 FROM vinculos WHERE pessoa_id = u.pessoa_id);

-- Números que não podem mudar com a migração (comparar antes e depois da Task 10):
SELECT programa_id, papel, count(*) AS vinculos_ativos
  FROM vinculos WHERE ativo GROUP BY 1, 2 ORDER BY 1, 2;
