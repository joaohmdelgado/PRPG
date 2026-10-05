# Comprovantes de proficiência antigos: mover para a pasta privada (PRIV-01)

## Por quê

Até 10/09/2026 o comprovante de residência e o comprovante de vínculo da inscrição de proficiência (documentos
pessoais, LGPD) eram gravados em `server/uploads`, que o servidor publica em `/uploads/<arquivo>`. Desde então o
upload da inscrição grava em `server/private-uploads` (fora do webroot) e o painel os abre só pelo download
autenticado (`GET /api/proficiencia/inscricoes/:id/comprovantes/:tipo`, Administrator/Gestor). Os antigos
continuaram em `/uploads`: **públicos** para quem tiver o endereço e, além disso, **não abrem pelo painel** (o
download autenticado só serve `/private-uploads`).

Desde 05/10/2026 a inscrição também recusa (400) comprovante cujo endereço não seja `/private-uploads/<arquivo>`.

## O que o script faz

`npm run comprovantes:privados` (`server/scripts/moverComprovantesPrivados.mjs`,
`server/services/comprovantesPrivados.js`), para cada endereço `/uploads/...` usado em
`inscricoes_proficiencia.comprovante_residencia_url`/`comprovante_vinculo_url`:

1. copia o arquivo para `server/private-uploads/` (mesmo nome; se já existir um com o nome, para nesse item:
   `conflito`);
2. numa transação, troca o endereço nas inscrições e em `arquivos` (que passa a `sigiloso = TRUE`);
3. só depois apaga o arquivo de `server/uploads` e as versões WebP em `server/uploads-derivados/`.

Simulação por padrão. Idempotente: o que já está em `/private-uploads` não entra.

## Como rodar (em cada ambiente)

Rodar **no servidor/checkout onde está o `server/uploads` de verdade** — se algum arquivo não estiver no disco, o
`--gravar` para sem mover nada (rodar de outro lugar trocaria o endereço e deixaria o PDF público, órfão).

1. Simulação — confere a lista e se cada arquivo está no disco:
   ```bash
   npm run comprovantes:privados
   ```
2. Backup do banco e de `server/uploads` (o passo 3 apaga os originais depois de copiar).
3. Mover:
   ```bash
   npm run comprovantes:privados -- --gravar
   ```
   Se a simulação disse que algum arquivo **de fato** não existe (perdido antes), só o endereço muda — confirmar com
   `-- --gravar --incluir-sem-arquivo`.
4. Conferir: a simulação de novo lista 0; no painel (Proficiência), "Comprovante" abre; o endereço antigo
   `/uploads/<arquivo>` responde 404.

Em produção, se houver CDN/proxy com cache na frente de `/uploads`, invalidar os endereços antigos.

## Situação

- Dev (05/10/2026): 2 comprovantes antigos (`prof-insc-1781892178807`, `prof-insc-1788372271136`), com os arquivos no
  `server/uploads` do checkout da raiz — rodar lá depois de integrar.
- Produção: **não verificada**.
