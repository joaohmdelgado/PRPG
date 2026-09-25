# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PRPG website for UFRPE (Universidade Federal Rural de Pernambuco) - a full-stack application for managing academic content and administrative information for the graduate school. The site serves as a content management system for news, editais (calls), resolutions, programs, and other academic information.

## Tech Stack

- **Frontend**: React 19 + React Router, Vite, TailwindCSS
- **Backend**: Express.js
- **Data Storage**: PostgreSQL (relational schema). Runs via Docker Compose. The
  legacy JSON files in `server/data/` are now only the migration seed/source.
- **Authentication**: JWT tokens with role-based access control
- **File Uploads**: Multer (PDF and image support)

## Development Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Run frontend (port 3000) and backend (port 5000) concurrently |
| `npm run dev:client` | Run Vite dev server on port 3000 only |
| `npm run dev:server` | Run Express server on port 5000 only |
| `npm run build` | Build production bundle with Vite |
| `npm run lint` | TypeScript type checking (no emit) |
| `npm run db:up` | Start the PostgreSQL container (Docker Compose) |
| `npm run db:down` | Stop the PostgreSQL container |
| `npm run db:migrate` | (Re)create rows in the DB from the JSON seed files (TRUNCATEs first) |
| `npm test` | Run the Vitest suite (needs `npm run db:up`; uses an isolated `prpg_test` DB) |
| `npm run test:watch` | Vitest in watch mode |

**First-time setup**: `npm install` → `npm run db:up` → apply schema
(`docker exec -i prpg-postgres psql -U prpg -d prpg < server/db/schema.sql`) →
`npm run db:migrate` → `npm run dev`. Requires a `.env` with `JWT_SECRET` and
`DATABASE_URL` (see `.env.example`).

**Development URL**: http://localhost:3000  
**API Base URL**: http://localhost:5000/api

## Architecture Overview

