-- =====================================================================
-- AUTH-01 (docs/analise-prontidao-producao-2026-09-09.md): trocar a senha
-- encerra as outras sessões da conta. users.sessao_versao vai no token (`sv`)
-- e o `protect` compara com a coluna; a troca de senha incrementa.
-- Todas as contas começam em 0, e token sem `sv` conta como 0: o deploy não
-- derruba ninguém. Idempotente (o schema.sql já traz a coluna em banco novo).
-- =====================================================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS sessao_versao INTEGER NOT NULL DEFAULT 0;
