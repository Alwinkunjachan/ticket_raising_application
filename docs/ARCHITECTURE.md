# Architecture

## Overview

The application follows a **client-server architecture** with a clear separation between the Angular single-page application (SPA) and the Express.js REST API. Communication happens over HTTP with JSON payloads.

```
┌─────────────────────┐         ┌─────────────────────┐         ┌──────────────┐
│   Angular Client    │  HTTP   │   Express API       │  SQL    │  PostgreSQL  │
│   (Port 4200)       │ ──────> │   (Port 3000)       │ ──────> │  Database    │
│                     │  JSON   │                     │         │              │
└─────────────────────┘         └──────────┬──────────┘         └──────────────┘
                                           │ Cache
                                    ┌──────┴──────┐
                                    │    Redis    │
                                    │  (Port 6379)│
                                    └─────────────┘
```

## Design Principles

1. **Standalone Components** - Angular components are standalone (no NgModules), reducing boilerplate and improving tree-shaking
2. **Lazy Loading** - Feature routes are lazy-loaded for optimal bundle size
3. **Service Layer** - Backend separates controllers (HTTP) from services (business logic)
4. **Validation at Boundaries** - Zod schemas validate all incoming API requests
5. **JWT Authentication** - Stateless access/refresh token pair with Passport.js strategies
6. **Convention over Configuration** - Consistent naming and structure across both layers

## Frontend Architecture

### Component Hierarchy

```
AppComponent
├── LoginComponent              (/auth/login — public)
├── GoogleCallbackComponent     (/auth/google/callback — public)
└── LayoutComponent             (/ — protected by authGuard)
    ├── SidebarComponent
    │   └── SidebarNavItemComponent (repeated)
    ├── ToolbarComponent (user menu + logout)
    └── <router-outlet>
        ├── IssueListComponent
        │   └── IssueRowComponent (repeated)
        ├── IssueDetailComponent
        ├── ProjectListComponent
        ├── ProjectDetailComponent
        │   ├── IssueListComponent (reused)
        │   └── CycleListComponent
        ├── CycleDetailComponent
        │   └── IssueListComponent (reused)
        └── LabelListComponent
```

### State Management

The application uses **Angular Signals** for reactive state management instead of a centralized store (NgRx/Akita). Each feature service manages its own state:

- Services fetch data via `ApiService` and expose it to components
- Components use signals and computed properties for derived state
- No global store - state is scoped to feature boundaries
- `AuthService` manages global auth state via signals (`currentMember`, `isAuthenticated`)

### Module Organization

```
src/app/
├── core/              # Singleton services, models, guards, interceptors
│   ├── models/        # TypeScript interfaces and DTOs (incl. auth.model.ts)
│   ├── services/      # ApiService, AuthService, ThemeService, NotificationService
│   ├── interceptors/  # authInterceptor (JWT attachment + 401 refresh)
│   └── guards/        # authGuard, guestGuard
├── environments/      # Build-time configuration (dev vs prod API URL)
├── features/          # Feature-scoped components and services
│   ├── auth/          # Login/Register page, Google callback
│   ├── issues/        # Issue CRUD, filtering, detail view
│   ├── projects/      # Project management
│   ├── cycles/        # Sprint/cycle management
│   ├── labels/        # Label management
│   └── settings/      # Admin analytics dashboard + user management
├── layout/            # Application shell
│   ├── layout/        # Main layout wrapper
│   ├── sidebar/       # Navigation sidebar
│   └── toolbar/       # Top toolbar (user menu + logout)
└── shared/            # Reusable components and pipes
    ├── components/    # ConfirmDialog, EmptyState, StatusIcon, etc.
    └── pipes/         # RelativeTimePipe
```

## Backend Architecture

### Layered Design

```
Request → Helmet → Rate Limit → Routes → Middleware (authenticate + validate) → Controller → Service → Cache (Redis) → Model → Database
                                                                                     ↓
Response ← Controller ← Service ← Cache ← Model ← Database
                ↓
         Error Handler (if error)
```

| Layer        | Responsibility                                                           |
| ------------ | ------------------------------------------------------------------------ |
| Security     | Helmet.js (headers), express-rate-limit (global + per-endpoint)          |
| Routes       | Map HTTP methods and paths to controllers                                |
| Middleware   | JWT authentication, admin authorization, Zod validation, error handling  |
| Controllers  | Parse request, call service, format response                             |
| Services     | Business logic, transactions, analytics, data orchestration              |
| Cache        | Redis cache-aside layer (check cache → query DB → cache result)          |
| Models       | Sequelize model definitions and associations                             |
| Config       | Database, environment (with production enforcement), Passport, Redis     |

### Directory Structure