### Frontend Structure (`/src`)
- **pages/**: Individual page components (public-facing pages like Home, Sobre, Editais)
- **pages/admin/**: Admin panel pages (content management forms and lists)
- **components/**: Reusable React components
  - `AdminLayout.jsx`: Sidebar navigation for admin panel
  - `RequireAuth.jsx`: Auth protection wrapper
  - `Navbar.jsx` / `Footer.jsx`: Shared layout components
- **App.jsx**: Main router configuration with all routes defined

### Backend Structure (`/server`)
- **controllers/**: Business logic for each content type
  - Each controller exports standard CRUD operations: `get*`, `get*ById`, `create*`, `update*`, `delete*`
  - Controllers call a repository (`server/db/repositories.js`) backed by PostgreSQL —
    they do **not** read/write JSON directly (see Database layer below). The JSON files
    in `server/data/` are only the one-time migration seed for `npm run db:migrate`.
- **routes/adminRoutes.js**: All API route definitions
  - Public routes (GET): news, editais, resolucoes, formularios, programas, disciplinas, bolsas, faq, etc.
  - Protected routes: authenticated users with `protect` middleware
  - Admin-only routes: `requireRole(['Administrator', 'Gestor'])`
- **middleware/authMiddleware.js**: 
  - `protect`: Validates JWT token from `Authorization: Bearer <token>` header
  - `requireRole(roles)`: Checks user has one of the required roles
- **data/**: JSON files storing all content data

### Content Types & Controllers

| Type | Controller | Data File | Routes |
|------|-----------|-----------|--------|
| News/Notícias | newsController.js | news.json | `/api/news` |
| Editais (Calls) | editaisController.js | editais.json | `/api/editais` |
| Resolutions | resolucoesController.js | resolucoes.json | `/api/resolucoes` |
| Formulas | formulariosController.js | formularios.json | `/api/formularios` |
| Programs | programasController.js | programas.json | `/api/programas` |
| Calendars | calendariosController.js | calendarios.json | `/api/calendarios` |
| Teses/Dissertações | tesesController.js | teses_dissertacoes.json | `/api/teses-dissertacoes` |
| Disciplines | disciplinasController.js | disciplinas.json | `/api/disciplinas` |
| Scholarships (Bolsas) | bolsasController.js | bolsas.json | `/api/bolsas` |
| FAQ | faqController.js | faq.json | `/api/faq` |
| Custom Pages | pagesController.js | pages.json | `/api/pages` |
| Users | usersController.js | users.json | `/api/users` |
| Portarias | portariasController.js | portarias.json | `/api/portarias` (admin only) |
| Research Groups | gruposPesquisaController.js | grupos_pesquisa.json | `/api/grupos-pesquisa` (admin only) |
| Proficiência (línguas) | proficienciaController.js | tabela `inscricoes_proficiencia` (sem JSON seed) | `/api/proficiencia/*` |
| Câmara de Pós-Graduação | camaraController.js, camaraReunioesController.js | tabelas `processos`, `unidades`, `camara_atos`, `camara_eventos`, `camara_reunioes`, `camara_pauta_itens`, `camara_relatorias` (sem JSON seed) | `/api/camara/*` (admin only) |

**Proficiência em Línguas**: mini-sistema de inscrição e emissão de declaração.
O aluno logado se inscreve (`POST /api/proficiencia/inscricoes`) em um período
aberto, anexando comprovante de residência (+ comprovante de vínculo se não for
o titular) e escolhendo a(s) língua(s) — Mestrado: 1; Doutorado: até 2;
estrangeiro: Português + outra. Admin/Gestor gerenciam períodos, lançam a nota
(`PUT .../:id/nota` → resultado: 5–7 suficiência, >7 proficiência, <5
insuficiente) e geram a declaração em PDF no servidor via `pdfkit`
(`GET .../:id/declaracao`). O campo `estrangeiro`/`nacionalidade` foi adicionado
ao `perfil_aluno` (JSONB) no cadastro do usuário.

**Autenticação da declaração**: na 1ª emissão, a declaração recebe um
`codigo_verificacao` (UUID, `crypto.randomUUID()`) e uma data `emitida_em`
congelada (ambos em `inscricoes_proficiencia`); reemissões reaproveitam os
mesmos valores, tornando o PDF reproduzível. O PDF imprime um **QR code**
(lib `qrcode`) + o link/código apontando para `PUBLIC_SITE_URL` (env, default
`http://localhost:3000`) na rota pública `/declaracoes/proficiencia/:codigo`
(`src/pages/DeclaracaoProficiencia.jsx`). Essa página consome o endpoint público
`GET /api/proficiencia/declaracoes/:codigo` (`verificarDeclaracao`), que reexibe
os dados canônicos (nome, **CPF mascarado**, língua, resultado, nota, validade
de 4 anos) para conferência contra o papel.

**Câmara de Pós-Graduação**: controle de processos administrativos do colegiado
(`processos`, chave = NUP), com histórico append-only (`camara_eventos`),
reuniões/pauta (`camara_reunioes`/`camara_pauta_itens`), relatorias
(`camara_relatorias`) e atos resultantes (`camara_atos`). Ver `requisitos-camara.md`
na raiz do repositório para o levantamento completo (Fases 0-1 implementadas;
o importador da planilha histórica ainda não existe — ver `PLANO.md` §2.2).

## Roadmap e arquitetura de dados

O trabalho de reconstrução do schema e os próximos mini-sistemas (agenda de
contatos, expedientes/numeração de atos, PNPD) estão planejados em `PLANO.md`
(índice único de execução) e detalhados em `arquitetura-dados.md` (schema
alvo) e `requisitos-camara.md`/`requisitos-contatos.md`/`requisitos-expedientes.md`/
`requisitos-pnpd.md` (um por assunto). Consulte `PLANO.md` §17 (Registro de
execução) para o estado atual de cada fase antes de assumir que algo já foi
feito ou ainda não.

## Authentication & Authorization

**Roles**:
- `Administrator`: Full access to all content and user management
- `Gestor`: Can manage most content and users
- Regular users: Can view public content and create/edit their own content

**JWT Token Format**:
```javascript
{
  id: string,
  username: string,
  email: string,
  roles: string[] // e.g., ['Administrator'] or ['Gestor']
}
```

**Using Protected Routes**:
- All POST/PUT/DELETE routes require JWT token
- Include token in request headers: `Authorization: Bearer <token>`
- Token stored in localStorage as `token` in the admin panel
- Login endpoint: `POST /api/login` returns JWT token

## Key Patterns & Conventions

### Controller Pattern
Most controllers are thin wrappers around a repository from `server/db/repositories.js`
(built with the generic `createRepository` factory in `server/db/repository.js`):
```javascript
// server/db/repositories.js
export const newsRepo = createRepository({
  table: 'news',
  fromRow: (r) => ({ /* snake_case row -> camelCase API shape */ }),
  toRow: (o) => ({ /* camelCase API shape -> snake_case row */ }),
});

