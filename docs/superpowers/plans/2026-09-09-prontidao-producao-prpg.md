# PRPG Production Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformar o PRPG atual em um sistema publicável por meio de um piloto controlado, com autorização deny-by-default, dados pessoais privados, migrações recuperáveis, entrega reproduzível, acessibilidade mínima, observabilidade e gates objetivos.

**Architecture:** Preservar React/Vite, Express e PostgreSQL. Introduzir uma camada central de políticas, sessão revogável ou SSO, storage privado separado do conteúdo público, migrações forward-only, outbox/worker, imagens de runtime imutáveis, staging e pipeline orientado por evidências. O rollout será expand/contract e canário; rollback normal troca o artefato, não desfaz dados destrutivamente.

**Tech Stack:** React 19, React Router, Vite, Tailwind CSS, Express, PostgreSQL 16, Vitest/supertest; adicionar ferramenta de migração PostgreSQL, storage S3 compatível ou institucional, Playwright, Testing Library, axe, ESLint, logger estruturado, métricas e pipeline CI/CD escolhido pela UFRPE.

---

## Regras de execução

- Não iniciar Task 4 ou posterior enquanto os P0 das Tasks 1–3 estiverem abertos.
- Escrever o teste que falha antes da correção funcional.
- Fazer commits pequenos por tarefa; não combinar RBAC, storage e migração no mesmo PR.
- Preservar compatibilidade N-1/N durante mudanças de banco e deploy canário.
- Não executar `npm run db:migrate` contra nenhum banco com dados reais.
- Não armazenar segredo, dump, documento pessoal ou artefato de produção no Git.
- Cada tarefa termina com evidência anexada ao PR: saída de teste, decisão, screenshot ou relatório.
- A execução só começa após escolha das decisões listadas na Task 0.

## Dependências e caminho crítico

```text
Task 0 (inventário/freeze)
  ├─ Task 1 (RBAC) ─ Task 2 (identidade/sessões)
  ├─ Task 3 (storage privado)
  └─ Task 4 (migrações/backup)
        └─ Task 5 (transações/outbox/documentos)

Tasks 1–5 ─ Task 6 (dependências) ─ Task 7 (runtime/CI/staging)
                                      ├─ Task 8 (health/observabilidade)
                                      ├─ Task 9 (frontend funcional)
                                      ├─ Task 10 (WCAG/responsivo)
                                      └─ Task 11 (SEO/performance)

Tasks 1–11 ─ Task 12 (QA/pentest/carga) ─ Task 13 (ensaio/piloto)
```

## Task 0: Congelar a release e levantar o estado real

**Owner:** tech lead + DBA + operação + responsável funcional
**Blocking:** sim; nenhuma publicação antes de concluir.

**Files:**

- Create: `docs/operations/inventario-producao.md`
- Create: `docs/adr/0001-topologia-producao.md`
- Create: `docs/adr/0002-identidade-e-sso.md`
- Create: `docs/adr/0003-storage-documentos.md`
- Modify: `README.md`
- Modify: `DOCUMENTACAO.md`

- [ ] Registrar commit candidato, 57 commits locais pendentes, mudanças de schema e módulos que exigem revisão humana.
- [ ] Inventariar ambiente alvo: hosts, SO, containers, proxies, DNS, TLS, WAF/CDN, DB, SMTP, storage, secrets e responsáveis.
- [ ] Consultar o banco-alvo de forma read-only: versão/schema, contagens, contas privilegiadas, estado da conta seed e documentos já cadastrados.
- [ ] Inventariar `server/uploads` e classificar cada tipo como público, privado ou desconhecido; calcular checksums sem copiar arquivos.
- [ ] Definir RPO, RTO, retenção, descarte, pico de inscrições, SLO e janela de suporte.
- [ ] Escolher SSO/OIDC ou identidade local; object storage; ferramenta de migração; runtime e plataforma CI/CD.
- [ ] Atualizar README com setup real, testes, arquitetura e advertência explícita de que `db:migrate` é seed destrutivo de desenvolvimento.
- [ ] Obter aprovação escrita do responsável funcional, infraestrutura e encarregado de dados.

