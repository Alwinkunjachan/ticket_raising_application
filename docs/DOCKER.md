# Docker Deployment Guide

This guide covers running Sprintly with Docker Compose. The setup includes four services: **PostgreSQL**, **Redis**, **Express API server**, and **Angular client (nginx)**.

## Architecture

```
                        ┌──────────────┐
                        │   Browser    │
                        └──────┬───────┘
                               │ :80
                        ┌──────▼───────┐
                        │    nginx     │
                        │   (client)   │
                        └──┬───────┬───┘
             static files  │       │  /api/*
           (Angular SPA)   │       │
                           │  ┌────▼──────┐
                           │  │  Express   │
                           │  │  (server)  │ :3000
                           │  └──┬─────┬──┘
                           │     │     │
                     ┌─────▼─┐ ┌─▼──┐ ┌▼─────┐
                     │ nginx │ │ PG │ │Redis │
                     │ files │ │    │ │     │
                     └───────┘ └────┘ └──────┘
                                :5432   :6379
```

- **nginx** serves the Angular production build and reverse-proxies `/api/*` requests to the Express server.
- **Express server** connects to PostgreSQL and Redis using Docker internal networking.
- **PostgreSQL** and **Redis** persist data in named Docker volumes.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) (v20+)
- [Docker Compose](https://docs.docker.com/compose/install/) (v2+, included with Docker Desktop)

## Quick Start

### 1. Create the environment file

```bash
cp .env.docker .env
```

Edit `.env` and set secure values for the **required** secrets:

```bash
# Generate strong secrets
openssl rand -base64 48  # Use output for JWT_ACCESS_SECRET
openssl rand -base64 48  # Use output for JWT_REFRESH_SECRET
openssl rand -base64 48  # Use output for SESSION_SECRET
```

### 2. Build and start all services

```bash
docker compose up -d --build
```

### 3. Run database migration

The migration creates tables and seeds the default admin user and labels:

```bash
docker compose run --rm migrate
```

### 4. Access the application

Open **http://localhost** in your browser.

Default admin credentials (from `.env`):
- Email: `admin@sprintly.io`
- Password: `password123`

## Services

| Service    | Image              | Port  | Description                          |
|------------|--------------------|-------|--------------------------------------|
| `client`   | nginx:1.27-alpine  | 80    | Angular SPA + API reverse proxy      |
| `server`   | node:18-alpine     | 3000  | Express API server                   |
| `postgres` | postgres:16-alpine | 5432  | PostgreSQL database                  |
| `redis`    | redis:7-alpine     | 6379  | Redis cache (optional, graceful degradation) |
| `migrate`  | node:18-alpine     | —     | One-shot: creates tables + admin + labels |
| `seed`     | node:18-alpine     | —     | One-shot: seeds sample data (projects, issues, etc.) |
| `reset`    | node:18-alpine     | —     | One-shot: wipes all data, re-seeds admin + labels |

## Environment Variables

All variables are configured in the root `.env` file. See [.env.docker](../.env.docker) for the full template.

### Required

| Variable             | Description                       |
|----------------------|-----------------------------------|
| `JWT_ACCESS_SECRET`  | Secret for signing access tokens  |
| `JWT_REFRESH_SECRET` | Secret for signing refresh tokens |
| `SESSION_SECRET`     | Express session secret            |

### Optional

| Variable               | Default                  | Description                      |
|------------------------|--------------------------|----------------------------------|
| `DB_USER`              | `postgres`               | PostgreSQL username              |
| `DB_PASSWORD`          | `postgres`               | PostgreSQL password              |
| `DB_NAME`              | `sprintly`               | Database name                    |
| `NODE_ENV`             | `production`             | Server environment               |
| `JWT_ACCESS_EXPIRES_IN`| `15m`                    | Access token TTL                 |
| `JWT_REFRESH_EXPIRES_IN`| `7d`                   | Refresh token TTL                |
| `CLIENT_URL`           | `http://localhost`       | Client URL (CORS + OAuth)        |
| `GOOGLE_CLIENT_ID`     | *(empty)*                | Google OAuth client ID           |
| `GOOGLE_CLIENT_SECRET` | *(empty)*                | Google OAuth client secret       |
| `GOOGLE_CALLBACK_URL`  | `http://localhost/api/v1/auth/google/callback` | OAuth callback URL |
| `ADMIN_EMAIL`          | `admin@sprintly.io`      | Default admin email              |
| `ADMIN_NAME`           | `Admin`                  | Default admin display name       |
| `ADMIN_PASSWORD`       | `password123`            | Default admin password           |

## Common Commands

### Start services
```bash
docker compose up -d
```

### Rebuild after code changes
```bash
docker compose up -d --build
```

### View logs
```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f server
```

### Database management
```bash
docker compose run --rm migrate    # Create tables + admin + labels (safe to re-run)
docker compose run --rm seed       # Seed sample data for testing
docker compose run --rm reset      # Wipe everything, re-seed admin + labels
```

### Stop services
```bash
docker compose down
```

### Stop and remove all data (volumes)
```bash
docker compose down -v
```

### Check service health
```bash
# Docker service status
docker compose ps

# API health endpoint
curl http://localhost/health
```

### Access a running container
```bash
docker compose exec server sh
docker compose exec postgres psql -U postgres -d sprintly
docker compose exec redis redis-cli
```

## Data Persistence

Data is stored in named Docker volumes:

| Volume      | Service    | Purpose                    |
|-------------|------------|----------------------------|
| `pgdata`    | `postgres` | Database files             |
| `redisdata` | `redis`    | Redis persistence (AOF/RDB)|

To back up the database:
```bash
docker compose exec postgres pg_dump -U postgres sprintly > backup.sql
```

To restore:
```bash
cat backup.sql | docker compose exec -T postgres psql -U postgres -d sprintly
```

## Production Considerations

1. **Change all default secrets** — generate strong random values for `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `SESSION_SECRET`, and `DB_PASSWORD`.

2. **Change default admin password** — update `ADMIN_PASSWORD` in `.env` before running migration, or change it through the app after first login.

3. **HTTPS** — place a reverse proxy (Traefik, Caddy, or another nginx instance) in front of the client container with TLS termination. Update `CLIENT_URL` and `GOOGLE_CALLBACK_URL` to use `https://`.

4. **Resource limits** — add `deploy.resources.limits` in `docker-compose.yml` for production workloads.

5. **Logging** — configure a centralized logging driver (e.g., `json-file` with rotation, or a log aggregator).

6. **Backups** — schedule regular PostgreSQL backups using `pg_dump` (see Data Persistence section above).

## Troubleshooting

### Server cannot connect to database
- Ensure the `postgres` service is healthy: `docker compose ps`
- Check postgres logs: `docker compose logs postgres`
- Verify `DB_*` variables match between services

### Migration fails
- Check that PostgreSQL is running and healthy before running `migrate`
- Review migration logs: `docker compose run --rm migrate`
- The migration is idempotent — safe to re-run

### Redis unavailable warnings
- Redis is optional. The server logs a warning but continues without caching.
- Check Redis status: `docker compose logs redis`

### Client shows blank page
- Check that the Angular build succeeded: `docker compose logs client`
- Verify nginx is proxying correctly: `curl http://localhost/api/v1/auth/me` (should return 401, not 502)

### Google OAuth not working
- Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env`
- Update `GOOGLE_CALLBACK_URL` to match your domain
- Add the callback URL to Google Cloud Console authorized redirect URIs