// server/controllers/newsController.js
export const getAll = async (req, res) => res.json(await newsRepo.getAll());
export const getById = async (req, res) => { /* newsRepo.getById(req.params.id) */ };
export const create = async (req, res) => { /* validate/sanitize, then newsRepo.create(data, req.user?.id) */ };
export const update = async (req, res) => { /* newsRepo.update(id, data, req.user?.id) */ };
export const delete = async (req, res) => { /* newsRepo.remove(id) */ };
```
Controllers that don't fit the single-table CRUD shape (Câmara, Programas' vínculos)
issue raw SQL via `server/db/pool.js`'s `query()` helper instead.

### Common Data Fields
Most content items use:
- `id`: Unique identifier (auto-generated from title or UUID)
- `title` or `name`: Primary label
- `description` or `excerpt`: Short summary
- `content`: Full content (may be array of paragraphs)
- `date`: Publication/creation date
- `author`: Creator name
- `category`/`categorySlug`: For filtering content

### File Uploads
- Endpoint: `POST /api/upload` (requires authentication)
- Accepts: PDF files, images (PNG, JPG, etc.)
- File size limit: 15MB
- Returns: `{ id, url: "/uploads/filename", originalName: "..." }` — `id` references
  the new `arquivos` row (registered on every upload since Fase A.5); nothing
  consumes it yet, `url`/`originalName` are unchanged.

## Environment Configuration

Create `.env` file in project root (see `.env.example`):
```
PORT=5000
JWT_SECRET=<long random string, min 16 chars>   # server refuses to boot without it
DATABASE_URL=postgres://prpg:prpg@localhost:5433/prpg
VITE_API_URL=                                    # prod only; empty uses localhost:5000
NODE_ENV=development                             # production restricts CORS
CORS_ORIGINS=                                    # comma-separated allowlist (prod)
```

`JWT_SECRET` and `DATABASE_URL` are required — the server exits at boot if either
is missing. `VITE_API_URL` is read by the frontend (`src/api.js`) at build time.

## Admin Panel Navigation

Access at `/admin/login`. Main sections in sidebar:
- Notícias (News)
- Editais
- Resoluções
- Formulários
- Programas
- Calendários
- Teses-Dissertações
- FAQ
- Disciplinas
- Bolsas
- Páginas (Custom pages)
- Portarias (Admin only)
- Grupos de Pesquisa (Admin only)
- Usuários (User management, Admin only)
- Classificações (editable categories/sections — `vocabularios`; ex-Taxonomias)
- Biblioteca de Mídia (`/admin/midia` — reuse, "where used", replace a file everywhere)

## Testing

- **Vitest + supertest**. Tests live in `server/__tests__/`.
- The Express app is split: `server/app.js` exports the configured `app` (no
  `listen`), and `server/index.js` does the DB boot check + `listen`. Tests
  import `app.js` directly via supertest.
- `globalSetup.js` drops/recreates an isolated `prpg_test` database and applies
  `schema.sql`; `helpers.js` empties the tables (`DELETE` over `RESET_TABLES`, not
  `TRUNCATE` — the comment in `resetDb()` explains why) and seeds an admin before
  each test. A new table or sequence must be added to `RESET_TABLES` /
  `RESET_SEQUENCES` in `helpers.js`; `resetDb.test.js` fails otherwise. The dev
  database (`prpg`) is never touched.
- Coverage: auth, input validation, HTML sanitization (unit + integration),
  news CRUD, editais status calc, pages slug generation, taxonomias,
  programas (coordinator resolution, sensitive-field filtering, coordinator
  history, cascade delete), users (uniqueness, default password, role rules,
  access control), role-based authorization, calendarios (single-current rule +
  milestones child table), grupos/teses reference resolution, Câmara, atos,
  pós-doc, contatos, prazos, notificações, indicadores, and `robustez.test.js`
  (async errors never crash the process, pg data errors -> 400/409, news
  dates, origin filter, users/resumo, compression/cache), and the editorial
  foundation (`publicacao`, `vocabularios`, `arquivos`, `revisoes`). ~290 tests
  in 38 files — the exact number drifts; check with `npx vitest run`.
- Requires the Docker Postgres running (`npm run db:up`).

## Important Implementation Notes

1. **Database layer**: Data lives in PostgreSQL. The data-access layer is in `server/db/`:
   - `pool.js`: shared `pg` connection pool (`query()` helper). Also installs a type
     parser so `DATE` columns come back as plain `'YYYY-MM-DD'` strings, not `Date`
     objects (avoids timezone-shift bugs — see `utils/datas.js`).
   - `schema.sql`: full relational schema, written as a consolidated baseline (not
     incremental migrations — see `migrations/arquivo/` for the historical ones).
     Core/shared tables (reused across modules, not owned by one feature):
     `pessoas` (identity — `users.pessoa_id` links a login to one), `unidades`
     (org units), `arquivos`/`anexos` (uploads + polymorphic attachment),
     `contatos` (polymorphic contact info), `eventos` (polymorphic append-only
     timeline), `ato_series`/`atos`/`ato_referencias`/`documentos` (numbered
     administrative acts vs. plain downloadable documents), `declaracoes`
     (verifiable documents with a public code). Most of these exist as
     infrastructure with no consumer yet — see `PLANO.md` for which phase wires
     each one up.
   - `repository.js`: generic CRUD factory (`createRepository`) for single-table entities.
   - `repositories.js`: per-entity repos with `fromRow`/`toRow` mappers that convert
     between DB snake_case columns and the camelCase JSON the frontend expects.
   - `migrate.mjs`: seeds the DB from the JSON files (TRUNCATEs first — seeds
     `programas` before the content tables that now have a real FK to it).
   - `core.js`, `anexosRepo.js`, `eventosRepo.js`, `atosRepo.js`, `contatosRepo.js`,
     `backfill-pessoas.mjs`: repositories/helpers for the tables above.
   Controllers are thin: they call a repo and keep validation/sanitization/slug/status logic.
   A few genuinely free-form nested objects are stored as JSONB (`editais.erratas`,
   `grupos_pesquisa.field_lideres`, `users.perfil_aluno`/`perfil_professor`).
   Shared utilities live in `server/utils/`: `cpf.js`, `nup.js`, `datas.js`,
   `vigencia.js`, `contato.js` — validation/normalization is a warning
   (`*_valido = false`), never a hard block, since real historical data doesn't
   always fit the format.

2. **ID Generation**: IDs are typically slug-based (derived from title) rather than UUIDs. Look at individual controllers for their specific ID generation strategy.

3. **Content Slugs**: Many controllers generate slug versions of titles for URLs. Check controller for `generateSlug()` or similar patterns.

4. **Image URLs**: External image URLs from public sources are stored directly in JSON. Local uploads use `/uploads/` path.

5. **TypeScript Config**: The project uses TypeScript for type checking but compiles to JavaScript (ES modules). Type-only imports are used to avoid circular dependencies.

6. **CORS**: Backend has CORS enabled for all origins. Restrict this in production by modifying `cors()` in `server/index.js`.

7. **Static File Serving**: Upload folder is served statically at `/uploads` - files uploaded to `server/uploads/` are accessible at `http://localhost:5000/uploads/filename`.

