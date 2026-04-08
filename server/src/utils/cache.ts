import crypto from 'crypto';
import redis from '../config/redis';

let isRedisAvailable = false;

export function setRedisAvailable(available: boolean) {
  isRedisAvailable = available;
}

export function getRedisAvailable(): boolean {
  return isRedisAvailable;
}

/**
 * Deterministic cache key from an object of filter params.
 * Sorts keys alphabetically, removes undefined/null/empty values,
 * then SHA-256 hashes to a 16-char hex suffix.
 */
export function hashKey(prefix: string, params: Record<string, any>): string {
  const cleaned: Record<string, any> = {};
  for (const [k, v] of Object.entries(params).sort()) {
    if (v !== undefined && v !== null && v !== '') {
      cleaned[k] = v;
    }
  }
  const hash = crypto
    .createHash('sha256')
    .update(JSON.stringify(cleaned))
    .digest('hex')
    .slice(0, 16);
  return `${prefix}:${hash}`;
}

/** Get a cached value. Returns null on miss or if Redis is unavailable. */
export async function cacheGet<T>(key: string): Promise<T | null> {
  if (!isRedisAvailable) return null;
  try {
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

/** Set a cached value with TTL in seconds. */
export async function cacheSet(key: string, value: any, ttlSeconds: number): Promise<void> {
  if (!isRedisAvailable) return;
  try {
    await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  } catch {
    // Silently fail — DB is the source of truth
  }
}

/** Delete a specific key. */
export async function cacheDel(key: string): Promise<void> {
  if (!isRedisAvailable) return;
  try {
    await redis.del(key);
  } catch {
    // Silently fail
  }
}

/** Invalidate all keys matching a glob pattern using SCAN (non-blocking). */
export async function cacheInvalidate(pattern: string): Promise<void> {
  if (!isRedisAvailable) return;
  try {
    const stream = redis.scanStream({ match: pattern, count: 100 });
    const pipeline = redis.pipeline();
    let count = 0;
    for await (const keys of stream) {
      for (const key of keys as string[]) {
        pipeline.del(key);
        count++;
      }
    }
    if (count > 0) await pipeline.exec();
  } catch {
    // Silently fail
  }
}
