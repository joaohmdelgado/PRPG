# Análise de prontidão para produção — PRPG/UFRPE

**Data da análise:** 9 de setembro de 2026
**Escopo:** frontend público, painel administrativo, API, autenticação/autorização, PostgreSQL, uploads, documentos, dependências, acessibilidade, SEO, performance, testes, entrega e operação.
**Método:** inspeção estática do repositório, build/typecheck, auditoria de dependências, inspeção visual local e revisão cruzada por especialistas em AppSec/backend/dados, frontend/UX/acessibilidade/SEO e QA/DevOps/SRE.
**Limite:** a suíte integrada não foi executada porque o Docker/PostgreSQL local não estava disponível. Não houve pentest, Lighthouse/RUM, teste de carga nem inspeção da infraestrutura ou do banco reais.

## Parecer executivo

**Decisão atual: NO-GO para produção pública.**

O produto tem uma base funcional promissora — build e typecheck passam, há 203 testes de backend, persistência relacional, sanitização de HTML e separação razoável de camadas —, mas cinco riscos impedem um lançamento responsável:

1. autorização de escrita falha de forma permissiva para usuários autenticados comuns;
2. uma credencial administrativa conhecida é mantida em seed e pode ser reinserida pela migração;
3. comprovantes pessoais ficam no mesmo diretório publicado anonimamente em `/uploads`;
4. o comando documentado como migração recria os dados com `TRUNCATE`, sem histórico de versões nem restauração comprovada;
5. há vulnerabilidades altas em dependências de runtime, inclusive no pipeline público de upload.

Também faltam condições básicas de operação: CI/CD, artefato de produção, staging, rollback, backup testado, readiness real, encerramento gracioso, logs correlacionáveis e monitoramento. No frontend, a home contém conteúdo mockado e ações sem função, há falhas sistêmicas de WCAG, o admin não é responsivo e o build pode apontar silenciosamente para `localhost`.

Uma liberação aceitável deve começar como **piloto controlado**, somente após todos os P0 e os gates mínimos de dados, entrega, acessibilidade e observabilidade serem aprovados.

## Especialistas e consenso

| Perspectiva | Foco da revisão | Conclusão |
|---|---|---|
| AppSec, backend e dados | RBAC, sessão/JWT, uploads, integridade, documentos e banco | NO-GO por autorização fail-open, seed conhecido e exposição de dados pessoais |
| Frontend, UX, acessibilidade, SEO e performance | experiência pública/admin, teclado, leitor de tela, conteúdo, indexação e bundle | NO-GO geral; não há P0 exclusivamente visual, mas há P1 sistêmicos |
| QA, DevOps e SRE | testes, migração, backup, release, observabilidade e rollback | NO-GO por ausência de cadeia segura e recuperável de produção |

### Decisões da revisão cruzada

- Comprovantes públicos são P0 para lançamento, mesmo que a correção técnica possa ser isolada, porque a exposição seria irreversível.
- A conta seed é P0 até uma consulta ao banco-alvo provar que ela não existe, que a senha foi rotacionada e que tokens antigos foram invalidados.
- Responsividade do admin pode ser adiada apenas em piloto interno formalmente restrito a desktop. Para disponibilidade geral, é obrigatória.
- SSR completo e polimento estético não bloqueiam o piloto. Metadados por rota, indexabilidade básica, links funcionais, erro/retry e Web Vitals mínimos bloqueiam.
- O agendador pode ser adiado somente se notificações automáticas forem desligadas na interface e declaradas fora do escopo da versão.
- `xlsx` é usado predominantemente para exportação, reduzindo a explorabilidade das falhas de parsing, mas deve ser substituído por não ter correção no pacote atual.
- Tracing distribuído completo pode vir depois; readiness, logs estruturados, alertas básicos e graceful shutdown são pré-requisitos.

## Evidências de validação