```
src/
├── config/
│   ├── database.ts        # Sequelize instance and connection
│   ├── environment.ts     # Environment variable parsing (DB, JWT, Google, session, Redis)
│   ├── passport.ts        # Passport strategies (local + Google OAuth)
│   └── redis.ts           # Redis connection singleton (ioredis, lazyConnect)
├── controllers/
│   ├── auth.controller.ts # Login, register, refresh, me, logout, Google callback
│   ├── project.controller.ts
│   ├── issue.controller.ts
│   ├── cycle.controller.ts
│   ├── label.controller.ts
│   └── member.controller.ts
├── middleware/
│   ├── authenticate.ts    # JWT Bearer token verification (with Redis-cached member lookup)
│   ├── errorHandler.ts    # Global error handler
│   └── validate.ts        # Zod validation middleware
├── models/
│   ├── index.ts           # Model registration and associations
│   ├── project.model.ts
│   ├── issue.model.ts
│   ├── cycle.model.ts
│   ├── member.model.ts   # Includes passwordHash, googleId, provider fields
│   ├── label.model.ts
│   └── issueLabel.model.ts
├── routes/
│   ├── index.ts           # Route aggregator (/api/v1) with global auth middleware
│   ├── auth.routes.ts     # Auth routes (public) with Zod validation schemas
│   ├── project.routes.ts
│   ├── issue.routes.ts
│   ├── cycle.routes.ts
│   ├── label.routes.ts
│   └── member.routes.ts
├── services/
│   ├── auth.service.ts    # Register, login, token refresh, profile
│   ├── project.service.ts
│   ├── issue.service.ts
│   ├── cycle.service.ts
│   ├── label.service.ts
│   └── member.service.ts
├── utils/
│   ├── api-error.ts       # Custom error class (400, 401, 404, 409, 500)
│   ├── cache.ts           # Redis cache utility (get/set/del/invalidate/hashKey)
│   └── jwt.ts             # JWT generation and verification helpers
└── app.ts                 # Express app bootstrap (CORS, session, Passport)
```

## Key Design Decisions

### Issue Identifier Generation

Issues use a compound identifier pattern: `{PROJECT_IDENTIFIER}-{SEQUENTIAL_NUMBER}` (e.g., `PROJ-42`). The number is generated using a database transaction that atomically increments the project's `issueCounter` field, preventing race conditions.

### Cycle Auto-Completion

A background job runs every 60 minutes (`setInterval`) to check for cycles whose `endDate` has passed. When a cycle is completed:
1. The cycle status changes to `completed`
2. All incomplete issues (not `done` or `cancelled`) are moved to `backlog` status
3. The `cycleId` is removed from those issues

### Pagination

Issue and project list endpoints support server-side pagination via `page` and `pageSize` query parameters. When provided, the response format changes from a plain array to `{ data: [...], total: number, page: number, pageSize: number }`. When omitted, endpoints return plain arrays for backward compatibility (used by dropdowns, sidebar, etc.). Maximum 100 items per page enforced server-side.

### Redis Caching

The application uses a **cache-aside (lazy-loading)** pattern with Redis:

1. **Read path:** Check Redis → if hit, return cached data; if miss, query PostgreSQL → cache result with TTL → return data
2. **Write path:** Write to PostgreSQL → invalidate related cache keys → next read repopulates cache

Key design decisions:
- **Graceful degradation** — all cache operations no-op silently if Redis is unavailable
- **Hash-based keys** for variable filter combinations (`hashKey()` in `utils/cache.ts`)
- **SCAN-based invalidation** — non-blocking pattern deletion instead of `KEYS`
- **TTLs:** 2min (issues), 5min (projects/cycles/auth), 10min (members/analytics), 1hr (labels)
- **Auth middleware caching** — `authenticate` middleware caches member lookups (5min TTL) to eliminate per-request DB hits

See [Redis Documentation](REDIS.md) for full details on cache keys, TTLs, and invalidation matrix.

### Board View (Kanban)

Issue lists support two view modes toggled via the page header:

- **List view** — Paginated row list (default). Uses `MatPaginator` with server-side pagination.
- **Board view** — Kanban-style columns grouped by status (Backlog → Todo → In Progress → Ready to Test → Testing → Done → Cancelled). Loads up to 200 issues at once. Cards can be dragged between columns to change status using the **native HTML5 Drag and Drop API**. Drops perform an **optimistic local update** (the signal is updated immediately), and the API call happens in the background.

Available on: Issues page, My Issues page, and Cycle Detail page.

### Global Labels

Labels are application-wide rather than project-scoped. This simplifies the data model and allows consistent categorization across projects. The many-to-many relationship between issues and labels is managed through the `IssueLabel` junction table.

### Authentication Architecture

The application uses **JWT-based authentication** with two strategies via Passport.js:

