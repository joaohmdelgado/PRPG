-- =====================================================================
-- AUTH-02 ("proteção de login por conta+IP"): o limite de tentativas era só
-- por IP. login_tentativas guarda as falhas por e-mail (normalizado) para
-- bloquear a conta depois de várias falhas, de qualquer IP; vale também para
-- e-mail inexistente. Sem FK de propósito. Idempotente (o schema.sql já traz a
-- tabela em banco novo).
-- =====================================================================
CREATE TABLE IF NOT EXISTS login_tentativas (
  chave             TEXT PRIMARY KEY,
  falhas            INTEGER NOT NULL DEFAULT 0,
  primeira_falha_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  bloqueado_ate     TIMESTAMPTZ
);
