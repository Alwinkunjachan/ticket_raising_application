# API Reference

**Base URL:** `http://localhost:3000/api/v1` (local dev) or `http://localhost/api/v1` (Docker)

All request and response bodies use JSON. Dates are in ISO 8601 format unless noted otherwise.

## Authentication

All endpoints except `/auth/*` (login, register, refresh) and `/health` require a valid JWT access token in the `Authorization` header:

```
Authorization: Bearer <access_token>
```

Unauthenticated requests to protected endpoints return `401 Unauthorized`.

## Rate Limiting

- **Global:** 100 requests per 15 minutes per IP in production (1000 in development)
- **Auth endpoints:** 10 requests per 15 minutes per IP on `/auth/login` and `/auth/register` in production (100 in development)
- Exceeding the limit returns `429 Too Many Requests`

## Login Attempt Limiting

- After 5 failed password attempts, the account is automatically locked
- Locked accounts auto-unlock after 30 minutes
- Admin-blocked accounts (`blockedReason: 'admin'`) never auto-unlock — only an admin can unblock

---

## Health Check

### `GET /health`

Returns server status. **Public** (no auth required).

**Response:**
```json
{ "status": "ok", "redis": "connected" }
```

The `redis` field will be `"connected"` or `"unavailable"`. The API works without Redis (graceful degradation).

---

## Auth

All auth endpoints are **public** (no Bearer token required) unless noted.

### `POST /api/v1/auth/register`

Register a new user account.

**Request Body:**
| Field      | Type   | Required | Constraints           |
| ---------- | ------ | -------- | --------------------- |
| `name`     | string | Yes      | 1-255 characters      |
| `email`    | string | Yes      | Valid email, unique    |
| `password` | string | Yes      | 8-128 characters      |

