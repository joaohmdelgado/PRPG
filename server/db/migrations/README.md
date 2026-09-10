# Migrações versionadas

Cada alteração de schema nova deve ser um arquivo SQL imutável com prefixo
numérico, por exemplo `0001-adicionar-coluna.sql`. O executor registra o nome e
o SHA-256 em `schema_migrations`; alterar um arquivo já aplicado interrompe o
deploy. Para correções, crie outra migração forward-only.

Use `npm run db:migrate:apply` no deploy. `npm run db:migrate` continua sendo
somente o seed destrutivo de desenvolvimento e é bloqueado em produção.