## Vite Configuration Notes

- Alias `@` points to project root
- TailwindCSS integrated via `@tailwindcss/vite` plugin
- GEMINI_API_KEY defined at build time via Vite's define option
- HMR can be disabled via `DISABLE_HMR=true` environment variable
- Hot Module Replacement enabled by default for development

## Common Development Tasks

**Adding a New Content Type**:
1. Create controller: `server/controllers/newTypeController.js` with standard CRUD functions
2. Create data file: `server/data/newType.json` with sample array
3. Add routes in `server/routes/adminRoutes.js`
4. Create frontend pages in `src/pages/` (public view) and `src/pages/admin/` (management)
5. Add routes in `src/App.jsx`
6. Add navigation link in `src/components/AdminLayout.jsx`

**Testing API Routes**:
Use REST client (VS Code REST extension, Insomnia, or Postman) or cURL:
```bash
# Get all news
curl http://localhost:5000/api/news

# Login
curl -X POST http://localhost:5000/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password"}'

# Create news (requires token)
curl -X POST http://localhost:5000/api/news \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test","content":"..."}'
```

**Publishable content (Fase F, `docs/revisao-portal-conteudo-2026-09-24.md`)**:
the 11 content tables share a publication envelope (`status`
RASCUNHO/PUBLICADO/ARQUIVADO, `publicado_em`, `criado_em`/`atualizado_em`) —
`createRepository({ publicavel: true })` maps it; public visibility rules live
in `server/utils/publicacao.js`. Sending `_versao` (the loaded `atualizado_em`)
on update makes a concurrent edit fail with 409. Every update of such content
keeps the previous version in `revisoes` (`server/db/revisoesRepo.js`,
`/api/revisoes/:entidade/:id`). Listings accept `?page=&limit=` →
`{items,total,page,limit,pages}` (see `server/utils/listagem.js`).

**Checking User Roles**:
- Admin users are defined in `server/data/users.json`
- Roles are array of strings: `["Administrator"]`, `["Gestor"]`, etc.
- Check auth middleware for role validation logic