- `npm run lint` passou. O script é apenas `tsc --noEmit`; não há ESLint efetivo.
- `npm run build` passou com Vite 8.0.16.
- Bundle base: aproximadamente 279,7 kB de JS, 86,3 kB gzip; CSS 92,0 kB, 15,3 kB gzip.
- Chunk `ProgramasStrictoSensu`: aproximadamente 295,5 kB, 97,8 kB gzip, causado pelo import estático de `xlsx`.
- Foram contados 203 casos de teste em 19 arquivos; a documentação ainda menciona cerca de 41.
- Os testes integrados não rodaram porque o daemon Docker estava inativo e o PostgreSQL de testes não estava disponível.
- `npm audit --omit=dev`: 13 avisos, 8 high e 5 moderate.
- `npm audit` completo: 19 avisos, 11 high e 8 moderate.
- A branch local `main` está 57 commits à frente de `origin/main`, num lote grande ainda sem pipeline/revisão remota formal.
- Não há workflow de CI, Dockerfile da aplicação, manifesto de deploy ou configuração de reverse proxy no repositório.
- A inspeção visual local confirmou boa hierarquia geral, mas também menu móvel excessivamente longo, botões de ícone sem nome, formulários sem labels associados, CTAs mortos e erros de API apresentados como coleção vazia.

## Registro priorizado de riscos

### P0 — bloqueiam qualquer produção pública

| ID | Problema e evidência | Impacto | Solução recomendada | Critério de aceite |
|---|---|---|---|---|
| SEC-01 | Rotas de escrita usam `protect` combinado com middlewares que só restringem `GestorPrograma`; usuários `Aluno`/`Professor` passam pelo caminho permissivo. Evidências em `server/routes/adminRoutes.js` e `server/middleware/authMiddleware.js`. | Alteração ou exclusão de conteúdo institucional por usuário sem privilégio. | Política central deny-by-default, matriz permissão × recurso × ação × escopo e consulta do usuário atual no banco. | Matriz automatizada comprova 401 anônimo, 403 sem permissão, escopo de programa isolado e sucesso apenas para papéis autorizados. |
| SEC-02 | `server/scripts/seedAdmin.js` contém senha administrativa conhecida; `server/data/users.json` contém hash correspondente e `server/db/migrate.mjs` reinsere usuários seed. | Comprometimento total do painel e dos dados. | Remover credencial compartilhada; bootstrap único via segredo/convite/SSO; rotacionar conta e JWT; invalidar sessões. | Scanner não encontra senha/hash default; login antigo falha; inventário do banco prova contas válidas e tokens antigos são rejeitados. |
| PRIV-01 | `server/app.js` publica todo `/uploads`; o fluxo de proficiência recebe comprovante anônimo e `AdminProficiencia.jsx` abre URL direta sem autorização. | Exposição de endereço, vínculo e outros dados pessoais; risco LGPD. | Separar storage público/privado, IDs opacos, download autenticado ou URL assinada curta, magic bytes, antimalware, retenção e auditoria. | Anônimo e usuário fora do escopo recebem 401/403/404; arquivos alheios não são acessíveis; teste malicioso é bloqueado; restore inclui binários. |
| DATA-01 | `server/db/migrate.mjs` executa `TRUNCATE ... CASCADE`, captura erros por registro e pode concluir parcialmente; não há ledger de migrações. | Perda/corrupção de dados e deploy irreproduzível. | Runner versionado forward-only com checksums, lock, transações e expand/contract; seed de dev separado. | Fresh install e N-1→N convergem; reexecução é no-op; falha injetada faz rollback; nenhum deploy produtivo contém `TRUNCATE`. |
| OPS-01 | Não há backup automático completo, PITR, versionamento de uploads ou restore drill. | Recuperação não comprovada após erro, ransomware ou migração defeituosa. | Backup criptografado fora do host, PITR/WAL, storage versionado, RPO/RTO e restauração periódica. | Restore em ambiente isolado valida integridade, checksums e tempo dentro do RTO antes do primeiro deploy. |
| DEP-01 | Runtime possui 8 avisos high; Multer vulnerável é alcançável pelo upload público. React Router, DOMPurify, Nodemailer e dependências Express também aparecem. | DoS, bypasses, XSS e exposição ampliada por entrada pública. | Atualizações pequenas por família, testes de regressão, SBOM e substituição de `xlsx`; sem `npm audit fix` cego. | Zero high/critical alcançável em runtime; exceções têm análise, dono e expiração. |

### P1 — exigidos antes da disponibilidade geral