**Verification:** inventário não contém senhas/tokens; todas as decisões têm owner/data; divergências de schema ficam registradas.
**Commit:** `docs: registrar arquitetura e inventário de produção`

## Task 1: Fechar autorização com política deny-by-default

**Owner:** backend/AppSec
**Files:**

- Modify: `server/middleware/authMiddleware.js`
- Modify: `server/routes/adminRoutes.js`
- Modify: `server/controllers/usersController.js`
- Test: `server/__tests__/authz.test.js`
- Create: `server/__tests__/authzMatrix.test.js`
- Create: `docs/security/matriz-rbac.md`

- [ ] Mapear toda rota como recurso, ação, papéis permitidos e regra de ownership/programa; nenhuma célula pode ficar implícita.
- [ ] Escrever testes parametrizados cobrindo anônimo, Aluno, Professor, GestorPrograma do próprio programa, GestorPrograma alheio, Gestor e Administrator.
- [ ] Confirmar que os testes atuais falham para mutações hoje alcançáveis por usuário comum.
- [ ] Substituir o fail-open de `requireSelfPrograma`/`scopeProgramaWrite` por `requirePermission(resource, action)` que negue quando não houver regra.
- [ ] Recarregar usuário/papéis/estado a partir do banco no boundary de autorização ou usar versão de sessão revogável.
- [ ] Exigir autorização explícita nas rotas aninhadas de pessoas, vínculos, modalidades, coordenadores e conteúdo institucional.
- [ ] Testar IDOR/ownership com IDs de outro usuário/programa e payload que tente trocar `programaId`.
- [ ] Registrar logs de decisão negada sem gravar token ou PII desnecessária.

**Run:** `npm test -- server/__tests__/authz.test.js server/__tests__/authzMatrix.test.js`
**Expected:** todos os casos negativos retornam 401/403 e nenhuma mutação ocorre; casos positivos respeitam escopo.
**Gate:** cobertura 100% de branches da política crítica.
**Commit:** `fix(authz): negar por padrão e aplicar matriz de permissões`

## Task 2: Eliminar credenciais compartilhadas e tornar sessões revogáveis

**Execução parcial (10/09/2026):** a conta seed conhecida foi removida do
repositório; `seedAdmin` agora exige `SEED_ADMIN_EMAIL` e
`SEED_ADMIN_PASSWORD` (mínimo 16 caracteres) e recusa produção; e o seed
destrutivo também recusa produção. Os testes de política e do script cobrem
essas barreiras. A decisão sobre convite/reset de senha e SSO/OIDC institucional
continua pendente; por isso `Mudar123`, sessões revogáveis e MFA ainda não são
considerados resolvidos.

**Owner:** backend/AppSec + infraestrutura de identidade
**Files:**

- Modify/Delete: `server/scripts/seedAdmin.js`
- Modify: `server/data/users.json`
- Modify: `server/db/migrate.mjs`
- Modify: `server/controllers/authController.js`
- Modify: `server/controllers/usersController.js`
- Modify: `server/middleware/authMiddleware.js`
- Modify: `src/api.js`
- Modify: `src/pages/admin/AdminLogin.jsx`
- Create: versioned migration under `server/db/migrations/`
- Test: `server/__tests__/auth.test.js`
- Test: `server/__tests__/users.test.js`

- [ ] Escrever teste que rejeita a credencial seed conhecida e garante que migração/seed produtivo não cria administrador padrão.
- [ ] Remover senha/hash conhecido do seed e impedir `seedAdmin` fora de development/test.
- [ ] Criar bootstrap de administrador de uso único via secret manager/convite, ou integrar OIDC institucional.
- [ ] Substituir a senha compartilhada `Mudar123` por convite/reset criptograficamente aleatório, single-use e expirável.
- [ ] Adicionar `must_change_password` imposto pela API; até a troca, permitir apenas sessão/logout/troca de senha.
- [ ] Implementar access token curto e sessão/refresh revogável; preferir cookie HttpOnly/Secure/SameSite e proteção CSRF se identidade local.
- [ ] Invalidar sessões quando senha, papel, status ou associação de programa mudar.
- [ ] Exigir MFA para Administrator/Gestor quando suportado pelo provedor.
- [ ] Rotacionar `JWT_SECRET` e credenciais reais no rollout; confirmar rejeição de tokens antigos.
- [ ] Adicionar secret scan que detecte strings/hash/defaults proibidos.

