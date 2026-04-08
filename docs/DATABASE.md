# Database Schema

## Overview

The application uses **PostgreSQL** with **Sequelize 6** as the ORM. The database name is `linear_clone`. Tables are auto-synced on server startup via `sequelize.sync()`.

## Entity Relationship Diagram

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│   Project   │       │    Cycle    │       │   Member    │
│─────────────│       │─────────────│       │─────────────│
│ id (PK)     │──┐    │ id (PK)     │       │ id (PK)     │
│ name        │  │    │ name        │       │ name        │
│ identifier  │  │    │ description │       │ email       │
│ description │  │    │ startDate   │       │ avatarUrl   │
│ issueCounter│  │    │ endDate     │       │ passwordHash│
│ createdAt   │  │    │ status      │       │ googleId    │
│ updatedAt   │  ├───<│ projectId(FK)│       │ provider    │
│             │  │    │ createdAt   │       │ createdAt   │
│             │  │    │ updatedAt   │       │ updatedAt   │
└─────────────┘  │    └──────┬──────┘       └──────┬──────┘
                 │           │                     │
                 │    ┌──────┴──────────────────────┘
                 │    │
           ┌─────┴────┴───┐         ┌─────────────┐
           │    Issue      │         │    Label    │
           │───────────────│         │─────────────│
           │ id (PK)       │         │ id (PK)     │
           │ identifier    │         │ name        │
           │ number        │         │ color       │
           │ title         │         │ createdAt   │
           │ description   │         │ updatedAt   │
           │ status        │         └──────┬──────┘
           │ priority      │                │
           │ projectId (FK)│         ┌──────┴──────┐
           │ assigneeId(FK)│         │ IssueLabel  │
           │ cycleId (FK)  │────────<│─────────────│
           │ createdAt     │         │ issueId (PK)│
           │ updatedAt     │         │ labelId (PK)│
           └───────────────┘         └─────────────┘