| ID | Problema | Solução e aceite resumidos |
|---|---|---|
| AUTH-01 | JWT de 30 dias no `localStorage`, sem refresh rotativo, revogação ou recarga do usuário; mudança de papel/senha não encerra sessão. | Preferir SSO/OIDC institucional ou access token curto em cookie HttpOnly/Secure/SameSite com sessão/refresh revogável, CSRF e MFA administrativo. Mudança de papel/senha revoga sessões. |
| AUTH-02 | Usuário novo pode receber senha compartilhada previsível e usar o restante da API sem troca obrigatória. | Convite/reset de uso único com expiração; campo `must_change_password` imposto no servidor; política de senha e proteção de login por conta+IP. |
| API-01 | Express 4 não encaminha automaticamente rejeições de handlers async; processos apenas registram `uncaughtException`/`unhandledRejection` e continuam. | Wrapper async ou Express 5, erro central, shutdown fatal e testes de rejeição. Nenhuma request fica pendurada; processo inválido encerra sob supervisor. |
| DATA-02 | Operações multi-etapa não compartilham transação; e-mail/job não usa outbox. | Helper transacional, repositories aceitando client, outbox e idempotência; fault injection prova rollback integral. |
| DOC-01 | Reemissão de declaração mantém código/data, mas atualiza snapshot; concorrência pode gerar mais de um código; `revogada_em` não tem fluxo e uma PNG versionada é tratada como assinatura visual. | Snapshot e hash imutáveis, nova versão/revogação explícita, constraint/transação e decisão institucional sobre assinatura SEI/ICP-Brasil ou equivalente. |
| OPS-02 | Não há CI/CD, Dockerfile, staging, artefato imutável, política de secrets nem rollback por digest. | Pipeline completo, runtime não-root, ambientes separados, configuração validada e deploy blue/green ou canário. |
| OPS-03 | `/api/status` não consulta dependências; não há request ID, logs JSON, métricas ou alertas. | Liveness/readiness separadas, logs com redação de PII, métricas RED, pool/storage/jobs/SMTP, dashboards e sintéticos. |
| OPS-04 | Não há SIGTERM/SIGINT, drain, fechamento do servidor/pool ou timeout de encerramento. | Readiness false, parar novas conexões, concluir as ativas, `pool.end()` e sair no prazo; teste de SIGTERM obrigatório. |
| OPS-05 | `server/services/agendador.js` declara que o agendador não é iniciado. | Worker/cron independente, lock distribuído, idempotência, retry e heartbeat; ou desativar formalmente a feature. |
| OPS-06 | Pool PostgreSQL usa defaults, TLS/timeouts não são explícitos; `trust proxy=1` e rate limit em memória pressupõem topologia não validada. | Configurar TLS, limites e timeouts; validar orçamento de conexões/CIDRs; store compartilhado para múltiplas réplicas. |
| FE-01 | `src/api.js` cai para `http://localhost:5000` quando `VITE_API_URL` falta em produção. | Usar origem relativa `/api` ou falhar o build produtivo; pipeline rejeita localhost/HTTP/configuração ausente. |
| FE-02 | `Home.jsx` mantém notícias, editais, números e programas mockados; há CTAs mortos, destino incorreto e `href="#"`. | Home alimentada por API/CMS, links semânticos, revisão editorial e verificador de links. Nenhum elemento com aparência interativa pode ficar sem ação. |
| FE-03 | Erros de API viram lista vazia e não há ErrorBoundary por área. | Estados distintos loading/vazio/erro/offline, retry e telemetria. Resposta 5xx nunca informa falsamente que não há conteúdo. |
| A11Y-01 | Menu desktop só abre por hover; ícones não têm nomes; não há `aria-expanded` e foco adequado. | Disclosure acessível com Enter/Espaço/Setas/Escape, foco e testes de teclado/leitor de tela. |
| A11Y-02 | Foram encontrados 246 labels, nenhum com `htmlFor`; cerca de 214 não envolvem o controle. | Componentes compartilhados de campo com IDs, ajuda e erros associados; axe sem campos sem rótulo. |
| A11Y-03 | Modais não implementam `dialog`, nome, focus trap, Escape ou retorno de foco; toasts não têm live region. | Componente Dialog único e Toast anunciado; testes automáticos e manuais. |
| A11Y-04 | Contraste falha em tokens recorrentes; há `<main>` aninhado, home sem `<h1>`, sem skip link, foco de rota ou reduced motion. | Revisão de tokens WCAG AA, exatamente um main, h1/rota, skip link, foco/scroll e `prefers-reduced-motion`. |
| UX-01 | `AdminLayout` é desktop-only, com sidebar fixa e overflow restritivo. | Drawer mobile/sidebar adaptativa e UAT em 320, 375, 768, 1024 e 1440 px; sem scroll horizontal global e válido em zoom 200%. |
| SEO-01 | Quase todas as rotas têm título/metadados genéricos; não há sitemap, robots, canonical, OG ou dados estruturados; conteúdo público é apenas CSR. | Metadados por rota, sitemap/robots, JSON-LD e decisão de prerender/SSR para conteúdo público. HTML inicial deve carregar os metadados canônicos. |
| PERF-01 | 36 imagens sem dimensões/lazy loading; hotlinks, Google Fonts e Font Awesome externos; `xlsx` carrega 295 kB no chunk. | Assets próprios e otimizados, dimensões/srcset, lazy abaixo da dobra, prioridade do LCP e import dinâmico/CSV ou biblioteca mantida. |

