# CLAUDE.md

This file provides context for Claude Code when working on this project.

## Project Overview

Sprintly — a full-stack issue tracking application inspired by Linear. Manages projects, issues, cycles (sprints), labels, and members with JWT-based authentication (local + Google SSO), role-based access control, and an admin analytics dashboard.

**Repository:** Alwinkunjachan/ticket_raising_application

## Tech Stack

- **Frontend:** Angular 19 (standalone components, signals), Angular Material 19, TypeScript 5.7
- **Backend:** Express 4, TypeScript 5.7, Sequelize 6 (ORM), Zod (validation)
- **Auth:** Passport.js (passport-local + passport-google-oauth20), JWT (access + refresh tokens), bcryptjs
- **Security:** Helmet.js (security headers), express-rate-limit, login attempt limiting (5 attempts, 30-min auto-unlock)
- **Caching:** Redis (ioredis) with cache-aside pattern, graceful degradation when unavailable
- **Database:** PostgreSQL (`sprintly`)
- **Tooling:** Angular CLI, Nodemon, ts-node

## Project Structure

```
├── client/              # Angular 19 SPA
│   └── src/app/
│       ├── core/        # AuthService, ApiService, ThemeService, IdleService, interceptors, guards, models
│       ├── features/    # auth/, issues/, projects/, cycles/, labels/, settings/ (lazy-loaded)
│       ├── layout/      # LayoutComponent, SidebarComponent, ToolbarComponent
│       └── shared/      # Reusable components, pipes, dialogs (idle-timeout, confirm)
│   └── src/environments/  # Build-time config (environment.ts for dev, environment.prod.ts for prod)
├── server/              # Express API
│   └── src/
│       ├── config/      # database.ts, environment.ts, passport.ts, redis.ts
│       ├── controllers/ # auth, analytics, project, issue, cycle, label, member
│       ├── middleware/   # authenticate.ts, admin.ts, validate.ts, error-handler.ts
│       ├── models/      # Sequelize models (Project, Issue, Cycle, Member, Label, IssueLabel)
│       ├── routes/      # Route definitions (auth routes public, analytics admin-only, rest require JWT)
│       ├── services/    # Business logic layer (incl. analytics.service.ts)
│       └── utils/       # api-error.ts, jwt.ts, cache.ts
│   └── scripts/         # migrate.ts (database setup script)
├── docker-compose.yml   # Multi-service Docker orchestration
└── docs/                # ARCHITECTURE.md, API.md, DATABASE.md, FRONTEND.md, SETUP.md, REDIS.md, DOCKER.md
```

## Common Commands

### Server (from `server/`)
```bash
npm run dev          # Start dev server with nodemon (port 3000)
npm run build        # Compile TypeScript to dist/
npm start            # Run compiled production build
npm run db:setup     # Create database, tables, seed admin + labels
npx tsc --noEmit     # Type-check without emitting
```

### Client (from `client/`)
```bash
ng serve             # Start dev server (port 4200)
ng build             # Production build to dist/client/
ng test              # Run unit tests via Karma
```

### Docker (from project root)
```bash
docker compose up -d --build     # Build and start all services
docker compose run --rm migrate  # Run database migration
docker compose down              # Stop all services
docker compose logs -f server    # Tail server logs
```

## Environment

Server environment lives in `server/.env` (see `.env.example` at root). Key variables:
- `DB_*` — PostgreSQL connection
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` — JWT signing secrets (required in production)
- `SESSION_SECRET` — Express session secret (required in production)
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` — Google OAuth (optional; leave empty to disable)
- `CLIENT_URL` — Angular app URL for CORS and OAuth redirects (default: `http://localhost:4200`)
- `REDIS_URL` — Redis connection URL (optional; default: `redis://localhost:6379`; app degrades gracefully without it)

Migration script also supports: `ADMIN_EMAIL`, `ADMIN_NAME`, `ADMIN_PASSWORD` (for overriding default admin seed).

## Architecture Patterns

