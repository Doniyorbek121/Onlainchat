import type { NextRequest } from "next/server";
import type Redis from "ioredis";
import { logger } from "./logger";

interface Bucket {
  count: number;
  resetAt: number;
}

// In-memory fixed window. Used when REDIS_URL is not configured (single
// instance / dev). For multi-instance deployments set REDIS_URL so limits are
// enforced across all replicas.
const buckets = new Map<string, Bucket>();

// Opportunistic cleanup so the map can't grow unbounded.
let lastSweep = 0;
function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, b] of buckets) {
    if (b.resetAt < now) buckets.delete(key);
  }
}

export interface RateLimitResult {
  ok: boolean;
  retryAfter: number; // seconds
  remaining: number;
}

// ---------------------------------------------------------------------------
// Optional Redis backend (shared across instances)
// ---------------------------------------------------------------------------

let redisPromise: Promise<Redis | null> | null = null;

function getRedis(): Promise<Redis | null> {
  if (redisPromise) return redisPromise;
  const url = process.env.REDIS_URL;
  if (!url) {
    redisPromise = Promise.resolve(null);
    return redisPromise;
  }
  // Lazy dynamic import so ioredis is only loaded when actually configured,
  // and so this works under Next's ESM server runtime (no bare `require`).
  redisPromise = import("ioredis")
    .then(({ default: IORedis }) => {
      const client = new IORedis(url, {
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false,
        lazyConnect: false,
      });
      client.on("error", (err: Error) => {
        logger.warn("redis.error", { message: err.message });
      });
      logger.info("ratelimit.redis.enabled", {});
      return client;
    })
    .catch((err: unknown) => {
      logger.error("ratelimit.redis.init_failed", {
        message: (err as Error)?.message,
      });
      return null;
    });
  return redisPromise;
}

function inMemory(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  sweep(now);
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfter: 0, remaining: limit - 1 };
  }
  if (bucket.count >= limit) {
    return {
      ok: false,
      retryAfter: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
      remaining: 0,
    };
  }
  bucket.count += 1;
  return { ok: true, retryAfter: 0, remaining: limit - bucket.count };
}

/**
 * Fixed-window rate limit. Returns ok=false with retryAfter (seconds) when the
 * caller has exceeded `limit` requests within `windowMs`.
 *
 * Uses Redis when REDIS_URL is configured (shared across all instances),
 * otherwise an in-process map. If Redis is configured but unreachable it fails
 * open (allows the request) so a cache outage can't take down the whole app.
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult> {
  const client = await getRedis();
  if (!client) return inMemory(key, limit, windowMs);

  const redisKey = `rl:${key}`;
  try {
    // Atomic: increment the counter; on first hit set the window expiry.
    const results = await client
      .multi()
      .incr(redisKey)
      .pttl(redisKey)
      .exec();
    if (!results) return inMemory(key, limit, windowMs);

    const count = Number(results[0]?.[1] ?? 0);
    let ttl = Number(results[1]?.[1] ?? -1);
    if (ttl < 0) {
      await client.pexpire(redisKey, windowMs);
      ttl = windowMs;
    }
    if (count > limit) {
      return {
        ok: false,
        retryAfter: Math.max(1, Math.ceil(ttl / 1000)),
        remaining: 0,
      };
    }
    return { ok: true, retryAfter: 0, remaining: Math.max(0, limit - count) };
  } catch (err) {
    logger.warn("ratelimit.redis.fail_open", {
      message: (err as Error)?.message,
    });
    // Fail open rather than block legitimate traffic on a cache outage.
    return { ok: true, retryAfter: 0, remaining: limit };
  }
}

/** Derives a best-effort client identifier from proxy headers. */
export function clientKey(req: NextRequest, scope: string): string {
  const fwd = req.headers.get("x-forwarded-for");
  const ip =
    (fwd ? fwd.split(",")[0].trim() : "") ||
    req.headers.get("x-real-ip") ||
    "local";
  return `${scope}:${ip}`;
}