**Example:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securepass123"
}
```

**Response `201`:**
```json
{
  "member": {
    "id": "uuid",
    "name": "John Doe",
    "email": "john@example.com",
    "avatarUrl": null,
    "provider": "local",
    "createdAt": "2026-01-15T10:30:00.000Z",
    "updatedAt": "2026-01-15T10:30:00.000Z"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response `400`:** Validation error
**Response `409`:** `{ "error": "Email already registered" }`

### `POST /api/v1/auth/login`

Authenticate with email and password.

**Request Body:**
| Field      | Type   | Required | Constraints      |
| ---------- | ------ | -------- | ---------------- |
| `email`    | string | Yes      | Valid email      |
| `password` | string | Yes      | Min 1 character  |

**Response `200`:** Same shape as register response (member + tokens)
**Response `401`:** `{ "error": "Invalid email or password" }`

### `POST /api/v1/auth/refresh`

Exchange a refresh token for a new access/refresh token pair.

**Request Body:**
| Field          | Type   | Required |
| -------------- | ------ | -------- |
| `refreshToken` | string | Yes      |

**Response `200`:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response `401`:** `{ "error": "Invalid or expired refresh token" }`

### `GET /api/v1/auth/me`

Get the authenticated user's profile. **Requires Bearer token.**

**Response `200`:**
```json
{
  "id": "uuid",
  "name": "John Doe",
  "email": "john@example.com",
  "avatarUrl": null,
  "provider": "local",
  "createdAt": "2026-01-15T10:30:00.000Z",
  "updatedAt": "2026-01-15T10:30:00.000Z"
}
```

**Response `401`:** `{ "error": "Unauthorized" }`

### `POST /api/v1/auth/logout`

Log out the current user. **Requires Bearer token.** The client should discard stored tokens.

**Response `200`:**
```json
{ "message": "Logged out successfully" }
```

### `GET /api/v1/auth/google`

Initiates Google OAuth 2.0 flow. Redirects the browser to Google's consent screen. Only available if `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are configured.

### `GET /api/v1/auth/google/callback`

Google redirects here after user consent. The server generates JWT tokens and redirects to:
```
${CLIENT_URL}/auth/google/callback?accessToken=...&refreshToken=...
```

`CLIENT_URL` defaults to `http://localhost:4200` in local development or `http://localhost` in Docker.

---

## Projects

### `GET /api/v1/projects`

List all projects with issue counts. Supports optional pagination.

**Query Parameters:**
| Parameter  | Type   | Description                                  |
| ---------- | ------ | -------------------------------------------- |
| `page`     | number | Page number (1-based). Enables pagination.   |
| `pageSize` | number | Items per page (max 100). Required with `page`. |

**Response `200` (without pagination):** Array of project objects
```json
[
  {
    "id": "uuid",
    "name": "My Project",
    "identifier": "MYPR",
    "description": "Project description",
    "issueCounter": 12,
    "issueCount": 12,
    "createdAt": "2026-01-15T10:30:00.000Z",
    "updatedAt": "2026-01-15T10:30:00.000Z"
  }
]
```

**Response `200` (with pagination):** Paginated envelope
```json
{
  "data": [ { "id": "uuid", "name": "My Project", ... } ],
  "total": 25,
  "page": 1,
  "pageSize": 12
}
```

### `GET /api/v1/projects/:id`

Get a single project by ID.

**Response `200`:** Single project object  
**Response `404`:** `{ "error": "Project not found" }`

### `POST /api/v1/projects`

Create a new project.

**Request Body:**
| Field         | Type   | Required | Constraints                    |
| ------------- | ------ | -------- | ------------------------------ |
| `name`        | string | Yes      | 1-255 characters               |
| `identifier`  | string | Yes      | 2-5 uppercase letters          |
| `description` | string | No       | Max 1000 characters            |

**Example:**
```json
{
  "name": "Backend Services",
  "identifier": "BACK",
  "description": "Core backend microservices"
}
```

**Response `201`:** Created project object  
**Response `400`:** Validation error

### `PATCH /api/v1/projects/:id`

Update a project.

**Request Body:** Any subset of creation fields  
**Response `200`:** Updated project object  
**Response `404`:** `{ "error": "Project not found" }`

### `DELETE /api/v1/projects/:id`

Delete a project.

**Response `204`:** No content  
**Response `404`:** `{ "error": "Project not found" }`

---

## Issues

### `GET /api/v1/issues`

List issues with optional filters and pagination.

**Query Parameters:**
| Parameter    | Type   | Description                                    |
| ------------ | ------ | ---------------------------------------------- |
| `projectId`  | UUID   | Filter by project                              |
| `status`     | string | Filter by status (comma-separated for multiple) |
| `priority`   | string | Filter by priority                             |
| `assigneeId` | UUID   | Filter by assignee                             |
| `cycleId`    | UUID   | Filter by cycle                                |
| `labelId`    | UUID   | Filter by label                                |
| `search`     | string | Search in title and description                |
| `sort`       | string | Sort field (default: `createdAt`)              |
| `order`      | string | Sort order: `ASC` or `DESC` (default: `DESC`)  |
| `page`       | number | Page number (1-based). Enables pagination.     |
| `pageSize`   | number | Items per page (max 100). Required with `page`. |

**Response `200` (without pagination):** Array of issue objects
```json
[
  {
    "id": "uuid",
    "identifier": "BACK-5",
    "number": 5,
    "title": "Fix login timeout",
    "description": "Users are experiencing...",
    "status": "in_progress",
    "priority": "high",
    "projectId": "uuid",
    "assigneeId": "uuid",
    "cycleId": "uuid",
    "project": { "id": "uuid", "name": "...", "identifier": "BACK" },
    "assignee": { "id": "uuid", "name": "...", "email": "..." },
    "labels": [{ "id": "uuid", "name": "bug", "color": "#ef4444" }],
    "createdAt": "2026-01-15T10:30:00.000Z",
    "updatedAt": "2026-01-15T10:30:00.000Z"
  }
]
```

**Response `200` (with pagination):** Paginated envelope
```json
{
  "data": [ { "id": "uuid", "identifier": "BACK-5", ... } ],
  "total": 42,
  "page": 1,
  "pageSize": 25
}
```

### `GET /api/v1/issues/:id`

Get a single issue with all associations (project, assignee, labels, cycle).

**Response `200`:** Full issue object with associations  
**Response `404`:** `{ "error": "Issue not found" }`

### `POST /api/v1/issues`

Create a new issue. The `identifier` and `number` fields are auto-generated.

**Request Body:**
| Field         | Type     | Required | Constraints                     |
| ------------- | -------- | -------- | ------------------------------- |
| `title`       | string   | Yes      | 1-500 characters                |
| `description` | string   | No       |                                 |
| `status`      | string   | No       | See status enum (default: `backlog`) |
| `priority`    | string   | No       | See priority enum (default: `none`)  |
| `projectId`   | UUID     | Yes      | Must reference existing project |
| `assigneeId`  | UUID     | No       | Must reference existing member  |
| `cycleId`     | UUID     | No       | Must reference existing cycle   |
| `labelIds`    | UUID[]   | No       | Array of label IDs              |

**Status Enum:** `backlog`, `todo`, `in_progress`, `ready_to_test`, `testing_in_progress`, `done`, `cancelled`

**Priority Enum:** `urgent`, `high`, `medium`, `low`, `none`

**Response `201`:** Created issue object  
**Response `400`:** Validation error

### `PATCH /api/v1/issues/:id`

Update an issue. If `labelIds` is provided, it replaces all existing label associations.

**Request Body:** Any subset of creation fields  
**Response `200`:** Updated issue object  
**Response `404`:** `{ "error": "Issue not found" }`

### `DELETE /api/v1/issues/:id`

Delete an issue and its label associations.

**Response `204`:** No content  
**Response `404`:** `{ "error": "Issue not found" }`

---

## Cycles

### `GET /api/v1/cycles`

List cycles, optionally filtered by project.

**Query Parameters:**
| Parameter   | Type | Description       |
| ----------- | ---- | ----------------- |
| `projectId` | UUID | Filter by project |

**Response `200`:**
```json
[
  {
    "id": "uuid",
    "name": "Sprint 1",
    "description": "First sprint",
    "startDate": "2026-01-15",
    "endDate": "2026-01-29",
    "status": "active",
    "projectId": "uuid",
    "createdAt": "2026-01-15T10:30:00.000Z",
    "updatedAt": "2026-01-15T10:30:00.000Z"
  }
]
```

### `GET /api/v1/cycles/:id`

Get a single cycle with its issues and their associations.

**Response `200`:** Cycle object with nested issues  
**Response `404`:** `{ "error": "Cycle not found" }`

### `POST /api/v1/cycles`

Create a new cycle.

**Request Body:**
| Field         | Type   | Required | Constraints              |
| ------------- | ------ | -------- | ------------------------ |
| `name`        | string | Yes      | 1-255 characters         |
| `description` | string | No       | Max 1000 characters      |
| `startDate`   | string | Yes      | Format: `YYYY-MM-DD`     |
| `endDate`     | string | Yes      | Format: `YYYY-MM-DD`     |
| `status`      | string | No       | `upcoming`, `active`, `completed` (default: `upcoming`) |
| `projectId`   | UUID   | Yes      | Must reference existing project |

**Response `201`:** Created cycle object  
**Response `400`:** Validation error

### `PATCH /api/v1/cycles/:id`

Update a cycle. Setting `status` to `completed` triggers automatic issue handling (incomplete issues move to backlog).

**Request Body:** Any subset of creation fields  
**Response `200`:** Updated cycle object  
**Response `404`:** `{ "error": "Cycle not found" }`

### `DELETE /api/v1/cycles/:id`

Delete a cycle.

**Response `204`:** No content  
**Response `404`:** `{ "error": "Cycle not found" }`

---

## Labels

### `GET /api/v1/labels`

List all labels.

**Response `200`:**
```json
[
  {
    "id": "uuid",
    "name": "bug",
    "color": "#ef4444",
    "createdAt": "2026-01-15T10:30:00.000Z",
    "updatedAt": "2026-01-15T10:30:00.000Z"
  }
]
```

### `POST /api/v1/labels`

Create a new label.

**Request Body:**
| Field   | Type   | Required | Constraints                       |
| ------- | ------ | -------- | --------------------------------- |
| `name`  | string | Yes      | 1-100 characters, must be unique  |
| `color` | string | Yes      | Hex color format (e.g., `#ef4444`)|

**Response `201`:** Created label object  
**Response `400`:** Validation error

### `PATCH /api/v1/labels/:id`

Update a label.

**Request Body:** Any subset of creation fields  
**Response `200`:** Updated label object  
**Response `404`:** `{ "error": "Label not found" }`

### `DELETE /api/v1/labels/:id`

Delete a label.

**Response `204`:** No content  
**Response `404`:** `{ "error": "Label not found" }`

---

## Members

### `GET /api/v1/members`

List all members.

**Response `200`:**
```json
[
  {
    "id": "uuid",
    "name": "Alwin Kunjachan",
    "email": "alwin@example.com",
    "avatarUrl": null,
    "createdAt": "2026-01-15T10:30:00.000Z",
    "updatedAt": "2026-01-15T10:30:00.000Z"
  }
]
```

### `POST /api/v1/members`

Create a new member.

**Request Body:**
| Field       | Type   | Required | Constraints                    |
| ----------- | ------ | -------- | ------------------------------ |
| `name`      | string | Yes      | 1-255 characters               |
| `email`     | string | Yes      | Valid email, must be unique     |
| `avatarUrl` | string | No       | Valid URL, max 500 characters   |

**Response `201`:** Created member object  
**Response `400`:** Validation error

### `PATCH /api/v1/members/:id`

Update a member.

**Request Body:** Any subset of creation fields  
**Response `200`:** Updated member object  
**Response `404`:** `{ "error": "Member not found" }`

### `GET /api/v1/members/users`

List all non-admin users. **Admin only.**

**Response `200`:** Array of member objects (same shape as above)

### `PATCH /api/v1/members/:id/toggle-block`

Toggle a user's blocked status. **Admin only.** When unblocking, also resets `failedLoginAttempts` and `blockedReason`.

**Response `200`:** Updated member object with `blocked`, `blockedReason` fields
**Response `400`:** `{ "error": "Cannot block an admin user" }`

---

## Analytics

### `GET /api/v1/analytics/dashboard`

Get application-wide analytics. **Admin only.**

**Response `200`:**
```json
{
  "overview": {
    "totalProjects": 4,
    "totalIssues": 18,
    "openIssues": 12,
    "totalCycles": 3,
    "activeCycles": 1,
    "totalMembers": 5,
    "blockedMembers": 0,
    "totalLabels": 8,
    "completionRate": 33
  },
  "issuesByStatus": [{ "status": "backlog", "count": 5 }],
  "issuesByPriority": [{ "priority": "high", "count": 4 }],
  "issuesPerProject": [{ "name": "Frontend App", "identifier": "FE", "count": 6 }],
  "topAssignees": [{ "name": "Alwin", "email": "...", "total": 8, "completed": 3 }],
  "overdueCycles": [{ "name": "Sprint 1", "end_date": "2026-04-01", "status": "active", "project_name": "..." }],
  "recentIssues": [{ "identifier": "FE-6", "title": "...", "status": "done", "priority": "high", "created_at": "...", "project_name": "...", "assignee_name": "..." }],
  "issuesOverTime": [{ "date": "2026-04-01", "count": 3 }]
}
```

---

## Error Responses

All errors follow a consistent format:

```json
{
  "error": "Human-readable error message"
}
```

| Status Code | Meaning               |
| ----------- | --------------------- |
| `400`       | Validation error      |
| `401`       | Unauthorized (missing/invalid/expired JWT) |
| `404`       | Resource not found    |
| `409`       | Conflict (e.g., duplicate email on register) |
| `429`       | Too many requests (rate limit exceeded) |
| `500`       | Internal server error |

Validation errors from Zod include field-level details:

```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "name",
      "message": "String must contain at least 1 character(s)"
    }
  ]
}
```
