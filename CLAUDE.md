# CLAUDE.md

This file provides context for Claude Code when working on this project.

## Project Overview

Linear Clone — a full-stack issue tracking application inspired by Linear. Manages projects, issues, cycles (sprints), labels, and members with JWT-based authentication (local + Google SSO).

**Repository:** Alwinkunjachan/ticket_raising_application

## Tech Stack

- **Frontend:** Angular 19 (standalone components, signals), Angular Material 19, TypeScript 5.7
- **Backend:** Express 4, TypeScript 5.7, Sequelize 6 (ORM), Zod (validation)
- **Auth:** Passport.js (passport-local + passport-google-oauth20), JWT (access + refresh tokens), bcryptjs
- **Database:** PostgreSQL (`linear_clone`)
- **Tooling:** Angular CLI, Nodemon, ts-node

## Project Structure

```
├── client/              # Angular 19 SPA
│   └── src/app/
│       ├── core/        # AuthService, ApiService, ThemeService, interceptors, guards, models
│       ├── features/    # auth/, issues/, projects/, cycles/, labels/ (lazy-loaded)
│       ├── layout/      # LayoutComponent, SidebarComponent, ToolbarComponent
│       └── shared/      # Reusable components and pipes
├── server/              # Express API
│   └── src/
│       ├── config/      # database.ts, environment.ts, passport.ts
│       ├── controllers/ # auth, project, issue, cycle, label, member
│       ├── middleware/   # authenticate.ts, validate.ts, error-handler.ts
│       ├── models/      # Sequelize models (Project, Issue, Cycle, Member, Label, IssueLabel)
│       ├── routes/      # Route definitions (auth routes are public, rest require JWT)
│       ├── services/    # Business logic layer
│       └── utils/       # api-error.ts, jwt.ts
└── docs/                # ARCHITECTURE.md, API.md, DATABASE.md, FRONTEND.md, SETUP.md
```

## Common Commands

### Server (from `server/`)
```bash
npm run dev          # Start dev server with nodemon (port 3000)
npm run build        # Compile TypeScript to dist/
npm start            # Run compiled production build
npx tsc --noEmit     # Type-check without emitting
```

### Client (from `client/`)
```bash
ng serve             # Start dev server (port 4200)
ng build             # Production build to dist/client/
ng test              # Run unit tests via Karma
```

## Environment

Server environment lives in `server/.env` (see `.env.example` at root). Key variables:
- `DB_*` — PostgreSQL connection
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` — JWT signing secrets
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` — Google OAuth (optional; leave empty to disable)
- `CLIENT_URL` — Angular app URL for CORS and OAuth redirects (default: `http://localhost:4200`)

## Architecture Patterns

### Backend
- **Layered:** Routes → Middleware (authenticate + validate) → Controllers → Services → Models
- **Auth flow:** `/api/v1/auth/*` routes are public; all other `/api/v1/*` routes are protected by global `authenticate` middleware in `routes/index.ts`
- **Validation:** Zod schemas defined inline in route files, applied via `validate()` middleware
- **Error handling:** Custom `ApiError` class (400, 401, 404, 409, 500) caught by `errorHandler` middleware
- **Member model:** Has `defaultScope` excluding `passwordHash`; use `Member.scope('withPassword')` when verifying passwords
- **Database sync:** `sequelize.sync({ alter: true })` in development — tables auto-update on schema changes

### Frontend
- **All components are standalone** (no NgModules)
- **State management:** Angular Signals (no NgRx)
- **Auth state:** `AuthService` manages `currentMember` and `isAuthenticated` signals, tokens in `localStorage`
- **HTTP interceptor:** `authInterceptor` in `app.config.ts` attaches Bearer tokens and handles 401 refresh
- **Route guards:** `authGuard` on LayoutComponent (all app routes), `guestGuard` on login page
- **Lazy loading:** All feature routes (`auth`, `issues`, `projects`, `cycles`, `labels`) are lazy-loaded

## Database

PostgreSQL database `linear_clone` with 6 tables: `projects`, `issues`, `cycles`, `members`, `labels`, `issue_labels`.

Auto-synced on startup. Default seed: 3 members with password `password123` (bcrypt-hashed).

Key associations:
- Project hasMany Issues, Cycles
- Issue belongsTo Project, Member (assignee), Cycle; belongsToMany Labels (through IssueLabel)
- Member has auth fields: `password_hash`, `google_id`, `provider` ('local' | 'google')

## Testing Notes

- No automated test suite beyond Angular's default Karma scaffold
- Backend can be tested with `curl` or Postman — start with `POST /api/v1/auth/login` to get a token
- Frontend builds can be verified with `ng build` (check for compilation errors)
- Server type-checking: `cd server && npx tsc --noEmit`

## Conventions

- TypeScript strict mode in both client and server
- Server uses `underscored: true` in Sequelize (camelCase in code → snake_case in DB)
- All server controllers are classes with a singleton export (`export const fooController = new FooController()`)
- All server services follow the same singleton class pattern
- Frontend services use `@Injectable({ providedIn: 'root' })` pattern
- Material Design throughout — use Angular Material components for any new UI
- CSS custom properties for theming (`--sidebar-bg`, `--text-primary`, `--accent-primary`, etc.)
- Dark/light theme via `html.light-theme` CSS class toggle
