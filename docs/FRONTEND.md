# Frontend Guide

## Overview

The frontend is an **Angular 19** single-page application using **standalone components** (no NgModules). The UI is built with **Angular Material 19** and supports dark/light theming.

## Getting Started

```bash
cd client
npm install
ng serve
```

The app runs at `http://localhost:4200` and proxies API calls to `http://localhost:3000/api/v1`.

## Application Structure

```
src/
├── app/
│   ├── core/                     # Singleton services, models, guards, interceptors
│   │   ├── models/
│   │   │   ├── auth.model.ts     # LoginRequest, RegisterRequest, AuthResponse, TokenResponse
│   │   │   ├── project.model.ts  # Project, CreateProjectDto
│   │   │   ├── issue.model.ts    # Issue, CreateIssueDto, IssueStatus, IssuePriority, IssueFilters
│   │   │   ├── cycle.model.ts    # Cycle, CreateCycleDto
│   │   │   ├── label.model.ts    # Label, CreateLabelDto
│   │   │   └── member.model.ts   # Member (incl. provider field)
│   │   ├── services/
│   │   │   ├── api.service.ts          # HTTP client wrapper
│   │   │   ├── auth.service.ts         # Auth state, login/register/refresh/logout, isAdmin signal
│   │   │   ├── idle.service.ts         # Idle timeout tracking (10 min idle → session expiry dialog)
│   │   │   ├── notification.service.ts # Snackbar notifications
│   │   │   └── theme.service.ts        # Theme toggle with localStorage
│   │   ├── interceptors/
│   │   │   └── auth.interceptor.ts     # JWT attachment + 401 auto-refresh
│   │   └── guards/
│   │       ├── auth.guard.ts           # Protects app routes (redirects to login)
│   │       ├── guest.guard.ts          # Protects auth pages (redirects to app)
│   │       ├── admin.guard.ts          # Protects admin routes (settings)
│   │       └── role-redirect.guard.ts  # Routes admin→/issues, user→/my-issues
│   │
│   ├── features/                 # Feature modules (lazy-loaded)
│   │   ├── auth/
│   │   │   ├── login/                  # Login/Register tabbed page
│   │   │   ├── google-callback/        # Google OAuth redirect handler
│   │   │   └── auth.routes.ts
│   │   │
│   │   ├── issues/
│   │   │   ├── components/
│   │   │   │   ├── issue-list/
│   │   │   │   ├── issue-detail/
│   │   │   │   ├── issue-row/
│   │   │   │   └── issue-create-dialog/
│   │   │   ├── services/
│   │   │   │   └── issues.service.ts
│   │   │   └── issues.routes.ts
│   │   │
│   │   ├── projects/
│   │   │   ├── components/
│   │   │   │   ├── project-list/
│   │   │   │   ├── project-detail/
│   │   │   │   └── project-create-dialog/
│   │   │   ├── services/
│   │   │   │   └── projects.service.ts
│   │   │   └── projects.routes.ts
│   │   │
│   │   ├── cycles/
│   │   │   ├── components/
│   │   │   │   ├── cycle-list/
│   │   │   │   ├── cycle-detail/
│   │   │   │   └── cycle-create-dialog/
│   │   │   ├── services/
│   │   │   │   └── cycles.service.ts
│   │   │   └── cycles.routes.ts
│   │   │
│   │   ├── labels/
│   │   │   ├── components/
│   │   │   │   └── label-list/
│   │   │   ├── services/
│   │   │   │   └── labels.service.ts
│   │   │   └── labels.routes.ts
│   │   │
│   │   └── settings/                   # Admin-only settings
│   │       ├── services/
│   │       │   └── settings.service.ts # Analytics + user management API
│   │       ├── settings.component.ts   # Analytics dashboard + user block/unblock
│   │       └── settings.routes.ts
│   │
│   ├── layout/                   # Application shell
│   │   ├── layout/               # Main layout with sidebar + content + idle service
│   │   ├── sidebar/              # Navigation sidebar (role-aware: admin vs user)
│   │   │   └── sidebar-nav-item/ # Reusable nav item
│   │   └── toolbar/              # Top toolbar (user menu, settings for admin, logout)
│   │
│   ├── shared/                   # Reusable UI elements
│   │   ├── components/
│   │   │   ├── confirm-dialog/         # Generic confirmation dialog
│   │   │   ├── idle-timeout-dialog/    # Session expiry countdown dialog
│   │   │   ├── empty-state/            # Empty state placeholder
│   │   │   ├── status-icon/            # Status SVG icons
│   │   │   ├── priority-icon/          # Priority SVG icons
│   │   │   └── label-badge/            # Label color badge
│   │   └── pipes/
│   │       └── relative-time.pipe.ts   # Date to relative time
│   │
│   ├── app.component.ts         # Root component
│   ├── app.config.ts            # Application providers (incl. auth interceptor)
│   └── app.routes.ts            # Root routing (auth + guarded layout)
│
├── styles.scss                  # Global styles and Material theme
├── index.html                   # HTML entry point
└── main.ts                      # Angular bootstrap
```