### P2/P3 — evolução logo após o piloto

- Busca realmente global e disponível no mobile.
- Testes React, contrato, visual, carga e acessibilidade; ESLint e cobertura com thresholds.
- CSP no frontend/reverse proxy, HSTS, Permissions-Policy, Referrer-Policy e `frame-ancestors`.
- Auditoria administrativa imutável, histórico/versionamento de conteúdo e trilha de download de dados pessoais.
- Mapa de dados, retenção/descarte, fluxos de acesso/correção/exclusão e revisão pelo encarregado de dados.
- README, runbooks, ADRs de arquitetura, ownership e documentação sincronizada com os 203 testes reais.
- Redução de padrões visuais genéricos — grids repetidos, blobs, sombras, listras e motion decorativo — para reforçar a identidade institucional.

## Pontos fortes a preservar

- Build e typecheck atuais passam.
- 203 testes de API com banco de testes isolado; há teste de concorrência para numeração sequencial.
- Repositórios usam consultas parametrizadas e schema relacional com várias constraints/FKs.
- `JWT_SECRET` e `DATABASE_URL` falham no boot quando ausentes.
- Produção já prevê allowlist de CORS, Helmet, limite JSON e rate limiting.
- Há sanitização de HTML com DOMPurify e CPF mascarado na verificação pública de declaração.
- Rotas React usam lazy loading e existem skeletons/empty states reutilizáveis.
- Todas as imagens encontradas têm `alt`, embora o contexto de alguns precise revisão.
- O sistema de declaração já preserva UUID/data de emissão; falta torná-lo realmente imutável e revogável.

## Alternativas de caminho

### A. Correção mínima para publicar rapidamente

Corrige apenas P0, configura uma VM e publica. É o menor prazo inicial, mas deixa dívida elevada em migração, recuperação, WCAG, observabilidade e operação manual. **Não recomendada** para disponibilidade pública; aceitável apenas como demonstração isolada sem dados reais.

### B. Hardening incremental com piloto e gates — recomendada

Mantém React/Express/PostgreSQL, fecha P0, cria migração/storage/CI/staging, corrige os fluxos públicos essenciais e lança primeiro um piloto controlado. Depois amplia acesso com canário. Equilibra risco, custo e aproveitamento do código existente.

### C. Replataformação antes de lançar

Adota SSO institucional, serviços gerenciados, novo framework SSR e plataforma completa antes de qualquer uso. Maximiza padronização de longo prazo, mas amplia escopo e atraso e não elimina a necessidade de corrigir/inventariar os dados atuais. Indicado somente se a UFRPE já tiver uma plataforma mandatória pronta.

## Roadmap recomendado

| Fase | Objetivo | Entregas principais | Saída obrigatória |
|---|---|---|---|
| 0 — freeze e inventário | Conhecer o estado candidato | commit/release candidato, inventário DB/contas/uploads/infra, donos, RPO/RTO | estado real reconciliado; nenhum deploy |
| 1 — contenção P0 | Fechar acesso e perda de dados | RBAC, rotação/SSO, storage privado, dependências expostas, bloqueio do TRUNCATE | todos os testes negativos e restore inicial aprovados |
| 2 — fundação de dados | Tornar upgrades recuperáveis | runner versionado, backup/PITR, transações, outbox, documentos imutáveis | fresh/N-1→N, fault injection e restore drill aprovados |
| 3 — entrega reproduzível | Produzir e reverter com segurança | CI/CD, imagens, staging, secrets, configuração, artefato por commit | deploy e rollback automatizados |
| 4 — produto público | Garantir verdade, acesso e descoberta | home CMS, links, erros, WCAG, admin responsivo, SEO e imagens | E2E, axe, teclado/NVDA, links e metadados aprovados |
| 5 — operabilidade | Detectar e conter falhas | health, shutdown, logs, métricas, alertas, worker e runbooks | falhas simuladas observáveis e recuperáveis |
| 6 — ensaio e piloto | Validar a operação real | pentest, carga, clone mascarado, UAT, canário/blue-green | aprovação formal de AppSec, produto e operação |