**Run:** `npm test -- server/__tests__/auth.test.js server/__tests__/users.test.js`
**Expected:** login antigo falha; convite expira e não reutiliza; role/password change invalida sessão; flag temporária bloqueia outras rotas.
**Commit:** `fix(auth): remover defaults e adicionar sessões revogáveis`

## Task 3: Separar documentos públicos e privados

**Execução parcial (10/09/2026):** comprovantes novos de proficiência são
gravados fora do webroot em `server/private-uploads`, com UUID, e são entregues
somente por download autenticado para Administrator/Gestor, com `no-store` e
`nosniff`. A tela administrativa passou a usar esse endpoint autenticado. O
teste `proficienciaPrivateUploads.test.js` cobre anonimato e acesso gestor.
Este é um containment local: storage durável/criptografado, antivírus, retenção,
auditoria, associação por attachment e migração de anexos antigos continuam
abertos antes de produção.

**Owner:** backend/AppSec + infraestrutura/storage + encarregado de dados
**Files:**

- Modify: `server/app.js`
- Modify: `server/routes/adminRoutes.js`
- Modify: `server/controllers/proficienciaController.js`
- Create: `server/services/storage/privateStorage.js`
- Create: `server/services/storage/publicStorage.js`
- Create: versioned migration under `server/db/migrations/`
- Modify: `src/pages/admin/AdminProficiencia.jsx`
- Modify: `src/api.js`
- Create: `server/__tests__/uploadsPrivate.test.js`
- Modify: `server/__tests__/proficiencia.test.js`
- Create: `docs/operations/retencao-documentos.md`

- [ ] Escrever testes multipart reais para upload válido, extensão falsa, MIME falso, magic bytes inválidos, arquivo grande, EICAR, arquivo órfão e concorrência.
- [ ] Escrever testes de acesso: anônimo, aluno proprietário, outro aluno, GestorPrograma e administrador.
- [ ] Remover comprovantes do webroot e manter `/uploads` somente para ativos explicitamente públicos.
- [ ] Gravar privados em storage durável com chave UUID aleatória, criptografia, metadata mínima e status quarantine/clean.
- [ ] Validar conteúdo por assinatura real, tamanho, quantidade, extensão e scanner; nunca confiar apenas no MIME do cliente.
- [ ] Associar upload por `attachment_id` de uso único ao registro criado; executar cleanup/reconciliação de órfãos.
- [ ] Implementar streaming autorizado ou URL assinada de poucos minutos; responder 404 quando a política recomendar ocultar existência.
- [ ] Trocar o `<a href>` direto do admin por fluxo autenticado com estados 401/403/404/expirado.
- [ ] Auditar upload, leitura e exclusão sem logar URL assinada ou conteúdo.
- [ ] Migrar arquivos existentes com dual-read e checksums; manter origem somente durante janela definida.

**Run:** `npm test -- server/__tests__/uploadsPrivate.test.js server/__tests__/proficiencia.test.js`
**Expected:** nenhum documento pessoal é obtido anonimamente/cross-user; arquivo hostil fica em quarentena; falha de DB não deixa órfão permanente.
**Commit:** `fix(storage): privatizar comprovantes e autorizar downloads`

## Task 4: Implantar migrações versionadas e recuperação testada

**Execução parcial (10/09/2026):** foi criado `npm run db:migrate:apply`.
O executor serializa deploys por advisory lock, registra nome/checksum em
`schema_migrations`, executa cada arquivo em transação e recusa alteração de
migração já aplicada. Os testes cobrem aplicação única, checksum divergente e
falha sem registro de versão. Ainda faltam baseline seguro, migrações reais do
schema, backup/PITR, restauração ensaiada e a separação definitiva do seed
legado de desenvolvimento.

**Operação Kubernetes (10/09/2026):** o runbook de backup/PITR e restore isolado
para PostgreSQL stateful no Kubernetes foi registrado em
`docs/operations/backup-restore.md`. A escolha do operador e do bucket, e o
primeiro ensaio de restauração, continuam como gates de produção.

