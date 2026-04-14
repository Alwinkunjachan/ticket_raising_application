# Sprintly Commands Reference

## Local Development

### Prerequisites

```bash
# macOS
brew install node@18 postgresql@16 redis

# Start services
brew services start postgresql@16
brew services start redis
```

### Server (Express API — port 3000)

```bash
cd server
npm install
npm run dev              # Start dev server with nodemon (auto-reload)
npm run build            # Compile TypeScript to dist/
npm start                # Run compiled production build
npx tsc --noEmit         # Type-check without emitting files
```

### Client (Angular — port 4200)

```bash
cd client
npm install
npx ng serve             # Start dev server (http://localhost:4200)
npx ng build             # Production build to dist/client/
npx ng test              # Run unit tests via Karma
```

### Database Scripts (from `server/`)

```bash
npm run db:setup         # Create database, tables, seed admin + labels
npm run db:seed          # Seed sample data (projects, cycles, issues, members)
npm run db:reset         # Wipe all data, re-seed admin + labels, flush Redis
```

All scripts ensure the admin user and 8 default labels are always present.

### PostgreSQL CLI

```bash
# Connect to the database
psql -U postgres -d sprintly

# Useful psql commands inside the shell:
\l                       # List all databases
\c sprintly              # Connect to sprintly database
\dt                      # List all tables
\d issues                # View table structure
\q                       # Exit psql
```

```sql
-- Common queries
SELECT * FROM projects;
SELECT identifier, title, status, priority FROM issues;
SELECT id, name, email, role FROM members;
SELECT name, color FROM labels;
SELECT COUNT(*) FROM issues;
SELECT status, COUNT(*) FROM issues GROUP BY status;
```

### Redis CLI

```bash
redis-cli
KEYS sprintly:*          # List all cached keys
FLUSHALL                 # Clear all cached data
```

---

## Docker

### Initial Setup

```bash
# 1. Configure environment
cp .env.docker .env

# 2. Set required secrets in .env
#    JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, SESSION_SECRET
#    Generate with: openssl rand -base64 48

# 3. Build and start all services
docker compose up -d --build

# 4. Run database migration
docker compose run --rm migrate

# 5. (Optional) Seed sample data
docker compose run --rm seed

# 6. Open http://localhost in your browser
```

### Database Management

```bash
docker compose run --rm migrate    # Create tables + admin + labels (idempotent)
docker compose run --rm seed       # Seed sample data (skips if data exists)
docker compose run --rm reset      # Wipe all data, re-seed admin + labels
```

### Service Management

```bash
docker compose up -d               # Start all services
docker compose up -d --build       # Rebuild and start (after code changes)
docker compose down                # Stop all services
docker compose down -v             # Stop and remove all data (volumes)
docker compose ps                  # Check service status
docker compose restart server      # Restart a specific service
```

### Logs

```bash
docker compose logs -f             # Tail all service logs
docker compose logs -f server      # Tail server logs only
docker compose logs -f postgres    # Tail database logs only
```

### Container Access

```bash
docker compose exec server sh                              # Shell into server
docker compose exec postgres psql -U postgres -d sprintly  # Database shell
docker compose exec redis redis-cli                        # Redis shell
```

### Database Backup & Restore

```bash
# Backup
docker compose exec postgres pg_dump -U postgres sprintly > backup.sql

# Restore
docker compose exec -T postgres psql -U postgres -d sprintly < backup.sql
```

---

## Default Credentials

| Environment | Admin Email          | Password      |
|-------------|----------------------|---------------|
| Local dev   | alwin.kunjachan@zeronorth.com | password123 |
| Docker      | admin@sprintly.io    | password123   |

Sample members (after `db:seed`): `alice@sprintly.io`, `bob@sprintly.io`, `charlie@sprintly.io`, `diana@sprintly.io` — all use `password123`.