```

## Tables

### `projects`

| Column         | Type          | Constraints                  | Description                            |
| -------------- | ------------- | ---------------------------- | -------------------------------------- |
| `id`           | UUID          | PK, auto-generated           | Unique identifier                      |
| `name`         | VARCHAR(255)  | NOT NULL                     | Project name                           |
| `identifier`   | VARCHAR(5)    | UNIQUE, NOT NULL             | Short code (uppercase, 2-5 chars)      |
| `description`  | TEXT          | nullable                     | Project description                    |
| `issue_counter`| INTEGER       | DEFAULT 0                    | Auto-incrementing counter for issues   |
| `created_at`   | TIMESTAMP     | auto                         | Creation timestamp                     |
| `updated_at`   | TIMESTAMP     | auto                         | Last update timestamp                  |

### `issues`

| Column         | Type          | Constraints                          | Description                       |
| -------------- | ------------- | ------------------------------------ | --------------------------------- |
| `id`           | UUID          | PK, auto-generated                   | Unique identifier                 |
| `identifier`   | VARCHAR(20)   | UNIQUE                               | Human-readable key (e.g., PROJ-1) |
| `number`       | INTEGER       | NOT NULL                             | Sequential number within project  |
| `title`        | VARCHAR(500)  | NOT NULL                             | Issue title                       |
| `description`  | TEXT          | nullable                             | Issue description                 |
| `status`       | ENUM          | DEFAULT 'backlog'                    | Current status                    |
| `priority`     | ENUM          | DEFAULT 'none'                       | Priority level                    |
| `project_id`   | UUID          | FK -> projects.id                    | Parent project                    |
| `assignee_id`  | UUID          | FK -> members.id, nullable           | Assigned member                   |
| `cycle_id`     | UUID          | FK -> cycles.id, nullable            | Associated cycle                  |
| `created_at`   | TIMESTAMP     | auto                                 | Creation timestamp                |
| `updated_at`   | TIMESTAMP     | auto                                 | Last update timestamp             |

**Indexes:**
- Unique composite: `(project_id, number)`
- Unique: `identifier`

**Status Enum Values:** `backlog`, `todo`, `in_progress`, `ready_to_test`, `testing_in_progress`, `done`, `cancelled`

**Priority Enum Values:** `urgent`, `high`, `medium`, `low`, `none`

### `cycles`

| Column         | Type          | Constraints              | Description                |
| -------------- | ------------- | ------------------------ | -------------------------- |
| `id`           | UUID          | PK, auto-generated       | Unique identifier          |
| `name`         | VARCHAR(255)  | NOT NULL                 | Cycle/sprint name          |
| `description`  | TEXT          | nullable                 | Cycle description          |
| `start_date`   | DATEONLY      | NOT NULL                 | Start date (YYYY-MM-DD)    |
| `end_date`     | DATEONLY      | NOT NULL                 | End date (YYYY-MM-DD)      |
| `status`       | ENUM          | DEFAULT 'upcoming'       | Cycle status               |
| `project_id`   | UUID          | FK -> projects.id        | Parent project             |
| `created_at`   | TIMESTAMP     | auto                     | Creation timestamp         |
| `updated_at`   | TIMESTAMP     | auto                     | Last update timestamp      |

**Status Enum Values:** `upcoming`, `active`, `completed`

### `members`

| Column          | Type          | Constraints                    | Description                              |
| --------------- | ------------- | ------------------------------ | ---------------------------------------- |
| `id`            | UUID          | PK, auto-generated             | Unique identifier                        |
| `name`          | VARCHAR(255)  | NOT NULL                       | Member's full name                       |
| `email`         | VARCHAR(255)  | UNIQUE, NOT NULL               | Email address                            |
| `avatar_url`    | VARCHAR(500)  | nullable                       | Profile picture URL                      |
| `password_hash` | VARCHAR(255)  | nullable                       | bcrypt hash (null for Google-only users) |
| `google_id`     | VARCHAR(255)  | UNIQUE, nullable               | Google OAuth user ID                     |
| `provider`      | VARCHAR(50)   | NOT NULL, DEFAULT `'local'`    | Auth provider: `local` or `google`       |
| `created_at`    | TIMESTAMP     | auto                           | Creation timestamp                       |
| `updated_at`    | TIMESTAMP     | auto                           | Last update timestamp                    |

**Security:** The `password_hash` column is excluded from all queries by default via Sequelize's `defaultScope`. It is only included when using the `withPassword` scope (used internally by the auth service).

**Default Seed Data:** On first startup, if no members exist, three default members are created with password `password123` (bcrypt-hashed):
- Alwin Kunjachan (alwin@example.com)
- Jane Smith (jane@example.com)
- Bob Johnson (bob@example.com)

### `labels`

| Column         | Type          | Constraints              | Description                |
| -------------- | ------------- | ------------------------ | -------------------------- |
| `id`           | UUID          | PK, auto-generated       | Unique identifier          |
| `name`         | VARCHAR(100)  | UNIQUE, NOT NULL         | Label name                 |
| `color`        | VARCHAR(7)    | NOT NULL                 | Hex color (e.g., #ef4444)  |
| `created_at`   | TIMESTAMP     | auto                     | Creation timestamp         |
| `updated_at`   | TIMESTAMP     | auto                     | Last update timestamp      |

Labels are **global** (not project-scoped) and shared across all projects.

### `issue_labels` (Junction Table)

| Column     | Type | Constraints                      | Description      |
| ---------- | ---- | -------------------------------- | ---------------- |
| `issue_id` | UUID | PK, FK -> issues.id, ON DELETE CASCADE | Issue reference   |
| `label_id` | UUID | PK, FK -> labels.id, ON DELETE CASCADE | Label reference   |

No timestamps on this table.

## Associations

| Relationship               | Type         | Foreign Key    | Notes                                   |
| -------------------------- | ------------ | -------------- | --------------------------------------- |
| Project -> Issues          | hasMany      | `project_id`   |                                         |
| Project -> Cycles          | hasMany      | `project_id`   |                                         |
| Issue -> Project           | belongsTo    | `project_id`   |                                         |
| Issue -> Member (assignee) | belongsTo    | `assignee_id`  | Alias: `assignee`                       |
| Issue -> Cycle             | belongsTo    | `cycle_id`     |                                         |
| Issue <-> Label            | belongsToMany| `issue_labels` | Through junction table                  |
| Cycle -> Project           | belongsTo    | `project_id`   |                                         |
| Cycle -> Issues            | hasMany      | `cycle_id`     |                                         |
| Member -> Issues           | hasMany      | `assignee_id`  | Alias: `assignedIssues`                 |

## Database Configuration

Configuration is loaded from environment variables (see `.env.example`):

```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=linear_clone
DB_USER=postgres
DB_PASSWORD=postgres
```

The Sequelize instance uses:
- `underscored: true` - Maps camelCase model fields to snake_case columns
- `timestamps: true` - Auto-manages `created_at` and `updated_at`
- `sync()` - Auto-creates/alters tables on startup (development only)