1. **Local Strategy** (`passport-local`) — email + password login. Passwords are hashed with bcryptjs (12 rounds) and stored as `passwordHash` in the `members` table.
2. **Google OAuth Strategy** (`passport-google-oauth20`) — SSO via Google. Conditionally enabled only when `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set.

**Token flow:**
- On login/register, the server issues an **access token** (short-lived, default 15m) and a **refresh token** (long-lived, default 7d)
- The Angular `authInterceptor` attaches the access token as a `Bearer` header to all API requests
- On a `401` response, the interceptor attempts a token refresh and retries the original request
- If refresh fails, the user is logged out and redirected to `/auth/login`
- **On hard refresh:** `loadStoredAuth()` uses native `fetch()` (bypassing the interceptor) to verify tokens and load the profile. Guards await `authReady` before making routing decisions, preserving the user's current route.

**Route protection:**
- Auth routes (`/api/v1/auth/*`) are public
- All other `/api/v1/*` routes are protected by a global `authenticate` middleware applied at the router level
- Analytics and user management routes require `requireAdmin` middleware
- Frontend uses `authGuard` on the `LayoutComponent` route — all app pages require authentication
- `guestGuard` prevents authenticated users from accessing the login page
- `adminGuard` protects the settings page
- `roleRedirectGuard` routes admin to `/issues` (All Issues) and normal users to `/my-issues`

**Login attempt limiting:**
- 5 failed attempts → account auto-blocked with `blockedReason: 'max_attempts'`
- Auto-unlocks after 30 minutes on next login attempt
- Admin blocks (`blockedReason: 'admin'`) never auto-unlock

**Security middleware:**
- `helmet()` sets security headers (X-Frame-Options, CSP, HSTS, etc.)
- Global rate limit: 100 requests per 15 minutes per IP in production (1000 in development)
- Auth rate limit: 10 requests per 15 minutes per IP on login/register in production (100 in development)
- Request body size limited to 1MB
- Session cookies use `httpOnly: true`, `sameSite: 'lax'`

**Idle timeout:**
- Frontend `IdleService` tracks user activity (mousemove, keydown, scroll, touch)
- After 10 minutes of inactivity, a dialog appears with a 30-second countdown
- User can extend the session or sign out; auto-logout if no action

## Data Flow Examples

### Authentication: Login

```
1. User fills email/password in LoginComponent
2. Component calls AuthService.login(credentials)
3. AuthService POSTs to /api/v1/auth/login
4. validate(loginSchema) middleware validates body
5. AuthController.login() invokes passport.authenticate('local')
6. Passport LocalStrategy finds member by email, compares password hash
7. AuthService.login(member) generates access + refresh JWT tokens
8. Controller returns 200 with { member, accessToken, refreshToken }
9. Angular AuthService stores tokens in localStorage, updates signals
10. Router navigates to / (issues list)
```

### Authentication: Google SSO

```
1. User clicks "Sign in with Google" → browser navigates to /api/v1/auth/google
2. Passport redirects to Google's consent screen
3. User consents → Google redirects to /api/v1/auth/google/callback
4. Passport GoogleStrategy finds/creates member by googleId or email
5. AuthController.googleCallback() generates JWT tokens
6. Server redirects to ${CLIENT_URL}/auth/google/callback?accessToken=...&refreshToken=...
7. GoogleCallbackComponent extracts tokens, stores them, fetches profile
8. Router navigates to /
```

### Creating an Issue (Authenticated)

```
1. User fills IssueCreateDialogComponent form
2. Component calls IssuesService.createIssue(dto)
3. IssuesService calls ApiService.post('/issues', dto)
4. authInterceptor attaches Authorization: Bearer <token> header
5. HTTP POST /api/v1/issues
6. authenticate middleware verifies JWT, sets req.member
7. validate(createIssueSchema) middleware validates body
8. IssueController.create() extracts validated data
9. IssueService.create() starts a database transaction:
   a. Fetches project and increments issueCounter
   b. Generates identifier (e.g., "PROJ-5")
   c. Creates issue record
   d. Associates labels if provided
   e. Commits transaction
10. Controller returns 201 with created issue
11. IssuesService receives response
12. Component closes dialog and refreshes list
```

## Docker Deployment

In Docker, the application runs behind an **nginx reverse proxy** that serves the Angular SPA and proxies API requests:

```
Browser :80 → nginx (client container)
                ├── Static files → Angular SPA
                └── /api/*      → Express server :3000 → PostgreSQL + Redis
```

Key differences from local development:
- Angular is built with the **production** environment (`environment.prod.ts`), using relative API URLs (`/api/v1`) instead of `http://localhost:3000/api/v1`
- nginx handles SPA routing (`try_files $uri $uri/ /index.html`) and API proxying
- All services communicate via Docker's internal network (`server`, `postgres`, `redis` hostnames)
- Database migration runs as a one-shot container (`docker compose run --rm migrate`)

See [Docker Guide](DOCKER.md) for full setup and operational commands.
