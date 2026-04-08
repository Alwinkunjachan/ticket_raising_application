# Redis Caching

Sprintly uses Redis as an optional caching layer to reduce PostgreSQL load. The application degrades gracefully without Redis — all endpoints continue to work by falling through to the database.

## Setup

### Requirements

- Redis 6+ running on `localhost:6379` (default) or configured via `REDIS_URL`

### Installation

```bash
# macOS
brew install redis && brew services start redis

# Docker
docker run -d -p 6379:6379 redis

# Ubuntu/Debian
sudo apt install redis-server && sudo systemctl start redis
```

### Configuration

Add to `server/.env`:

```
REDIS_URL=redis://localhost:6379
```

If `REDIS_URL` is omitted, the server defaults to `redis://localhost:6379`. If Redis is unreachable at startup, the server logs a warning and runs without caching.

## Architecture

### Cache-Aside (Lazy Loading) Pattern

Sprintly uses the **cache-aside** pattern:

```
READ path:
  1. Check Redis for cached data (cacheGet)
  2. If cache hit  -> return cached data (skip DB)
  3. If cache miss -> query PostgreSQL -> store result in Redis with TTL -> return data

WRITE path:
  1. Write to PostgreSQL
  2. Invalidate related cache keys (cacheInvalidate)
  3. Next read will repopulate cache from DB
```

Data is **never updated in place** in Redis. On every write, stale cache entries are deleted. The next read triggers a cache miss, fetches fresh data from PostgreSQL, and repopulates the cache.

### Key Files

| File | Purpose |
|------|---------|
| `server/src/config/redis.ts` | Redis connection singleton (ioredis). Uses `lazyConnect: true` so startup controls connection timing. Retries up to 10 times on disconnect. |
| `server/src/utils/cache.ts` | Cache utility functions. All operations are wrapped in try/catch and check `isRedisAvailable` — Redis errors never crash requests. |
| `server/src/config/environment.ts` | `env.redisUrl` from `REDIS_URL` env var |

### Cache Utility API (`server/src/utils/cache.ts`)

| Function | Description |
|----------|-------------|
| `cacheGet<T>(key)` | Fetches and JSON-parses a cached value. Returns `null` on miss or error. |
| `cacheSet(key, value, ttlSeconds)` | JSON-stringifies and stores a value with expiration. |
| `cacheDel(key)` | Deletes a single cache key. |
| `cacheInvalidate(pattern)` | Deletes all keys matching a glob pattern (e.g., `sprintly:issues:*`). Uses non-blocking `SCAN` + pipelined `DEL` instead of the blocking `KEYS` command. |
| `hashKey(prefix, params)` | Generates a deterministic cache key from an object of filter parameters. Sorts keys alphabetically, strips null/empty values, and produces a 16-character SHA-256 hex suffix. Used for issue/project list queries with variable filter combinations. |
| `setRedisAvailable(bool)` | Toggles the global availability flag. Set during startup. |
| `getRedisAvailable()` | Returns whether Redis is connected. Used by the `/health` endpoint. |

### Graceful Degradation

Every cache function checks `isRedisAvailable` before operating and wraps all Redis calls in try/catch. If Redis goes down mid-operation:

- All `cacheGet` calls return `null` (cache miss) -> DB query runs normally
- All `cacheSet` / `cacheDel` / `cacheInvalidate` calls silently no-op
- No request ever fails due to Redis

The `/health` endpoint reports Redis status:

```json
{ "status": "ok", "redis": "connected" }
{ "status": "ok", "redis": "unavailable" }
```

## What Gets Cached

### Per-Request Auth Lookup

**File:** `server/src/middleware/authenticate.ts`

Every authenticated request verifies the JWT and loads the `Member` from the database. This is the single most frequently executed query.

| Key | TTL | Data |
|-----|-----|------|
| `sprintly:member:{id}` | 5 min | Member record (without passwordHash, via defaultScope) |

On cache hit, the plain JSON is reconstructed into a Sequelize model instance via `Member.build()` so downstream code (`req.member.role`, etc.) works normally.

### Entity List & Detail Caches

| Entity | List Key Pattern | Detail Key Pattern | TTL | Rationale |
|--------|------------------|--------------------|-----|-----------|
| **Issues** | `sprintly:issues:list:{hash}` | `sprintly:issues:{id}` | 2 min | Highest frequency reads + writes. Short TTL balances freshness vs. load reduction. |
| **Projects** | `sprintly:projects:list:{hash}` | `sprintly:projects:{id}` | 5 min | Moderate frequency. Includes computed `issueCount` subquery. |
| **Cycles** | `sprintly:cycles:list:{hash}` | `sprintly:cycles:{id}` | 5 min | Moderate frequency. Loaded in sidebar + project detail. |
| **Members** | `sprintly:members:all`, `sprintly:members:users` | — | 10 min | Near-static reference data. Assignee dropdowns. |
| **Labels** | `sprintly:labels:all` | — | 1 hour | Very rarely changes. Used in every issue form. |
| **Analytics** | `sprintly:analytics:dashboard` | — | 10 min | Most expensive read (14 parallel aggregate queries). Admin-only. |