**Owner:** DBA/backend/SRE
**Files:**

- Modify: `package.json`
- Modify: `server/db/migrate.mjs`
- Create: `server/db/migrations/README.md`
- Create: `server/db/migrations/0001_baseline.sql`
- Create: `server/db/migrations/0002_production_hardening.sql`
- Create: `server/db/migrateRunner.mjs`
- Create: `server/db/seedDevelopment.mjs`
- Create: `server/__tests__/migrations.test.js`
- Create: `docs/operations/backup-restore.md`
- Create: `docs/operations/database-deploy.md`

- [ ] Escolher runner com ledger, checksum e advisory lock; documentar por ADR.
- [ ] Escrever teste que bloqueia o seed destrutivo quando `NODE_ENV=production`.
- [ ] Escrever testes fresh install, N-1→N, reexecução no-op, checksum alterado, lock concorrente e falha no meio.
- [ ] Mover seed JSON para comando de desenvolvimento claramente destrutivo; nunca chamá-lo em deploy.
- [ ] Converter diferenças reais de schema em migrações forward-only, uma responsabilidade por arquivo.
- [ ] Adotar expand/contract: adicionar nullable/dual-write/backfill/verificar/contrair em releases distintas.
- [ ] Configurar backup completo, PITR/WAL, criptografia, retenção imutável e backup/versionamento do storage.
- [ ] Restaurar em ambiente isolado, validar constraints, contagens e amostra de arquivos por checksum; medir RPO/RTO.
- [ ] Ensaiar aplicação antiga sobre schema expandido e aplicação nova durante canário.

**Run:** `npm test -- server/__tests__/migrations.test.js`
**Expected:** nenhum caminho de produção executa TRUNCATE; falha não marca versão; reexecução não altera dados.
**Commit:** `feat(db): adicionar migrações versionadas e seed isolado`

## Task 5: Tornar operações críticas atômicas, idempotentes e auditáveis

**Owner:** backend/dados
**Files:**

- Modify: `server/db/pool.js`
- Modify: `server/db/repository.js`
- Create: `server/db/transaction.js`
- Modify: `server/controllers/atosController.js`
- Modify: `server/controllers/camaraController.js`
- Modify: `server/controllers/camaraReunioesController.js`
- Modify: `server/controllers/posDoutoradoController.js`
- Modify: `server/services/declaracoes.js`
- Create: `server/services/outbox.js`
- Create: versioned migrations for outbox/audit/document versions
- Create: `server/__tests__/transactions.test.js`
- Create: `server/__tests__/declaracoesImutaveis.test.js`

- [ ] Criar helper que abre client, BEGIN/COMMIT/ROLLBACK e passa o mesmo client aos repositórios.
- [ ] Escrever fault-injection tests após cada etapa de atos, diplomas, reuniões, relatorias e prorrogações.
- [ ] Envolver alterações canônicas em transação; mover e-mail/job para outbox no mesmo commit do banco.
- [ ] Adicionar chave idempotente/constraint para não duplicar ato, evento, notificação ou diploma em retry.
- [ ] Tornar declaração emitida um snapshot imutável com hash do PDF/dados.
- [ ] Adicionar constraint que impede dois códigos ativos concorrentes para mesma entidade/tipo; emitir/revogar/versionar em transação.
- [ ] Implementar revogação pública verificável e registrar motivo/autor/data.
- [ ] Obter decisão institucional para assinatura digital; não apresentar PNG versionada como garantia criptográfica.
- [ ] Criar trilha administrativa append-only para ações sensíveis.

**Run:** `npm test -- server/__tests__/transactions.test.js server/__tests__/declaracoesImutaveis.test.js`
**Expected:** falha injetada reverte tudo; retry não duplica; verificação histórica continua igual ao PDF emitido; revogação aparece publicamente.
**Commit:** `feat(data): garantir atomicidade outbox e documentos imutaveis`

## Task 6: Remediar dependências e endurecer a borda HTTP

**Owner:** AppSec/backend/frontend
**Files:**

- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `server/app.js`
- Modify: `server/routes/adminRoutes.js`
- Modify: `src/pages/ProgramasStrictoSensu.jsx`
- Modify: controllers that import `xlsx`
- Create: `docs/security/dependency-exceptions.md`

