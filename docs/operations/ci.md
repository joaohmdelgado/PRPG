# Integração contínua (CI)

Workflow: `.github/workflows/ci.yml` (além do `desempenho.yml`, que mede o Lighthouse). Roda em cada pull request,
em cada push no `main` e toda segunda-feira (a auditoria acha advisory novo mesmo sem commit).

| Job | O que roda | Comando local |
|---|---|---|
| `qualidade` | type-check, testes do front, build de produção **sem** `VITE_API_URL` (e confere que o `dist` não tem `localhost:5000`), orçamento de desempenho | `npm run lint` · `npm run test:front` · `npm run build` · `npm run perf:bundle` |
| `servidor` | suíte do servidor num PostgreSQL 16 efêmero (porta 5433, a que o `globalSetup` dos testes usa) | `npm test` (precisa de `npm run db:up`) |
| `seguranca` | varredura de segredos + auditoria de dependências de produção | `npm run ci:segredos` · `npm run ci:auditoria` |

## Varredura de segredos (`npm run ci:segredos`)

Lê os arquivos versionados e derruba o CI se achar chave privada, token do GitHub/Slack/AWS, **hash bcrypt**, a
senha padrão `Mudar123` (fora de `.md`) ou URL de banco com senha em host que não seja local. Só imprime arquivo,
linha e tipo — nunca o valor. Ocorrência intencional vai em `varredura-segredos-permissoes.json`, com **caminho,
tipo e motivo** (caminho terminando em `/` vale para a pasta). Se um segredo real for acusado: tirar do repositório
**e rotacionar** — apagar o arquivo não apaga o histórico do git.

## Auditoria de dependências (`npm run ci:auditoria`)

`npm audit --omit=dev`: derruba o CI com vulnerabilidade **alta ou crítica** sem exceção válida em
`auditoria-excecoes.json`. Cada exceção precisa de **pacote, motivo, dono e prazo** (`expira`, AAAA-MM-DD); vencida,
volta a bloquear — "aceito com motivo" não vira "esquecido". Exceção que não corresponde a nenhuma vulnerabilidade
(já corrigida) aparece como aviso para remover. O JSON completo do `npm audit` fica como artefato do run
(`auditoria-npm`).

Exceção em vigor: `nodemailer` (a correção é uma versão major; a falha só afeta quem usa vários transportes SMTP e
o e-mail está desligado até a D-C5) — reavaliar ao ligar o SMTP ou até 31/01/2027.

Quando o CI acusar uma vulnerabilidade nova: `npm audit fix --omit=dev` (só dentro das faixas do `package.json`),
rodar a suíte e commitar o `package-lock.json`; se a correção for uma versão major, avaliar e registrar a exceção.

## Limites conhecidos

- O workflow foi validado só quanto à sintaxe e aos comandos (todos rodam na máquina); **o primeiro run no GitHub
  Actions ainda não aconteceu** — a suíte roda lá em Linux e Node 22, e a máquina de desenvolvimento é Windows e
  Node 24, então um primeiro run vermelho por diferença de ambiente (maiúsculas/minúsculas em caminhos, por
  exemplo) é possível e é para ser corrigido, não ignorado.
- Falta o que o plano de prontidão ainda lista na Task 7: SBOM e licenças, análise estática (SAST), cobertura,
  teste de migração "N-1 → N" (hoje só o banco novo é testado), E2E com acessibilidade, imagem de contêiner e
  deploy. Estas ações usam versões por tag (`@v4`), não por SHA.
- Marcar os jobs como **obrigatórios** na proteção do branch `main` (Settings → Branches) é uma configuração do
  repositório no GitHub, não do código.