## Routing

Feature routes are **lazy-loaded** using `loadChildren`. Auth routes are public; all other routes are protected by `authGuard`:

```typescript
// app.routes.ts
{
  path: 'auth',
  loadChildren: () => import('./features/auth/auth.routes')   // public
},
{
  path: '',
  component: LayoutComponent,
  canActivate: [authGuard],                                    // protected
  children: [
    { path: '', redirectTo: 'issues', pathMatch: 'full' },
    { path: 'issues', loadChildren: () => import('./features/issues/issues.routes') },
    { path: 'projects', loadChildren: () => import('./features/projects/projects.routes') },
    { path: 'cycles', loadChildren: () => import('./features/cycles/cycles.routes') },
    { path: 'labels', loadChildren: () => import('./features/labels/labels.routes') },
  ]
}
```

### Route Map

| Path                     | Component               | Guard              | Description                           |
| ------------------------ | ----------------------- | ------------------ | ------------------------------------- |
| `/auth/login`            | LoginComponent          | `guestGuard`       | Login/Register page                   |
| `/auth/google/callback`  | GoogleCallbackComponent | none               | Google OAuth redirect handler         |
| `/`                      | (role redirect)         | `roleRedirectGuard`| Admin → `/issues`, User → `/my-issues`|
| `/issues`                | IssueListComponent      | `authGuard`        | All issues with filters (admin)       |
| `/my-issues`             | MyIssuesComponent       | `authGuard`        | Only assigned issues (normal user)    |
| `/issues/:id`            | IssueDetailComponent    | `authGuard`        | Single issue detail/edit view         |
| `/projects`              | ProjectListComponent    | `authGuard`        | Project grid                          |
| `/projects/:id`          | ProjectDetailComponent  | `authGuard`        | Project with issues and cycles        |
| `/cycles`                | Redirects to `/projects`| `authGuard`        |                                       |
| `/cycles/:id`            | CycleDetailComponent    | `authGuard`        | Cycle with its issues                 |
| `/labels`                | LabelListComponent      | `authGuard`        | Label management                      |
| `/settings`              | SettingsComponent       | `adminGuard`       | Analytics dashboard + user management |

## Core Services

### AuthService

Manages authentication state and token lifecycle. Uses Angular Signals for reactive state.

```typescript
class AuthService {
  // Signals (read-only)
  readonly currentMember: Signal<Member | null>
  readonly isAuthenticated: Signal<boolean>
  readonly isLoading: Signal<boolean>
  readonly memberInitial: Signal<string>          // first letter of name

  // Auth methods
  login(credentials: LoginRequest): Observable<AuthResponse>
  register(data: RegisterRequest): Observable<AuthResponse>
  refreshToken(): Observable<TokenResponse>
  getProfile(): Observable<Member>
  googleLogin(): void                              // redirects to backend OAuth URL
  handleGoogleCallback(accessToken, refreshToken): void
  logout(): void                                   // clears tokens, navigates to /auth/login

  // Token helpers
  getAccessToken(): string | null
  getRefreshToken(): string | null
}
```