- [ ] Salvar baseline JSON de `npm audit` runtime e completo no artefato do CI, não no código-fonte.
- [ ] Atualizar Multer, DOMPurify, React Router, Nodemailer e cadeia Express/qs/body-parser com testes por família.
- [ ] Substituir `xlsx` por biblioteca mantida ou CSV; se temporariamente mantido, carregar no clique e limitar a dados de exportação conhecidos.
- [ ] Atualizar API de upload para limites de campo/arquivo, timeouts e abort seguro.
- [ ] Configurar CSP no frontend/reverse proxy, HSTS, Permissions-Policy, Referrer-Policy, `frame-ancestors` e `nosniff`.
- [ ] Servir PDF/documentos privados como attachment quando apropriado e com cache privado/no-store.
- [ ] Revisar dependências extraneous e fixar versões de runtime.
- [ ] Documentar somente exceções não alcançáveis, com CVE, justificativa, mitigação, owner e expiração.

**Run:** `npm audit --omit=dev`; `npm test`; `npm run build`
**Expected:** zero high/critical alcançável; build/testes passam; relatório completo não possui exceção sem prazo.
**Commit:** `chore(security): atualizar dependencias e headers de producao`

## Task 7: Criar runtime e pipeline reproduzíveis

**Owner:** DevOps/SRE
**Files:**

- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `.nvmrc` or equivalent pinned runtime file
- Create: `Dockerfile`
- Create: `.dockerignore`
- Modify: `docker-compose.yml` for development only
- Create: CI workflow under the platform selected in Task 0
- Create: `scripts/verify-production-config.mjs`
- Create: `docs/operations/deploy.md`
- Create: `docs/operations/rollback.md`

- [ ] Fixar Node LTS/npm e declarar `engines`; usar `npm ci`.
- [ ] Criar build multi-stage e runtime não-root, read-only quando possível, com imagem base por digest.
- [ ] Separar frontend estático/API ou documentar claramente o reverse proxy; produção não expõe PostgreSQL.
- [ ] Tornar obrigatórios `DATABASE_URL`, sessão/JWT, `PUBLIC_SITE_URL`, origem da API, CORS, proxy, SMTP e storage.
- [ ] Falhar build/deploy se produção contiver localhost, HTTP indevido, senha padrão ou segredo ausente.
- [ ] Pipeline de PR: install, lint, typecheck, secret/SAST, SBOM/licenças, audit, DB efêmero, testes, cobertura, fresh/upgrade migration, build, E2E/axe, imagem e scan.
- [ ] Publicar artefato por commit/digest e assinar release; não reconstruir no deploy.
- [ ] Criar staging equivalente em topologia/configuração, usando dados sintéticos ou clone mascarado aprovado.
- [ ] Automatizar deploy e rollback do digest anterior com aprovação humana.

**Run:** pipeline completo em PR de teste e deploy/rollback em staging.
**Expected:** mesmo commit produz artefato rastreável; deploy rejeita configuração dev; rollback não recompila.
**Commit:** `build: adicionar runtime e pipeline de producao`

## Task 8: Adicionar health, shutdown, logs, métricas e worker

**Owner:** backend/SRE
**Files:**

- Modify: `server/index.js`
- Modify: `server/app.js`
- Modify: `server/db/pool.js`
- Create: `server/middleware/requestContext.js`
- Create: `server/services/health.js`
- Create: `server/worker.js`
- Modify: `server/services/agendador.js`
- Create: `server/__tests__/health.test.js`
- Create: `server/__tests__/shutdown.test.js`
- Create: `server/__tests__/worker.test.js`
- Create: `docs/operations/incident-response.md`
- Create: `docs/operations/monitoring.md`