### How Filter-Based Cache Keys Work

Issue and project list queries accept variable filter combinations (projectId, status, priority, assigneeId, search, page, pageSize, etc.). The `hashKey()` function handles this:

```
GET /issues?projectId=abc&status=todo&page=1&pageSize=25
  -> hashKey('sprintly:issues:list', { projectId: 'abc', status: 'todo', page: '1', pageSize: '25' })
  -> 'sprintly:issues:list:a7f3b2c1e9d4f501'
```

- Parameters are sorted alphabetically and null/empty values stripped, so different query string orderings produce the same cache key
- Each unique filter combination gets its own cached entry
- On invalidation, `cacheInvalidate('sprintly:issues:*')` clears ALL issue-related keys regardless of filter combination

## Cache Invalidation

When data is written to PostgreSQL, related cache keys are deleted so the next read fetches fresh data.

### Invalidation Matrix

| Write Operation | Cache Keys Invalidated |
|-----------------|----------------------|
| **Issue create** | `sprintly:issues:*`, `sprintly:projects:*`, `sprintly:analytics:*` |
| **Issue update** | `sprintly:issues:*`, `sprintly:analytics:*` |
| **Issue delete** | `sprintly:issues:*`, `sprintly:projects:*`, `sprintly:analytics:*` |
| **Project create/update** | `sprintly:projects:*`, `sprintly:analytics:*` |
| **Project delete** | `sprintly:projects:*`, `sprintly:issues:*`, `sprintly:analytics:*` |
| **Cycle create/update/delete** | `sprintly:cycles:*`, `sprintly:analytics:*` |
| **Cycle completion** (manual or auto) | `sprintly:issues:*`, `sprintly:cycles:*`, `sprintly:analytics:*` |
| **Label create** | `sprintly:labels:*` |
| **Label update/delete** | `sprintly:labels:*`, `sprintly:issues:*` |
| **Member create/update** | `sprintly:members:*`, `sprintly:member:{id}` |
| **Member toggle block** | `sprintly:members:*`, `sprintly:member:{id}`, `sprintly:analytics:*` |
| **Auth register** | `sprintly:members:*` |
| **Google OAuth (new user)** | `sprintly:members:*` |
| **Google OAuth (link existing)** | `sprintly:member:{id}`, `sprintly:members:*` |

### Why Broad Invalidation?

Issue list cache keys are hashed from arbitrary filter combinations. When a single issue is updated, it could affect dozens of different cached list results (different pages, different status filters, etc.). Rather than tracking which specific cached lists contain the affected issue, all issue-related keys are invalidated at once.

This is safe because:
- Short TTLs (2 min for issues) mean cache rebuilds quickly even if invalidation fails
- `SCAN`-based deletion is non-blocking and efficient
- The alternative (surgical invalidation) would require complex dependency tracking for minimal benefit

### Background Job Invalidation

The hourly `checkExpiredCycles()` job in `server/src/index.ts` runs outside of HTTP request context. When it auto-completes expired cycles and moves issues to backlog, it invalidates `sprintly:issues:*`, `sprintly:cycles:*`, and `sprintly:analytics:*`.

## Monitoring

### Inspect Cached Keys

```bash
# List all Sprintly cache keys
redis-cli KEYS 'sprintly:*'

# Check a specific key's TTL (in seconds)
redis-cli TTL 'sprintly:labels:all'

# View a cached value
redis-cli GET 'sprintly:labels:all' | python3 -m json.tool

# Watch cache operations in real-time
redis-cli MONITOR

# Count total cached keys
redis-cli KEYS 'sprintly:*' | wc -l

# Flush all Sprintly keys (use with caution)
redis-cli --scan --pattern 'sprintly:*' | xargs redis-cli DEL
```

### Verifying Cache Behavior

1. **Cache hit**: Make a GET request twice. The first call queries PostgreSQL; the second returns from Redis (visible in `redis-cli MONITOR` as a GET command).

2. **Cache invalidation**: Create or update an entity, then check that related keys are gone:
   ```bash
   # Before: key exists
   redis-cli EXISTS 'sprintly:labels:all'  # 1
   
   # Create a label via API...
   
   # After: key is gone
   redis-cli EXISTS 'sprintly:labels:all'  # 0
   ```

3. **Graceful degradation**: Stop Redis (`redis-cli SHUTDOWN`), make API calls, verify all endpoints still return correct data from PostgreSQL.