### Backend
- **Layered:** Routes → Middleware (helmet + rate-limit + authenticate + validate) → Controllers → Services → Cache (Redis) → Models
- **Security middleware:** `helmet()` for headers, global rate limit (100/15min in prod, 1000 in dev), auth-specific rate limit (10/15min in prod, 100 in dev)
- **Auth flow:** `/api/v1/auth/*` routes are public; all other `/api/v1/*` routes are protected by global `authenticate` middleware in `routes/index.ts`
- **Admin routes:** `requireAdmin` middleware on `/analytics/dashboard`, `/members/users`, `/members/:id/toggle-block`
- **Login attempt limiting:** 5 failed attempts auto-blocks the account (`blockedReason: 'max_attempts'`); auto-unlocks after 30 minutes. Admin blocks (`blockedReason: 'admin'`) never auto-unlock.
- **Validation:** Zod schemas defined inline in route files, applied via `validate()` middleware
- **Error handling:** Custom `ApiError` class (400, 401, 404, 409, 500) caught by `errorHandler` middleware
- **Member model:** Has `defaultScope` excluding `passwordHash`; use `Member.scope('withPassword')` when verifying passwords
- **Database setup:** Via `npm run db:setup` migration script (no sequelize.sync on startup)
- **Caching:** Redis cache-aside pattern via `server/src/utils/cache.ts`. Read endpoints check cache first; write endpoints invalidate related keys. Graceful degradation — all cache ops no-op if Redis is unavailable. Key pattern: `sprintly:{entity}:{identifier}`. TTLs: 2min (issues), 5min (projects/cycles/auth member), 10min (members/analytics), 1hr (labels).
- **Pagination:** Issue and project list endpoints support `page`/`pageSize` query params. When present, return `{ data, total, page, pageSize }` instead of plain arrays. Max 100 per page. Frontend uses `MatPaginator`.
- **Production enforcement:** Server crashes on startup if `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `SESSION_SECRET`, or `DB_PASSWORD` are missing

### Frontend
- **All components are standalone** (no NgModules)
- **State management:** Angular Signals (no NgRx)
- **Auth state:** `AuthService` manages `currentMember`, `isAuthenticated`, `isAdmin` signals, tokens in `localStorage`. Exposes `authReady` Promise that resolves when initial auth check completes.
- **Startup auth:** `loadStoredAuth()` uses native `fetch()` (not HttpClient) to avoid interceptor loops. Tries access token → if expired, refreshes → if both fail, clears tokens.
- **HTTP interceptor:** `authInterceptor` in `app.config.ts` attaches Bearer tokens and handles 401 refresh for regular API calls (NOT used during startup auth check)
- **Route guards:** `authGuard` (sync localStorage check), `guestGuard` (sync localStorage check), `adminGuard` (async, awaits `authReady`), `roleRedirectGuard` (async, awaits `authReady`)
- **Role-based routing:** Admin → `/issues` (All Issues), Normal user → `/my-issues` (only assigned issues, no assignee filter)
- **Idle timeout:** `IdleService` tracks activity, shows session expiring dialog after 10 min idle with 30-sec countdown
- **Lazy loading:** All feature routes (`auth`, `issues`, `projects`, `cycles`, `labels`, `settings`) are lazy-loaded
- **Environment config:** `client/src/environments/` — `environment.ts` (dev: `http://localhost:3000/api/v1`), `environment.prod.ts` (prod: `/api/v1` relative). `angular.json` uses `fileReplacements` to swap in prod builds.

## Docker

Multi-service Docker Compose setup: nginx (Angular SPA + API proxy on port 80), Express API (port 3000), PostgreSQL, Redis. Environment configured via root `.env` (template: `.env.docker`). nginx reverse-proxies `/api/*` to the server container. Angular production build uses relative API URLs.

## Database

PostgreSQL database `sprintly` with 6 tables: `projects`, `issues`, `cycles`, `members`, `labels`, `issue_labels`.

Created via `npm run db:setup`. Default seed: admin user + 8 labels.

Key associations:
- Project hasMany Issues, Cycles
- Issue belongsTo Project, Member (assignee), Cycle; belongsToMany Labels (through IssueLabel)
- Member fields: `password_hash`, `google_id`, `provider`, `role` ('admin'|'user'), `blocked`, `failed_login_attempts`, `blocked_reason`, `blocked_at`

## Conventions

- TypeScript strict mode in both client and server
- Server uses `underscored: true` in Sequelize (camelCase in code → snake_case in DB)
- All server controllers are classes with a singleton export (`export const fooController = new FooController()`)
- All server services follow the same singleton class pattern
- Frontend services use `@Injectable({ providedIn: 'root' })` pattern
- Material Design throughout — use Angular Material components for any new UI
- CSS custom properties for theming (`--sidebar-bg`, `--text-primary`, `--accent-primary`, etc.)
- Dark/light theme via `html.light-theme` CSS class toggle
- Database logging is disabled; SQL queries are not printed to console