- [ ] Separar `/health/live` de `/health/ready`; readiness testa DB, storage e dependências indispensáveis dentro de timeout curto.
- [ ] Parametrizar pool: TLS, max, connect/query/idle timeout, application name e orçamento por réplica.
- [ ] Validar `trust proxy` por CIDR/hops reais e usar store compartilhado para rate limit em múltiplas réplicas.
- [ ] Implementar SIGTERM/SIGINT: readiness false, parar accepts, drenar, fechar pool e sair no prazo.
- [ ] Em `uncaughtException`/`unhandledRejection`, registrar de forma segura e encerrar sob supervisor.
- [ ] Adicionar logs JSON com request ID, usuário pseudonimizado e redação de token, senha, CPF, endereço e URL assinada.
- [ ] Instrumentar taxa/erro/duração, 401/403, pool, storage, upload, outbox, jobs, SMTP e verificações públicas.
- [ ] Executar agendador como worker/schedule independente com lock, idempotência, retry e heartbeat; iniciar em dry-run.
- [ ] Criar dashboards, alertas, sintéticos e runbooks com owner/escalonamento.

**Run:** testes de DB indisponível, SIGTERM durante request e duas instâncias do worker.
**Expected:** instância sai do balanceador; request em curso encerra; pool fecha; job não duplica; ausência de heartbeat alerta.
**Commit:** `feat(ops): adicionar health shutdown observabilidade e worker`

## Task 9: Corrigir integridade funcional do frontend

**Owner:** frontend + conteúdo/produto
**Files:**

- Modify: `src/api.js`
- Modify: `src/pages/Home.jsx`
- Modify: `src/pages/Noticias.jsx`
- Modify: `src/components/Navbar.jsx`
- Modify: `src/components/Footer.jsx`
- Modify: `src/pages/Financeiro.jsx`
- Modify: `src/pages/Resolucoes.jsx`
- Create: `src/components/AsyncState.jsx`
- Create: `src/components/AppErrorBoundary.jsx`
- Create: frontend unit tests for these files
- Create: `docs/content/inventario-home.md`

- [ ] Escrever testes que distinguem loading, vazio, erro, offline e sucesso.
- [ ] Fazer produção usar `/api` same-origin ou configuração validada; proibir fallback localhost.
- [ ] Alimentar notícias, editais, programas, serviços e indicadores da home via APIs/CMS; definir política editorial de publicação.
- [ ] Transformar CTAs em `Link`/`a`/`button` semântico e remover todos os `href="#"`, spans clicáveis e destinos errados.
- [ ] Corrigir “Formando professionals” e revisar textos/datas/estatísticas com a equipe PRPG.
- [ ] Adicionar ErrorBoundary por área, retry e captura de erro; nunca representar 500/offline como coleção vazia.
- [ ] Tratar globalmente 401/403 e expiração de download/sessão sem loops de redirect.
- [ ] Adicionar verificador automatizado de links internos e externos relevantes.

**Run:** frontend unit tests; `npm run build`; Playwright smoke da home/listagens.
**Expected:** zero ação morta; conteúdo visível coincide com API; falha mostra mensagem acionável; config inválida falha antes do deploy.
**Commit:** `fix(frontend): usar conteudo real e estados de erro explicitos`

## Task 10: Construir fundação WCAG 2.2 AA e responsividade

**Owner:** frontend/UX/acessibilidade
**Files:**

- Modify: `src/components/PublicLayout.jsx`
- Modify: `src/components/ProgramaLayout.jsx`
- Modify: `src/components/AdminLayout.jsx`
- Modify: `src/components/Navbar.jsx`
- Modify: `src/components/admin/ConfirmModal.jsx`
- Modify: `src/components/admin/Toast.jsx`
- Modify: `src/pages/admin/AdminLogin.jsx`
- Modify: `src/styles/globals.css`
- Create: `src/components/Field.jsx`
- Create: `src/components/Dialog.jsx`
- Create: `src/components/RouteFocusManager.jsx`
- Create: component tests and Playwright accessibility specs

