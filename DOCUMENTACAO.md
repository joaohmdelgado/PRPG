# Documentação do Projeto — Site da PRPG/UFRPE

> Guia completo e acessível do código-fonte. O objetivo é que qualquer pessoa
> (mesmo sem conhecer o projeto) consiga entender **o que cada arquivo faz**,
> como as peças se encaixam e como rodar tudo localmente.

---

## Sumário

1. [Visão geral](#1-visão-geral)
2. [Stack tecnológico](#2-stack-tecnológico)
3. [Como rodar o projeto](#3-como-rodar-o-projeto)
4. [Variáveis de ambiente](#4-variáveis-de-ambiente)
5. [Estrutura de diretórios](#5-estrutura-de-diretórios)
6. [Backend (`/server`)](#6-backend-server)
7. [Camada de dados (`/server/db`)](#7-camada-de-dados-serverdb)
8. [Frontend (`/src`)](#8-frontend-src)
9. [Modelo de dados (tabelas)](#9-modelo-de-dados-tabelas)
10. [Autenticação e papéis](#10-autenticação-e-papéis)
11. [Funcionalidades especiais](#11-funcionalidades-especiais)
12. [Testes](#12-testes)
13. [Glossário rápido](#13-glossário-rápido)

---

## 1. Visão geral

Este é o **site institucional da Pró-Reitoria de Pós-Graduação (PRPG) da UFRPE**
(Universidade Federal Rural de Pernambuco). É uma aplicação **full-stack** que
funciona como um **CMS (sistema de gestão de conteúdo)** para a pós-graduação:
notícias, editais, resoluções, formulários, programas de pós-graduação,
calendários, teses/dissertações, FAQ, disciplinas, bolsas, páginas livres,
portarias e grupos de pesquisa.

Além do **site público da PRPG**, a aplicação oferece:

- Um **painel administrativo** (`/admin`) para gerir todo o conteúdo, com
  controle de acesso por papel (Administrator, Gestor, Gestor de Programa).
- **Microsites por programa** (`/<slug-do-programa>`): cada programa de
  pós-graduação pode ter seu próprio site dedicado, com identidade visual,
  menu e páginas próprias.
- Um **mini-sistema de Proficiência em Línguas**: inscrição de alunos,
  lançamento de notas e emissão de declaração em PDF.
- **Importação de dados do site antigo** (JSON do Drupal) para alunos e
  professores.

---

## 2. Stack tecnológico

| Camada | Tecnologia |
|--------|-----------|
| **Frontend** | React 19, React Router 7, Vite 8, TailwindCSS 4 |
| **Backend** | Node.js + Express 4 (ES Modules) |
| **Banco de dados** | PostgreSQL 16 (via Docker Compose) |
| **Autenticação** | JWT (`jsonwebtoken`) + hashing de senha (`bcryptjs`) |
| **Upload de arquivos** | Multer (PDF e imagens) |
| **Sanitização de HTML** | DOMPurify / isomorphic-dompurify |
| **Geração de PDF** | pdfkit (declaração de proficiência) |
| **Planilhas** | xlsx (leitura de dados de importação) |
| **Ícones / animação** | lucide-react, motion |
| **Testes** | Vitest + supertest |
| **Type checking** | TypeScript (apenas `--noEmit`, sem compilar) |

> Os arquivos JSON em `server/data/` **não** são mais o armazenamento ativo:
> servem apenas como **semente de migração** (seed) para popular o PostgreSQL.

---

## 3. Como rodar o projeto

### Pré-requisitos
- Node.js (versão compatível com Vite 8 / React 19)
- Docker + Docker Compose (para o PostgreSQL)

### Primeira execução

```bash
npm install                  # instala dependências
npm run db:up                # sobe o container PostgreSQL (porta 5433 no host)

# aplica o schema relacional no banco:
docker exec -i prpg-postgres psql -U prpg -d prpg < server/db/schema.sql

npm run db:migrate           # popula o banco a partir dos JSON em server/data
npm run dev                  # roda frontend (3000) + backend (5000)
```

É necessário um arquivo `.env` na raiz com pelo menos `JWT_SECRET` e
`DATABASE_URL` (ver [seção 4](#4-variáveis-de-ambiente)). O servidor **não inicia**
sem essas duas variáveis.

- **Frontend:** http://localhost:3000
- **API:** http://localhost:5000/api
- **Login admin:** `/admin/login`

### Scripts disponíveis (`package.json`)

| Comando | O que faz |
|---------|-----------|
| `npm run dev` | Roda frontend (3000) e backend (5000) ao mesmo tempo (`concurrently`) |
| `npm run dev:client` | Só o Vite (porta 3000) |
| `npm run dev:server` | Só o Express (porta 5000) |
| `npm run build` | Build de produção com Vite |
| `npm run preview` | Pré-visualiza o build de produção |
| `npm run lint` | Type checking TypeScript (`tsc --noEmit`) |
| `npm run db:up` | Sobe o PostgreSQL (Docker Compose) |
| `npm run db:down` | Para o PostgreSQL |
| `npm run db:migrate` | Recria as linhas do banco a partir dos JSON (faz TRUNCATE antes) |
| `npm test` | Roda a suíte Vitest (precisa do `db:up`; usa um banco isolado `prpg_test`) |
| `npm run test:watch` | Vitest em modo watch |

---

## 4. Variáveis de ambiente

Definidas no arquivo `.env` (ver `.env.example`). Lidas centralmente em
`server/config.js`:

| Variável | Obrigatória | Descrição |
|----------|:-----------:|-----------|
| `PORT` | não | Porta do Express. Padrão: `5000`. |
| `DATABASE_URL` | **sim** | Conexão PostgreSQL. Ex.: `postgres://prpg:prpg@localhost:5433/prpg`. Sem ela, o servidor encerra no boot. |
| `JWT_SECRET` | **sim** | Segredo para assinar tokens JWT. Mínimo 16 caracteres. Sem ele, o servidor encerra no boot. |
| `VITE_API_URL` | só prod | URL base da API lida pelo frontend em build (`src/api.js`). Vazio = `http://localhost:5000`. |
| `NODE_ENV` | não | `development` (padrão) ou `production`. Em produção, o CORS passa a restringir origens. |
| `CORS_ORIGINS` | só prod | Allowlist de origens separadas por vírgula (usada quando `NODE_ENV=production`). |

> **Segurança no boot** (`server/config.js`): se `JWT_SECRET` faltar/for curto,
> ou se `DATABASE_URL` faltar, o processo chama `process.exit(1)`. Isso é
> proposital ("fail fast"): evita rodar com configuração insegura.

---

## 5. Estrutura de diretórios

```
PRPG/
├── CLAUDE.md                 # Instruções do projeto para o assistente de IA
├── DOCUMENTACAO.md           # Este documento
├── README.md                 # (vazio/placeholder)
├── requisitos.md             # Requisitos / roadmap (microsites por programa)
├── reqs_full.txt             # Requisitos completos em texto
├── package.json              # Dependências e scripts npm
├── docker-compose.yml        # Container PostgreSQL (porta 5433 no host)
├── vite.config.ts            # Configuração do Vite (build/dev frontend)
├── vitest.config.js          # Configuração dos testes
├── tsconfig.json             # Configuração TypeScript (type-check)
├── index.html                # HTML raiz do SPA (ponto de montagem do React)
├── metadata.json             # Metadados do app
├── .env.example              # Modelo de variáveis de ambiente
│
├── server/                   # ===== BACKEND (Express) =====
│   ├── app.js                # App Express configurado (sem listen) — usado nos testes
│   ├── index.js              # Boot: checa o banco e dá listen()
│   ├── config.js             # Lê e valida variáveis de ambiente
│   ├── controllers/          # Lógica de cada tipo de conteúdo (CRUD)
│   ├── routes/               # Definição de todas as rotas da API
│   ├── middleware/           # Autenticação e autorização (JWT, papéis, escopo)
│   ├── db/                   # Camada de acesso ao PostgreSQL
│   ├── services/             # Serviços de domínio (ex.: importadores)
│   ├── scripts/              # Scripts utilitários (seed admin, migração de programas)
│   ├── utils/                # Utilitários (sanitização de HTML)
│   ├── data/                 # JSON seed (origem da migração; NÃO é o storage ativo)
│   ├── uploads/              # Arquivos enviados (PDFs/imagens), servidos em /uploads
│   └── __tests__/            # Testes (Vitest + supertest)
│
└── src/                      # ===== FRONTEND (React) =====
    ├── main.jsx              # Entrada do React (renderiza <App/>)
    ├── App.jsx               # Roteador principal (rotas públicas, admin e microsites)
    ├── api.js                # URL base da API
    ├── auth.js               # Helpers de sessão/escopo (papéis, gestor de programa)
    ├── style.css             # Estilos globais
    ├── styles/globals.css    # Estilos globais adicionais
    ├── programasData.js      # Dados estáticos de programas (apoio ao frontend)
    ├── data/nacionalidades.js# Lista de nacionalidades (cadastro de alunos)
    ├── hooks/useUsers.js     # Hook de acesso à lista de usuários
    ├── components/           # Componentes reutilizáveis (layout, UI, admin, microsite)
    ├── pages/                # Páginas públicas da PRPG
    ├── pages/admin/          # Páginas do painel administrativo
    └── pages/programa/       # Páginas do microsite de cada programa
```

---

## 6. Backend (`/server`)

### Pontos de entrada

| Arquivo | Função |
|---------|--------|
| **`app.js`** | Cria e configura o app Express: CORS (allowlist em produção via `CORS_ORIGINS`), `express.json({ limit: '2mb' })`, serve estáticos de `/uploads`, expõe `GET /api/status` e monta `adminRoutes` em `/api`. **Não** chama `listen()` — por isso pode ser importado diretamente nos testes. |
| **`index.js`** | Boot de produção/desenvolvimento: confere a conexão com o PostgreSQL (`SELECT 1`) e só então faz `app.listen(PORT)`. Se o banco falhar, encerra com instrução para subir o Docker. |
| **`config.js`** | Lê o `.env` e exporta `JWT_SECRET`, `DATABASE_URL`, `NODE_ENV`, `IS_PRODUCTION`, `CORS_ORIGINS`. Valida segredos no boot (fail fast). |

### Middleware (`server/middleware/authMiddleware.js`)

Funções de autenticação e autorização usadas nas rotas:

| Função | O que faz |
|--------|-----------|
| `protect` | Exige um JWT válido em `Authorization: Bearer <token>`. Popula `req.user`. Rejeita com 401 se faltar/for inválido. |
| `optionalProtect` | Popula `req.user` **se** houver token válido, mas **não** rejeita anônimos (rotas públicas com comportamento diferenciado por papel). |
| `requireRole(roles)` | Garante que `req.user` tenha pelo menos um dos papéis informados (senão 403). |
| `isProgramaScoped(user)` | `true` quando o usuário é **apenas** Gestor de Programa (sem poderes globais). |
| `scopeProgramaWrite` | Em POST/PUT, **força** `programaId` do gestor no corpo, ignorando o que o cliente enviar (defesa em profundidade). |
| `requireProgramaOwnership(getItem)` | Em PUT/DELETE por `:id`, garante que o gestor só toque em itens do **seu** programa. Recebe uma função que busca o item pelo id. |
| `requireSelfPrograma` | Para rotas cujo `:id` é o próprio programa: o gestor só age sobre o seu. |
| `blockProgramaScoped` | Bloqueia totalmente o Gestor de Programa de uma rota (ex.: criar/excluir programas, gerir usuários globais). |

### Rotas (`server/routes/adminRoutes.js`)

Arquivo único que define **toda a API**. Padrões principais:

- **Rotas públicas (GET):** `news`, `editais`, `resolucoes`, `formularios`,
  `programas` (e `programas/slug/:slug...`), `calendarios`, `taxonomias`,
  `linhas-pesquisa`, `taxonomia-refs`, `teses-dissertacoes`, `faq`,
  `disciplinas`, `bolsas`, `pages`.
- **Autenticação:** `POST /api/login`.
- **Upload:** `POST /api/upload` (qualquer usuário logado; Multer aceita PDF e
  imagens até 15 MB; nome do arquivo = timestamp + número aleatório).
- **Conteúdo vinculável a programa** (`news`, `editais`, `resolucoes`,
  `formularios`, `teses`, `faq`, `disciplinas`, `pages`): escrita protegida com
  `scopeProgramaWrite` + `requireProgramaOwnership`, permitindo ao Gestor de
  Programa gerir só o conteúdo do seu programa.
- **Conteúdo global da PRPG** (`programas`, `calendarios`, `bolsas`): escrita
  bloqueada ao Gestor de Programa via `blockProgramaScoped`.
- **Admin-only / Gestor:** `taxonomias`, `metricas`, `portarias`,
  `grupos-pesquisa`, `import`, usuários (criar/excluir) e proficiência (gestão).

> **Ordem importa:** as rotas específicas `/programas/:id/docentes`,
> `/programas/:id/comissoes`, etc., são declaradas **antes** da rota genérica
> `/programas/:id` para não serem "engolidas" por ela.

Há dois `multer` configurados: `upload` (disco, para uploads normais) e
`importUpload` (memória, para os JSONs de importação — parseados e descartados).

### Controllers (`server/controllers/`)

Cada controller concentra a lógica de negócio de um tipo de conteúdo. São
**finos**: chamam um repositório da camada de dados e mantêm validação,
sanitização de HTML, geração de slug e cálculo de status.

| Controller | Responsabilidade |
|------------|------------------|
| `authController.js` | `login`: valida e-mail+senha (`bcrypt.compare`), gera o JWT (30 dias) e, se o usuário for Gestor de Programa, anexa `{ id, nome, sigla, slug }` do programa ao token e à resposta. |
| `newsController.js` | CRUD de notícias (sanitiza o HTML do conteúdo). |
| `editaisController.js` | CRUD de editais; cálculo de status (aberto/encerrado) a partir das datas; suporte a erratas (JSONB) e ao flag `proficiencia`. |
| `resolucoesController.js` | CRUD de resoluções (documentos com link). |
| `formulariosController.js` | CRUD de formulários (documentos com link). |
| `programasController.js` | O mais complexo. CRUD de programas + microsite (slug, branding, páginas livres). Resolve coordenadores/docentes/discentes via vínculos, filtra campos sensíveis (CPF/SIAPE/telefone) para não-admins, gere comissões, métricas e linhas de pesquisa do programa. Gera slug único (evitando reservados). |
| `calendariosController.js` | CRUD de calendários; regra de "único calendário corrente" (`unsetCurrentExcept`) e tabela-filha de marcos (`milestones`). |
| `tesesController.js` | CRUD de teses/dissertações. |
| `faqController.js` | CRUD de perguntas frequentes. |
| `disciplinasController.js` | CRUD de disciplinas. |
| `bolsasController.js` | CRUD de bolsas. |
| `pagesController.js` | CRUD de páginas livres (rich-text); geração de slug; busca por slug (`/pages/slug/:slug`). |
| `portariasController.js` | CRUD de portarias (Admin/Gestor; leitura também ao Gestor de Programa). |
| `gruposPesquisaController.js` | CRUD de grupos de pesquisa (líderes em JSONB). |
| `metricasController.js` | CRUD do snapshot anual de indicadores por programa (dashboard). |
| `usersController.js` | CRUD de usuários: unicidade de e-mail/CPF, senha padrão, regras de papéis, escopo do Gestor de Programa. |
| `taxonomiasController.js` | Leitura/atualização das taxonomias (listas de valores por chave). |
| `taxonomiaRefsController.js` | CRUD das referências de taxonomia (mapeia `target_id` legado do Drupal → valor canônico). |
| `linhasPesquisaController.js` | CRUD das linhas de pesquisa (tabela própria) e associações N:M. |
| `proficienciaController.js` | Mini-sistema de proficiência: período aberto, inscrição, lançamento de nota, exclusão e **geração da declaração em PDF** (`pdfkit`). Regras de domínio: línguas válidas, níveis, cálculo do resultado. |
| `importController.js` | Lista os tipos de importação disponíveis e executa a importação do JSON do site antigo. |

### Serviços (`server/services/importers/`)

Importadores de dados do site antigo (Drupal). Cada importador expõe
`id, label, descricao, requiresPrograma, parse(buffer), map(raw), importOne(m, ctx)`.

| Arquivo | Função |
|---------|--------|
| `index.js` | Registro central dos importadores. Lista os implementados e placeholders ("em breve": notícias, disciplinas, teses). |
| `professoresImporter.js` | Importa professores do JSON antigo. |
| `alunosImporter.js` | Importa alunos do JSON antigo (resolve período de entrada e situação via `taxonomia_refs`). |

### Scripts (`server/scripts/`)

| Arquivo | Função |
|---------|--------|
| `seedAdmin.js` | Gera o `users.json` semente com um Admin (`admin@ufrpe.br` / senha `admin`). |
| `migrateProgramas.js` | Script de migração específica dos programas. |

### Utilitários (`server/utils/sanitize.js`)

- `sanitizeHtml(dirty)` — sanitiza HTML do editor antes de persistir (defesa em
  profundidade; o frontend também sanitiza ao renderizar).
- `sanitizeHtmlField(value)` — sanitiza string **ou** array de strings (ex.:
  `content` das notícias).
- `sanitizeDocsDesc(docs)` — sanitiza o campo `desc` de listas de documentos.
- `isPlainObject(v)` — checa se é objeto JSON "comum".

### Uploads (`server/uploads/`)

Pasta servida estaticamente em `/uploads`. Recebe PDFs e imagens enviados pelo
painel. Acessível em `http://localhost:5000/uploads/<arquivo>`.

### Dados seed (`server/data/`)

Arquivos JSON (news, editais, programas, pessoas, vínculos, modalidades, etc.)
usados **apenas** como origem da migração (`db:migrate`). Não são lidos em tempo
de execução pela aplicação.

---

## 7. Camada de dados (`/server/db`)

Toda a persistência vive no PostgreSQL. Esta pasta isola o acesso ao banco.

| Arquivo | Função |
|---------|--------|
| **`pool.js`** | Pool de conexões `pg` compartilhado + helper `query()`. |
| **`schema.sql`** | Schema relacional completo: uma tabela por tipo de conteúdo + tabelas-filhas (`calendario_milestones`) e o conjunto relacional `programas`/`pessoas`/`modalidades`/`vinculos`. Inclui blocos **idempotentes** (`ADD COLUMN IF NOT EXISTS`, `DO $$ ... $$`) para migrar bancos já existentes. |
| **`repository.js`** | Fábrica genérica `createRepository({ table, fromRow, toRow, orderBy })` para entidades de tabela única. Implementa `getAll`, `getById`, `create`, `update` (faz merge com o existente), `remove`. Decora as linhas com campos de auditoria (`criado_por`/`atualizado_por`). |
| **`repositories.js`** | Repositórios por entidade, com `fromRow`/`toRow` que convertem entre o **snake_case** das colunas e o **camelCase** que o frontend espera. Inclui repositórios especializados: `usersRepo` (busca por e-mail/CPF, escopo por programa), `calendariosRepo` (milestones), `metricasRepo`, `programaPaginasRepo` (upsert por seção), proficiência, taxonomias, linhas de pesquisa e `taxonomiaRefsRepo` (resolução de `target_id` legado). |
| **`migrate.mjs`** | Lê os JSON de `server/data/` e popula o banco usando os repositórios (faz TRUNCATE antes). |
| **`migrations/`** | Migrações datadas, espelhando os blocos idempotentes do schema, aplicadas em fases (ver abaixo). |

### Migrações (`server/db/migrations/`)

As migrações documentam a evolução do schema em **fases**:

| Arquivo | Fase |
|---------|------|
| `2026-06-13_programas_fase1.sql` | Fase 1 — situação, contato/localização e documentos do programa |
| `2026-06-13_vinculos_fase2.sql` | Fase 2 — período de mandato e motivo de encerramento dos vínculos |
| `2026-06-13_auditoria_fase3.sql` | Fase 3 — `criado_por`/`atualizado_por` em todas as entidades |
| `2026-06-13_metricas_fase4.sql` | Fase 4 — snapshot anual de indicadores (dashboard) |
| `2026-06-14_microsites_fase5.sql` | Fase 5 — microsite por programa (slug, branding, contato/redes) + `programa_id` no conteúdo |
| `2026-06-15_microsites_fase6.sql` | Fase 6 — evolução dos microsites |
| `2026-06-17_proficiencia.sql` | Tabelas de proficiência |
| `2026-06-17_editais_proficiencia.sql` | Flag `proficiencia` em editais (define o período de inscrição) |
| `2026-06-19_drop_programas_site.sql` | Remoção do campo `site` dos programas |

### Objetos JSONB (estruturas livres)

Alguns campos genuinamente aninhados ficam como JSONB em vez de tabelas:
`editais.erratas`, `grupos_pesquisa.field_lideres`,
`users.perfil_aluno` / `users.perfil_professor`, `programas.linhas` (migrada
depois para tabela própria), `taxonomias.meta`.

---

## 8. Frontend (`/src`)

SPA em React. O Vite serve em dev (porta 3000) e gera o build de produção.

### Núcleo

| Arquivo | Função |
|---------|--------|
| `main.jsx` | Ponto de entrada: monta `<App/>` dentro do `BrowserRouter`. |
| `App.jsx` | **Roteador central.** Define três blocos de rotas: (1) **Admin** (`/admin/...`, protegidas por `RequireAuth`), (2) **Microsite de programa** (`:programaSlug/*`), (3) **Site público** da PRPG (envolto em `PublicLayout`). |
| `api.js` | Exporta `API_URL` (lê `VITE_API_URL`, cai em `http://localhost:5000`). |
| `auth.js` | Helpers de sessão: lê token/papéis do `localStorage`, `hasRole`, `isPrpgAdmin`, `isProgramaGestor`, `getGestorPrograma`, `getScopedProgramaId`, `withProgramaScope` (anexa `?programa=<id>` às listagens do gestor). |
| `programasData.js` | Dados estáticos de apoio sobre programas. |
| `data/nacionalidades.js` | Lista de nacionalidades para o cadastro de alunos. |
| `hooks/useUsers.js` | Hook para carregar/usar a lista de usuários. |
| `style.css` / `styles/globals.css` | Estilos globais (TailwindCSS). |

### Componentes (`src/components/`)

| Arquivo | Função |
|---------|--------|
| `Navbar.jsx` / `Footer.jsx` | Cabeçalho e rodapé do site público. |
| `PublicLayout.jsx` | Casca do site público (Navbar + conteúdo + Footer). |
| `AdminLayout.jsx` | Casca do painel admin: sidebar com seções **Conteúdo** e **Administração**; a navegação muda para o Gestor de Programa (só vê o que pode gerir do seu programa). |
| `RequireAuth.jsx` | Protege rotas: exige login e, opcionalmente, papéis específicos (`allowedRoles`). |
| `SafeHtml.jsx` | Renderiza HTML sanitizado (DOMPurify no cliente). |
| `AuditInfo.jsx` | Mostra dados de auditoria (criado/atualizado por). |
| `admin/AdminUI.jsx` | Componentes de UI reutilizáveis do painel. |
| `admin/ConfirmModal.jsx` | Modal de confirmação (ex.: exclusões). |
| `admin/RichTextEditor.jsx` | Editor de texto rico (para páginas/grupos). |
| `admin/TaxonomiaRefManager.jsx` | Gestão das referências de taxonomia. |
| `admin/Toast.jsx` | Notificações (toasts) no painel. |
| `programa/ProgramaContext.jsx` | Context React que compartilha o programa carregado e helpers de path (`usePrograma`, `programaPath`) com as subpáginas do microsite. |
| `programa/ProgramaLayout.jsx` | Casca do microsite (header/menu/footer próprios do programa). |
| `programa/ProgramaUI.jsx` | Componentes de UI específicos do microsite. |

### Páginas públicas (`src/pages/`)

Páginas institucionais da PRPG. Exemplos:

- **Institucional:** `Home`, `Sobre`, `MissaoVisaoValores`, `Historico`,
  `EstruturaOrganizacional`, `Equipe`, `Financeiro`, `Reconhecimento`.
- **Conteúdo:** `Noticias` / `Noticia`, `Editais` / `Edital`, `Resolucoes`,
  `Formularios`, `CalendarioAcademico`, `ProgramasStrictoSensu`,
  `RelatoriosAutoavaliacao`, `Especializacao`, `ResidenciaProfissional`.
- **Internacionalização:** `SobreInternacionalizacao`, `AlunosEstrangeiros`,
  `MobilidadeEstudantil`, `CapesPrint`.
- **Outros:** `ProextPg`, `PageView` (renderiza páginas livres por slug em `/p/:slug`).

### Painel administrativo (`src/pages/admin/`)

Para cada tipo de conteúdo há tipicamente uma **lista** e um **formulário**:

| Conteúdo | Lista | Formulário |
|----------|-------|-----------|
| Notícias | `AdminNoticias` | `AdminNoticiaForm` |
| Editais | `AdminEditais` | `AdminEditalForm` |
| Resoluções | `AdminResolucoes` | `AdminResolucaoForm` |
| Formulários | `AdminFormularios` | `AdminFormularioForm` |
| Programas | `AdminProgramas` | `AdminProgramaForm` |
| Calendários | `AdminCalendarios` | `AdminCalendarioForm` |
| Teses | `AdminTesesList` | `AdminTeseForm` |
| FAQ | `AdminFaqList` | `AdminFaqForm` |
| Disciplinas | `AdminDisciplinasList` | `AdminDisciplinaForm` |
| Bolsas | `AdminBolsasList` | `AdminBolsaForm` |
| Páginas | `AdminPagesList` | `AdminPageForm` |
| Portarias | `AdminPortarias` | `AdminPortariaForm` |
| Grupos de Pesquisa | `AdminGruposPesquisa` | `AdminGrupoPesquisaForm` |
| Usuários | `AdminUsersList` | `AdminUserForm` |

Páginas especiais do painel:

- `AdminLogin` — tela de login.
- `AdminTaxonomias` — gestão das taxonomias.
- `AdminLinhasPesquisa` — gestão das linhas de pesquisa.
- `AdminMetricas` — dashboard de métricas anuais.
- `AdminImportacao` — importação de dados do site antigo.
- `AdminProficiencia` — gestão das inscrições e notas de proficiência.
- `ProficienciaInscricao` — inscrição do aluno na proficiência.
- **Subpáginas de programa:** `AdminProgramaDocentes`, `AdminProgramaDiscentes`,
  `AdminProgramaComissoes`, `AdminProgramaMetricas`, `AdminProgramaLinhas`,
  `AdminProgramaGestorLinhas`, `AdminProgramaPessoas`.

### Microsite do programa (`src/pages/programa/`)

Renderizado em `/<slug-do-programa>` por `ProgramaSite.jsx`, que:
1. Busca o programa por slug (`/api/programas/slug/:slug`).
2. Ajusta `<title>`, meta description e Open Graph dinamicamente.
3. Disponibiliza o programa via `ProgramaContext` e roteia as subpáginas.

| Página | Conteúdo |
|--------|----------|
| `ProgramaHome` | Home do microsite |
| `ProgramaSobre` | Sobre o programa |
| `ProgramaNoticias` / `ProgramaNoticia` | Notícias do programa |
| `ProgramaEditais` | Editais do programa |
| `ProgramaDisciplinas` | Disciplinas |
| `ProgramaTeses` | Teses e dissertações |
| `ProgramaFaq` | Perguntas frequentes |
| `ProgramaGrupos` | Grupos de pesquisa |
| `ProgramaDocumentos` | Resoluções/formulários/documentos |
| `ProgramaPessoas` | Corpo docente/equipe |
| `ProgramaComissoes` | Comissões |
| `ProgramaDiscentes` | Discentes |
| `ProgramaContato` | Contato (endereço, redes, mapa) |
| `ProgramaBusca` | Busca interna do microsite |

---

## 9. Modelo de dados (tabelas)

Definidas em `server/db/schema.sql`. IDs são **TEXT** (slugs/timestamps), não UUID.

| Tabela | Conteúdo |
|--------|----------|
| `users` | Usuários: e-mail, hash de senha, papéis (`TEXT[]`), perfil geral, dados acadêmicos, `perfil_aluno`/`perfil_professor` (JSONB), `programa_id` (gestor de programa). |
| `news` | Notícias (com `programa_id` opcional). |
| `editais` | Editais: datas, período, erratas (JSONB), resultados, flag `proficiencia`. |
| `resolucoes` / `formularios` | Documentos com link. |
| `calendarios` + `calendario_milestones` | Calendário acadêmico + marcos (tabela-filha, cascade delete). |
| `programas` | Programas de pós-graduação: identificação, situação, contato, documentos e **microsite** (slug, branding, redes, mapa). |
| `programa_paginas` | Páginas de texto livre por seção do microsite (uma linha por `programa_id` + `secao`). |
| `pessoas` | Pessoas (legado), referenciadas por vínculos. |
| `modalidades` | Modalidades de cada programa (mestrado/doutorado/profissional, nota CAPES). |
| `vinculos` | Vínculos pessoa↔programa (papel, portaria, mandato). `pessoa_id` é polimórfico (`users.id` ou `pessoas.id`). |
| `metricas_anuais` | Snapshot anual de indicadores por programa (1 linha por programa+ano). |
| `portarias` | Portarias. |
| `grupos_pesquisa` | Grupos de pesquisa (líderes em JSONB). |
| `teses_dissertacoes`, `faq`, `disciplinas`, `bolsas`, `pages` | Conteúdos diversos. |
| `taxonomias` | Configuração chave → lista de valores. |
| `linhas_pesquisa` + `programa_linhas_pesquisa` + `user_linhas_pesquisa` | Linhas de pesquisa e associações N:M com programas e usuários. |
| `taxonomia_refs` | Mapeia `target_id` legado do Drupal → valor canônico, por campo (resolução global ou por programa). |
| `proficiencia_periodos` | Períodos do exame de proficiência. |
| `inscricoes_proficiencia` | Inscrições dos alunos (línguas, comprovantes, nota, resultado). |

> Quase todas as tabelas de conteúdo têm `criado_por`/`atualizado_por` (auditoria, Fase 3).

---

## 10. Autenticação e papéis

### Fluxo de login
1. `POST /api/login` com `{ username (e-mail), password }`.
2. `authController` valida com `bcrypt.compare` e retorna um **JWT** (válido por 30 dias).
3. O frontend guarda `token`, `roles` e (se aplicável) `gestorPrograma` no `localStorage`.
4. Requisições protegidas enviam `Authorization: Bearer <token>`.

### Conteúdo do token JWT
```js
{ id, email, roles: string[], programaId: string | null }
```

### Papéis

| Papel | Alcance |
|-------|---------|
| **Administrator** | Acesso total a todo o conteúdo e à gestão de usuários. |
| **Gestor** | Gere a maior parte do conteúdo e usuários (alcance global da PRPG). |
| **GestorPrograma** | Gere **exclusivamente** o conteúdo do seu próprio programa. O painel filtra listagens por esse programa e esconde o seletor de programa nos formulários. |
| _Usuário comum_ | Vê conteúdo público; aluno pode se inscrever na proficiência. |

### Defesa em profundidade do Gestor de Programa
O escopo é aplicado em **três camadas**: no token (`programaId`), no backend
(`scopeProgramaWrite` força o `programaId`; `requireProgramaOwnership`/
`requireSelfPrograma` impedem tocar em outros programas) e no frontend
(`auth.js` filtra a navegação e as listagens).

---

## 11. Funcionalidades especiais

### Microsites por programa
Cada programa pode ter um site dedicado em `/<slug>` com identidade visual
(logo, cores, hero), contato/redes (WhatsApp, Instagram, Facebook, YouTube,
mapa) e páginas de texto livre por seção (`programa_paginas`). O slug é único e
evita conflito com rotas reservadas da PRPG (`/sobre`, `/editais`, etc.).

### Proficiência em Línguas
Mini-sistema de inscrição e declaração:
- O **período** de inscrição é controlado por um **edital** com `proficiencia=TRUE`.
- O aluno logado se inscreve (`POST /api/proficiencia/inscricoes`), anexando
  comprovante de residência (e de vínculo, se não for o titular) e escolhendo a(s)
  língua(s): **Mestrado** = 1; **Doutorado** = até 2; **estrangeiro** =
  Português + outra.
- Admin/Gestor lançam a nota (`PUT .../:id/nota`). Resultado calculado:
  `< 5` insuficiente, `5–7` suficiência, `≥ 7` proficiência.
- A **declaração em PDF** é gerada no servidor com `pdfkit`
  (`GET .../:id/declaracao`).

### Importação de dados do site antigo
Painel `Importação` (Admin/Gestor) recebe o JSON do Drupal antigo e importa
**alunos** e **professores**, resolvendo período de entrada e situação via
`taxonomia_refs`. O arquivo é processado em memória e descartado.

### Taxonomias e linhas de pesquisa
- `taxonomias` guarda listas de valores por chave.
- `taxonomia_refs` resolve IDs legados do Drupal para valores canônicos
  (com fallback global → específico do programa).
- `linhas_pesquisa` tem tabela própria, associada N:M a programas e usuários.

### Auditoria e métricas
- **Auditoria (Fase 3):** `criado_por`/`atualizado_por` registrados
  automaticamente pelos repositórios.
- **Métricas (Fase 4):** `metricas_anuais` guarda um snapshot anual por programa,
  exibido no dashboard (`AdminMetricas`).

---

## 12. Testes

- **Vitest + supertest**; testes em `server/__tests__/`.
- O app é importado de `server/app.js` (sem `listen`), permitindo testes HTTP diretos.
- `globalSetup.js` recria um banco isolado `prpg_test` e aplica o `schema.sql`;
  `helpers.js` trunca tabelas e cria um admin antes de cada teste. **O banco de
  desenvolvimento (`prpg`) nunca é tocado.**
- Requer o PostgreSQL do Docker rodando (`npm run db:up`).

Cobertura (~41 testes): autenticação, validação de entrada, sanitização de HTML,
CRUD de notícias, cálculo de status de editais, geração de slug de páginas,
taxonomias, programas (coordenador, filtragem de campos sensíveis, histórico,
cascade delete), usuários (unicidade, senha padrão, regras de papel, acesso),
autorização por papel, calendários (único corrente + milestones), grupos/teses,
proficiência e microsites de programa.

| Arquivo de teste | Foco |
|------------------|------|
| `api.test.js` | Rotas básicas da API |
| `authz.test.js` | Autorização por papel |
| `entities.test.js` | CRUD de entidades diversas |
| `gestor_programa.test.js` | Escopo do Gestor de Programa |
| `programas.test.js` | Regras de programas |
| `programas_microsite.test.js` | Microsites |
| `proficiencia.test.js` | Proficiência |
| `sanitize.test.js` | Sanitização de HTML |
| `users.test.js` | Usuários |
| `globalSetup.js` / `helpers.js` | Setup e utilitários de teste |

---

## 13. Glossário rápido

| Termo | Significado |
|-------|-------------|
| **PRPG** | Pró-Reitoria de Pós-Graduação da UFRPE. |
| **Microsite** | Site dedicado de um programa, em `/<slug>`, com identidade própria. |
| **Vínculo** | Relação pessoa↔programa (papel, portaria, mandato). |
| **Taxonomia** | Lista configurável de valores (categorias, períodos, situações). |
| **`taxonomia_refs`** | Tabela que mapeia IDs legados do Drupal a valores canônicos. |
| **Repositório** | Camada que isola o SQL e converte snake_case ↔ camelCase. |
| **Seed / migração** | Popular o banco a partir dos JSON em `server/data/`. |
| **Auditoria** | Registro de quem criou/atualizou cada item. |
| **Idempotente** | Bloco SQL que pode rodar várias vezes sem efeito duplicado. |

---

> **Convenções do código** (ver também `CLAUDE.md`):
> - IDs são slugs/timestamps (TEXT), não UUIDs.
> - Datas costumam ser TEXT no formato `'YYYY-MM-DD'`.
> - Controllers são finos; a lógica de banco fica nos repositórios.
> - HTML é sanitizado no servidor **e** no cliente (defesa em profundidade).
