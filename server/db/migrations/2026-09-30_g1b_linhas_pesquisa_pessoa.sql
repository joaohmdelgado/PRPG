-- =====================================================================
-- B.13 / G1 (docs/analise-g1-users-credencial.md §3.8, D7): as linhas de pesquisa
-- são da PESSOA, não do login. user_linhas_pesquisa troca user_id (-> users) por
-- pessoa_id (-> pessoas, ON DELETE CASCADE); o nome da tabela fica.
-- Idempotente: só converte se a coluna user_id ainda existir (banco criado do
-- schema.sql novo já nasce com pessoa_id). O runner a envolve numa transação.
-- =====================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
              WHERE table_schema = 'public' AND table_name = 'user_linhas_pesquisa' AND column_name = 'user_id') THEN
    ALTER TABLE user_linhas_pesquisa ADD COLUMN IF NOT EXISTS pessoa_id TEXT;
    UPDATE user_linhas_pesquisa ul SET pessoa_id = u.pessoa_id FROM users u WHERE u.id = ul.user_id;
    -- Login sem pessoa: não existe depois da migração A da B.11; se houver, a linha não tem dono.
    DELETE FROM user_linhas_pesquisa WHERE pessoa_id IS NULL;
    ALTER TABLE user_linhas_pesquisa DROP CONSTRAINT IF EXISTS user_linhas_pesquisa_pkey;
    -- DROP COLUMN derruba junto a FK para users (user_linhas_pesquisa_user_id_fkey).
    ALTER TABLE user_linhas_pesquisa DROP COLUMN user_id;
    ALTER TABLE user_linhas_pesquisa ALTER COLUMN pessoa_id SET NOT NULL;
    ALTER TABLE user_linhas_pesquisa ALTER COLUMN linha_id SET NOT NULL;
    ALTER TABLE user_linhas_pesquisa ADD PRIMARY KEY (pessoa_id, linha_id);
    ALTER TABLE user_linhas_pesquisa ADD CONSTRAINT user_linhas_pesquisa_pessoa_id_fkey
      FOREIGN KEY (pessoa_id) REFERENCES pessoas(id) ON DELETE CASCADE;
  END IF;
END$$;