- [ ] Adicionar skip link, exatamente um `<main>`, um `<h1>` contextual e foco/scroll coerente na troca de rota.
- [ ] Trocar dropdown hover-only por disclosure operável por Enter/Espaço/Setas/Escape com `aria-expanded/controls`.
- [ ] Nomear todos os botões de ícone; revisar texto alternativo contextual.
- [ ] Criar `Field`, `SelectField` e `FileField` com `htmlFor`, IDs, help, `aria-describedby`, `required`, `aria-invalid` e erro.
- [ ] Migrar primeiro login, proficiência e CRUDs críticos; a busca encontrou 246 labels, nenhum com `htmlFor`.
- [ ] Criar Dialog com nome, `aria-modal`, focus trap, Escape e retorno de foco; migrar confirmação, mapa e proficiência.
- [ ] Tornar Toast uma live region; erros persistem ou têm duração controlável.
- [ ] Corrigir tokens de contraste e validar cores configuráveis dos microsites antes de salvar.
- [ ] Implementar `prefers-reduced-motion`, foco visível consistente e alvos de toque adequados.
- [ ] Reconstruir AdminLayout: drawer mobile, sidebar tablet/desktop e formulários/ações que empilham.
- [ ] Validar 320, 375, 768, 1024 e 1440 px e zoom 200%, sem scroll horizontal da página.

**Run:** unit tests; Playwright+axe; navegação manual teclado+NVDA.
**Expected:** axe sem serious/critical; fluxos críticos completos sem mouse; contraste AA; foco nunca se perde; admin funciona nos viewports acordados.
**Commit:** `feat(a11y): criar componentes acessiveis e layout responsivo`

## Task 11: Implementar SEO e performance essenciais

**Owner:** frontend/SEO/performance + conteúdo
**Files:**

- Modify: `index.html`
- Modify: route/page modules under `src/pages/`
- Create: `public/robots.txt`
- Create: sitemap generation script and output path
- Create: `src/components/RouteMetadata.jsx` or selected prerender/SSR integration
- Modify: image usages and asset pipeline
- Modify: `src/pages/ProgramasStrictoSensu.jsx`
- Create: Lighthouse CI configuration

- [ ] Decidir prerender/SSR para páginas públicas; manter admin como SPA se apropriado.
- [ ] Adicionar title, description, canonical, OG/Twitter por rota no HTML inicial.
- [ ] Gerar sitemap apenas com conteúdo público/canônico; configurar robots e noindex do admin/verificações sensíveis quando aplicável.
- [ ] Adicionar JSON-LD válido de Organization, Article, FAQPage e BreadcrumbList somente quando os dados existirem.
- [ ] Trazer imagens/fontes/ícones críticos para assets institucionais controlados; eliminar hotlink frágil e mixed content HTTP.
- [ ] Gerar AVIF/WebP, dimensões, `srcset/sizes`; lazy abaixo da dobra e prioridade/preload do LCP.
- [ ] Remover import estático de `xlsx`; usar CSV nativo/import dinâmico ou substituição aprovada.
- [ ] Definir budgets de bundle e Lighthouse CI; medir também em conexão móvel realista.

**Run:** `npm run build`; Lighthouse CI; validador de sitemap; Rich Results Test em staging.
**Expected:** metadados canônicos no HTML inicial; sitemap válido; LCP≤2,5s, CLS≤0,1, INP≤200ms p75 quando houver RUM; chunk de página não carrega biblioteca de exportação antes do clique.
**Commit:** `feat(web): adicionar seo tecnico e budgets de performance`

## Task 12: Completar a estratégia de qualidade e segurança

**Owner:** QA + AppSec + produto
**Files:**

- Modify: `package.json`
- Modify: `vitest.config.js`
- Modify: `tsconfig.json`
- Create: ESLint flat config
- Create: frontend test configuration
- Create: `playwright.config.*`
- Create: `tests/e2e/`
- Create: `tests/load/`
- Create: `docs/qa/release-evidence.md`

- [ ] Corrigir/documentar os dois pacotes extraneous e sincronizar lockfile.
- [ ] Adicionar ESLint com regras de segurança, React hooks e JSX a11y; habilitar `checkJs` progressivamente ou migrar módulos críticos para TS.
- [ ] Configurar cobertura V8; 100% de branches em autorização/migração e mínimo 80% lines/branches nos serviços críticos.
- [ ] Executar os 203 testes atuais contra PostgreSQL efêmero no CI.
- [ ] Adicionar testes React de componentes/estados e contrato API.
- [ ] Adicionar E2E de login/sessão, matriz de papel, CRUD, upload/download privado, proficiência, declaração/revogação, Câmara, atos, PNPD e conteúdo público.
- [ ] Testar rate limit/proxy real, multipart hostil, concorrência e fault injection.
- [ ] Fazer carga no pico esperado de inscrição; definir SLO antes de declarar sucesso.
- [ ] Executar DAST/pentest em staging e revisão LGPD; resolver achados críticos/altos.
- [ ] Manter relatório de evidência por release com commit, artefato, testes, scans e aprovações.

