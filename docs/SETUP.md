# Setup Guide

## Prerequisites

| Software       | Version  | Purpose                    |
| -------------- | -------- | -------------------------- |
| Node.js        | >= 18    | JavaScript runtime         |
| npm            | >= 9     | Package manager            |
| PostgreSQL     | >= 14    | Database                   |
| Redis          | >= 6     | Caching (optional)         |
| Angular CLI    | >= 19    | Frontend build tooling     |

### Install Angular CLI globally

```bash
npm install -g @angular/cli
```

## Database Setup

### 1. Install PostgreSQL

**macOS (Homebrew):**
```bash
brew install postgresql@16
brew services start postgresql@16
```

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

**Windows:**  
Download from [postgresql.org](https://www.postgresql.org/download/windows/) and run the installer.

### 2. Create the Database

```bash
psql -U postgres
```

```sql
CREATE DATABASE sprintly;
\q
```

Tables are created via the migration script (`npm run db:setup`), not via `sequelize.sync()`.

## Backend Setup

### 1. Navigate to the server directory

```bash
cd server
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment

```bash
cp ../.env.example .env
```

Edit `.env` with your credentials:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=sprintly
DB_USER=postgres
DB_PASSWORD=your_password_here
PORT=3000
NODE_ENV=development

# JWT Authentication
JWT_ACCESS_SECRET=your-strong-access-secret-here
JWT_REFRESH_SECRET=your-strong-refresh-secret-here
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Google OAuth (leave empty to disable Google SSO)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=http://localhost:3000/api/v1/auth/google/callback

# Session
SESSION_SECRET=your-session-secret-here

# Client URL
CLIENT_URL=http://localhost:4200

# Redis (optional — app degrades gracefully without it)
REDIS_URL=redis://localhost:6379
```

### 4. Run the database migration

```bash
npm run db:setup     # Create database, tables, admin user, and default labels
```

Optionally seed sample data (projects, cycles, issues, members) for testing:

```bash
npm run db:seed      # Seed sample data (idempotent — skips if projects exist)
npm run db:reset     # Wipe all data, re-seed admin + labels (use before re-seeding)
```

### 5. Start the development server

```bash
npm run dev
```

The API starts at `http://localhost:3000`. Verify with:

```bash
curl http://localhost:3000/health
# { "status": "ok", "redis": "connected" }
```

If Redis is not running, the response will show `"redis": "unavailable"` but the API works normally (queries go directly to PostgreSQL).

**Default admin credentials:**
- `alwin.kunjachan@zeronorth.com` / `password123`

## Frontend Setup

### 1. Navigate to the client directory

```bash
cd client
```

### 2. Install dependencies

```bash
npm install
```

### 3. Start the development server

```bash
ng serve
```

The app opens at `http://localhost:4200`. You will be redirected to the login page.

## Running Both Servers

Open two terminal windows:

**Terminal 1 - Backend:**
```bash
cd server
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd client
ng serve
```

## Build for Production

### Backend

```bash
cd server
npm run build
npm start
```

Compiled output goes to `dist/`.

### Frontend

```bash
cd client
ng build
```

Production build output goes to `dist/client/`.

## Common Issues

### PostgreSQL connection refused

Ensure PostgreSQL is running:
```bash
# macOS
brew services list | grep postgresql

# Linux
sudo systemctl status postgresql
```

### Port already in use

If port 3000 or 4200 is taken:

- Backend: Change `PORT` in `.env`
- Frontend: `ng serve --port 4300`

### Database does not exist

Run the migration script:
```bash
cd server && npm run db:setup
```

### Permission denied for PostgreSQL

Ensure your database user has proper privileges:
```sql
GRANT ALL PRIVILEGES ON DATABASE sprintly TO postgres;
```

## Google OAuth Setup (Optional)

Google SSO is optional. The app works with local email/password auth only. To enable Google sign-in:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select an existing one)
3. Navigate to **APIs & Services > Credentials**
4. Click **Create Credentials > OAuth client ID**
5. Application type: **Web application**
6. Authorized JavaScript origins: `http://localhost:3000`
7. Authorized redirect URIs: `http://localhost:3000/api/v1/auth/google/callback`
8. Copy the **Client ID** and **Client Secret** into your `server/.env`:
   ```env
   GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your-client-secret
   ```
9. Restart the server. The "Sign in with Google" button will now be functional.

## Environment Variables Reference

| Variable                | Default                        | Description                             |
| ----------------------- | ------------------------------ | --------------------------------------- |
| `DB_HOST`               | `localhost`                    | PostgreSQL host                         |
| `DB_PORT`               | `5432`                         | PostgreSQL port                         |
| `DB_NAME`               | `linear_clone`                 | Database name                           |
| `DB_USER`               | `postgres`                     | Database user                           |
| `DB_PASSWORD`           | (empty)                        | Database password                       |
| `PORT`                  | `3000`                         | Express server port                     |
| `NODE_ENV`              | `development`                  | Environment mode                        |
| `JWT_ACCESS_SECRET`     | `dev-access-secret-change-me`  | Secret for signing access tokens        |
| `JWT_REFRESH_SECRET`    | `dev-refresh-secret-change-me` | Secret for signing refresh tokens       |
| `JWT_ACCESS_EXPIRES_IN` | `15m`                          | Access token TTL                        |
| `JWT_REFRESH_EXPIRES_IN`| `7d`                           | Refresh token TTL                       |
| `GOOGLE_CLIENT_ID`      | (empty)                        | Google OAuth client ID (optional)       |
| `GOOGLE_CLIENT_SECRET`  | (empty)                        | Google OAuth client secret (optional)   |
| `GOOGLE_CALLBACK_URL`   | `http://localhost:3000/api/v1/auth/google/callback` | OAuth callback URL |
| `SESSION_SECRET`        | `dev-session-secret`           | Express session secret                  |
| `CLIENT_URL`            | `http://localhost:4200`        | Angular app URL (for CORS and redirects)|
| `REDIS_URL`             | `redis://localhost:6379`       | Redis connection URL (optional)         |
| `ADMIN_EMAIL`           | `alwin.kunjachan@zeronorth.com`| Admin email for migration seed          |
| `ADMIN_NAME`            | `Alwin Kunjachan`              | Admin name for migration seed           |
| `ADMIN_PASSWORD`        | `password123`                  | Admin password for migration seed       |

**Production note:** In production (`NODE_ENV=production`), the server will crash on startup if `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `SESSION_SECRET`, or `DB_PASSWORD` are not set.

## Redis Setup (Optional)

Redis provides caching to reduce database load. The application works fully without Redis — all cache operations gracefully degrade to direct PostgreSQL queries.

**macOS:**
```bash
brew install redis
brew services start redis
```

**Ubuntu/Debian:**
```bash
sudo apt install redis-server
sudo systemctl start redis
```

**Docker:**
```bash
docker run -d -p 6379:6379 redis
```

See [Redis Documentation](REDIS.md) for monitoring, cache key details, and troubleshooting.

## Docker Deployment (Alternative)

Instead of installing prerequisites locally, you can run the entire stack with Docker:

```bash
cp .env.docker .env            # Create env file from Docker template
# Edit .env — set JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, SESSION_SECRET

docker compose up -d --build   # Build and start all services
docker compose run --rm migrate  # Create tables and seed data
```

Open `http://localhost` in your browser.

See [Docker Guide](DOCKER.md) for full details, commands, and troubleshooting.