Faixa inicial de trabalho: aproximadamente **5 a 10 semanas** para uma equipe pequena com apoio de infraestrutura, segurança, conteúdo e encarregado de dados. A variação depende principalmente de SSO, object storage, acesso ao banco real e exigências institucionais. A sequência e os gates importam mais que a data.

## Gates finais de produção

### Segurança e privacidade

- [ ] Todos os P0 encerrados com evidência.
- [ ] Matriz RBAC completa passa para toda rota/método/papel/escopo.
- [ ] Conta/senha seed não existe no banco; segredos e tokens foram rotacionados.
- [ ] Nenhum comprovante pessoal é público; acesso é autenticado, autorizado e auditado.
- [ ] Runtime sem high/critical alcançável; exceções moderadas têm dono e expiração.
- [ ] Pentest e revisão do encarregado de dados aprovados.

### Dados e recuperação

- [ ] Migrações fresh e N-1→N passam; reexecução é no-op.
- [ ] Backup completo e restore drill medido dentro de RPO/RTO.
- [ ] Operações críticas são transacionais/idempotentes.
- [ ] PDFs emitidos têm snapshot/hash imutável e fluxo de revogação.

### Produto e qualidade

- [ ] Suíte de 203 testes passa em PostgreSQL efêmero.
- [ ] E2E cobre login, papéis, CRUD, upload/download, proficiência, Câmara, atos e conteúdo público.
- [ ] axe não encontra violações serious/critical; teclado e NVDA são aprovados.
- [ ] Não há CTA/link morto, conteúdo mockado publicado nem falso estado vazio.
- [ ] Build produtivo usa endpoint real e seguro.
- [ ] Metadados/canonical/sitemap/robots e Web Vitals mínimos foram validados.

### Operação e release

- [ ] Artefato imutável e scan de imagem aprovados.
- [ ] Staging equivale à produção; migração e rollback foram ensaiados.
- [ ] Liveness/readiness, shutdown, logs, métricas, alertas e sintéticos estão ativos.
- [ ] Runbooks de deploy, rollback, restore, rotação e incidente têm responsáveis.
- [ ] Rollout canário/blue-green tem métricas e critérios de interrupção definidos.

## Critérios de interrupção e rollback

Interromper ou reverter se houver divergência 401/403, acesso indevido a comprovante, erro de migração/checksum, perda ou órfão de arquivo, quebra de login/CRUD, duplicação de evento/e-mail, aumento relevante de 5xx/latência/saturação, readiness falso-positivo ou regressão crítica de acessibilidade.

- **Aplicação:** voltar ao digest anterior, sem rebuild.
- **Banco:** preferir forward-fix; rollback de aplicação depende de schema expand/contract compatível.
- **Corrupção:** ativar maintenance mode, suspender writes, preservar o ponto PITR e restaurar somente por decisão formal.
- **Uploads:** migrar com dual-read e checksums; manter a origem durante janela definida.
- **Credenciais:** rotacionar e invalidar sessões imediatamente.
- **Jobs:** desligar o schedule sem derrubar a API e reprocessar com chave idempotente.

## Decisões externas ainda necessárias

- Topologia alvo: VM, containers, balanceador, quantidade de proxies e alta disponibilidade.
- SSO/OIDC institucional versus identidade local reforçada.
- Object storage autorizado para documentos pessoais e públicos.
- RPO/RTO, retenção, descarte e base institucional de tratamento dos dados.
- DNS, TLS, WAF/CDN, secret manager e SMTP institucional.
- Volume/pico de inscrições e número esperado de usuários.
- Escopo exato do piloto, responsáveis de plantão e janela de suporte.
- Autoridade de assinatura e revogação de declarações.

O plano executável correspondente está em `docs/superpowers/plans/2026-09-09-prontidao-producao-prpg.md`.