**Run:** pipeline completo, carga e pentest em staging.
**Expected:** todos os gates passam; não há waiver crítico/alto; resultados são reproduzíveis pelo commit.
**Commit:** `test: adicionar gates frontend e2e acessibilidade e seguranca`

## Task 13: Ensaiar, lançar piloto e ampliar por canário

**Owner:** release manager + SRE + AppSec + produto
**Files:**

- Modify: `docs/operations/deploy.md`
- Modify: `docs/operations/rollback.md`
- Modify: `docs/operations/incident-response.md`
- Create: `docs/releases/pilot-checklist.md`
- Create: `docs/releases/post-release-review.md`

- [ ] Restaurar backup em clone isolado e executar migração completa; comparar schema, contagens e checksums.
- [ ] Executar UAT com Administrator, Gestor, GestorPrograma, Professor, Aluno e visitante.
- [ ] Ensaiar rollback de aplicação pelo digest anterior e validar compatibilidade de schema.
- [ ] Ensaiar falhas de DB, storage, SMTP, worker e proxy; validar alertas/runbooks.
- [ ] Fazer smoke pós-deploy em menos de cinco minutos.
- [ ] Observar staging por 24–48 horas com sintéticos e carga representativa.
- [ ] Abrir piloto para grupo controlado; registrar consentimentos/comunicação e canal de suporte.
- [ ] Se a plataforma permitir, ampliar 5% → 25% → 50% → 100%, observando erro, p95, pool, storage, jobs e autenticação em cada estágio.
- [ ] Manter ambiente anterior aquecido até concluir a janela de 100%.
- [ ] Fazer post-release review e transformar exceções aceitas em backlog com prazo/owner.

**Stop conditions:** divergência de RBAC, acesso indevido a comprovante, erro/checksum de migração, perda/órfão, quebra de login/CRUD, duplicação de evento/e-mail, aumento acima do SLO, readiness falso-positivo ou regressão accessibility serious/critical.
**Rollback:** aplicação volta ao digest anterior; banco recebe forward-fix; corrupção ativa maintenance mode/PITR; uploads mantêm dual-read; jobs são desativados e reprocessados por chave idempotente.
**Commit:** `docs(release): registrar ensaio e checklist do piloto`

## Definition of Done da prontidão de produção

- [ ] P0 SEC-01, SEC-02, PRIV-01, DATA-01, OPS-01 e DEP-01 encerrados com evidência.
- [ ] Banco/arquivos restaurados com sucesso dentro de RPO/RTO.
- [ ] Autorização, upload privado e sessão passam em testes negativos e pentest.
- [ ] Migração fresh/N-1→N é segura, idempotente e sem TRUNCATE produtivo.
- [ ] CI publica artefato imutável; staging, deploy e rollback são reproduzíveis.
- [ ] Conteúdo real, links, erros e configuração da API estão corretos.
- [ ] WCAG critical/serious zero no axe e teclado/NVDA aprovados nos fluxos críticos.
- [ ] SEO/metadados/indexação básicos e budgets de performance aprovados.
- [ ] Readiness, shutdown, logs, métricas, alertas, worker e runbooks aprovados.
- [ ] AppSec, operação, produto e encarregado de dados assinam o go-live.

## Ordem sugerida de PRs

1. testes da matriz RBAC e deny-by-default;
2. remoção de seeds/defaults e sessão revogável;
3. storage privado e migração dual-read;
4. runner de migrations + bloqueio do seed destrutivo;
5. backup/restore e transações/outbox;
6. dependências alcançáveis e headers;
7. runtime/CI/staging;
8. health/shutdown/observabilidade/worker;
9. integridade funcional do frontend;
10. componentes WCAG e admin responsivo;
11. SEO/performance;
12. gates QA completos;
13. ensaio e piloto.

Cada PR deve ser pequeno o bastante para reverter sem misturar mudanças de segurança, schema, infraestrutura e UI.