Tokens are stored in `localStorage` (`access_token`, `refresh_token`). On app startup, `loadStoredAuth()` checks for existing tokens and hydrates the auth state. It uses **native `fetch()`** (not Angular's `HttpClient`) to bypass the interceptor and avoid refresh loops. If the access token is expired, it attempts a refresh via `POST /auth/refresh` before falling back to logout.

The `authReady` Promise resolves when the initial auth check completes. Guards `await authService.authReady` before making routing decisions, ensuring hard refreshes preserve the user's session and current route.

### ApiService

Central HTTP client wrapping Angular's `HttpClient`. All feature services use this for API communication. JWT tokens are attached automatically by the `authInterceptor`.

```typescript
class ApiService {
  get<T>(path: string, params?): Observable<T>
  post<T>(path: string, body): Observable<T>
  patch<T>(path: string, body): Observable<T>
  delete<T>(path: string): Observable<T>
}
```

Base URL: `http://localhost:3000/api/v1`

### ThemeService

Manages dark/light mode toggle. Persists preference in `localStorage` and applies a CSS class to the document body.

### NotificationService

Wrapper around Angular Material's `MatSnackBar` for showing success/error toast notifications.

## Interceptors

### authInterceptor

A functional `HttpInterceptorFn` registered in `app.config.ts` via `provideHttpClient(withInterceptors([authInterceptor]))`.

Behavior:
- **Skips** auth endpoints (`/auth/login`, `/auth/register`, `/auth/refresh`) — no token attached
- **Attaches** `Authorization: Bearer <token>` header to all other requests
- **On 401 response**: attempts a token refresh if a refresh token exists, then retries the original request
- **On refresh failure**: calls `AuthService.logout()` to clear tokens and redirect to login
- **Note**: The initial auth check on startup uses native `fetch()` to bypass this interceptor entirely

## Guards

| Guard                | Applied to        | Behavior                                              |
| -------------------- | ----------------- | ----------------------------------------------------- |
| `authGuard`          | LayoutComponent   | Checks `localStorage` for token synchronously         |
| `guestGuard`         | LoginComponent    | Checks `localStorage` — redirects to `/` if token exists |
| `adminGuard`         | SettingsComponent | Awaits `authReady`, checks admin role                 |
| `roleRedirectGuard`  | Default route `/` | Awaits `authReady`, routes admin→`/issues`, user→`/my-issues` |

## Feature Components

### Auth

- **LoginComponent** - Tabbed login/register page with Material UI. Login tab: email + password. Register tab: name + email + password + confirm password. Below the tabs: "Sign in with Google" button. Uses `ReactiveFormsModule` for form handling and `NotificationService` for feedback.
- **GoogleCallbackComponent** - Handles the redirect after Google OAuth. Extracts tokens from URL query parameters, stores them, fetches the user profile, and navigates to `/`. Shows a spinner while processing.

### Issues

- **IssueListComponent** - Displays a filterable, sortable list of issues. Supports filtering by status, priority, assignee, cycle, and label. Used standalone and embedded within ProjectDetailComponent and CycleDetailComponent.
- **IssueDetailComponent** - Full issue editor with inline-editable fields for status, priority, assignee, cycle, and labels. Supports delete with confirmation.
- **IssueRowComponent** - Single issue row showing identifier, title, status icon, priority icon, and assignee avatar.
- **IssueCreateDialogComponent** - Material dialog for creating issues with project, title, status, priority, assignee, and label selection.

### Projects

- **ProjectListComponent** - Grid of project cards showing name, identifier, issue count, and description.
- **ProjectDetailComponent** - Tabbed view with issues tab and cycles tab for a single project.
- **ProjectCreateDialogComponent** - Dialog for creating projects with name, identifier, and description.

### Cycles

- **CycleListComponent** - List view of cycles showing name, date range, status, and issue count.
- **CycleDetailComponent** - Single cycle view with its issues listed.
- **CycleCreateDialogComponent** - Dialog for creating cycles with date pickers and status selection.

### Labels

- **LabelListComponent** - Displays all labels with an inline form for creating new ones. Supports edit and delete.

## Shared Components

| Component             | Purpose                                                  |
| --------------------- | -------------------------------------------------------- |
| `ConfirmDialogComponent` | Generic yes/no confirmation dialog (used for deletes) |
| `EmptyStateComponent`    | Placeholder shown when a list has no items             |
| `StatusIconComponent`    | Renders SVG icons for each issue status                |
| `PriorityIconComponent`  | Renders SVG icons for each issue priority              |
| `LabelBadgeComponent`    | Colored badge displaying a label name                  |

## Shared Pipes

| Pipe               | Purpose                                              |
| ------------------ | ---------------------------------------------------- |
| `RelativeTimePipe` | Transforms ISO dates to relative time (e.g., "2h ago") |

## Theming

The app uses Angular Material's theming system with CSS custom properties. Theme toggle is in the toolbar and persists via `localStorage`.

- Light theme: Default Material palette
- Dark theme: Applied via CSS class on `<body>`

## Constants

Issue statuses and priorities are defined as constant arrays in the models, providing both the enum value and a display label:

```typescript
// Statuses
const ISSUE_STATUSES = [
  { value: 'backlog', label: 'Backlog' },
  { value: 'todo', label: 'Todo' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'ready_to_test', label: 'Ready to Test' },
  { value: 'testing_in_progress', label: 'Testing in Progress' },
  { value: 'done', label: 'Done' },
  { value: 'cancelled', label: 'Cancelled' }
];

// Priorities
const ISSUE_PRIORITIES = [
  { value: 'urgent', label: 'Urgent' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
  { value: 'none', label: 'No Priority' }
];
```
