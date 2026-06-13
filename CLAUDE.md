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
  - Controllers read/write directly from JSON files in `/server/data`
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
Each controller follows this standard structure:
```javascript
const getDataPath = () => path.join(__dirname, '../data/contentType.json');

const getData = async () => {
  try {
    const data = await fs.readFile(getDataPath(), 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
};

const saveData = async (data) => {
  await fs.writeFile(getDataPath(), JSON.stringify(data, null, 2));
};

export const getAll = async (req, res) => { /* ... */ };
export const getById = async (req, res) => { /* ... */ };
export const create = async (req, res) => { /* ... */ };
export const update = async (req, res) => { /* ... */ };
export const delete = async (req, res) => { /* ... */ };
```

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
- Returns: `{ url: "/uploads/filename", originalName: "..." }`

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
- Taxonomias (Category management, Admin only)

## Testing

- **Vitest + supertest**. Tests live in `server/__tests__/`.
- The Express app is split: `server/app.js` exports the configured `app` (no
  `listen`), and `server/index.js` does the DB boot check + `listen`. Tests
  import `app.js` directly via supertest.
- `globalSetup.js` drops/recreates an isolated `prpg_test` database and applies
  `schema.sql`; `helpers.js` truncates tables and seeds an admin before each test.
  The dev database (`prpg`) is never touched.
- Coverage: auth, input validation, HTML sanitization (unit + integration),
  news CRUD, editais status calc, pages slug generation, taxonomias,
  programas (coordinator resolution, sensitive-field filtering, coordinator
  history, cascade delete), users (uniqueness, default password, role rules,
  access control), role-based authorization, calendarios (single-current rule +
  milestones child table), grupos/teses reference resolution. ~41 tests.
- Requires the Docker Postgres running (`npm run db:up`).

## Important Implementation Notes

1. **Database layer**: Data lives in PostgreSQL. The data-access layer is in `server/db/`:
   - `pool.js`: shared `pg` connection pool (`query()` helper).
   - `schema.sql`: full relational schema (one table per content type; child tables
     `calendario_milestones`; relational set `programas`/`pessoas`/`modalidades`/`vinculos`).
   - `repository.js`: generic CRUD factory (`createRepository`) for single-table entities.
   - `repositories.js`: per-entity repos with `fromRow`/`toRow` mappers that convert
     between DB snake_case columns and the camelCase JSON the frontend expects.
   - `migrate.mjs`: seeds the DB from the JSON files.
   Controllers are thin: they call a repo and keep validation/sanitization/slug/status logic.
   A few genuinely free-form nested objects are stored as JSONB (`editais.erratas`,
   `grupos_pesquisa.field_lideres`, `users.perfil_aluno`/`perfil_professor`).

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

**Checking User Roles**:
- Admin users are defined in `server/data/users.json`
- Roles are array of strings: `["Administrator"]`, `["Gestor"]`, etc.
- Check auth middleware for role validation logic
