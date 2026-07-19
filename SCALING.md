# Scaling & Operations

This document is an honest map of what the codebase already does to stay fast
and safe under load, and what infrastructure you must add to serve very large
traffic (millions of users). The application is **stateless** apart from two
clearly-marked spots, so it scales horizontally by running more instances behind
a load balancer.

## What the app already does

- **Stateless app servers.** No per-user state lives in process memory (except
  the rate limiter — see below). Run N replicas behind a load balancer; any
  request can hit any instance.
- **Postgres backend** (`DATABASE_URL`) with a connection pool (`PG_POOL_MAX`),
  parameterised queries, and indexes on every hot lookup (sessions, favorites,
  conversations, messages, characters). SQLite is dev-only.
- **Bounded work per request.** Discovery lists are capped (`LIMIT 200`); chat
  only sends the **last 40 messages** to the model (full history stays in the
  DB), so prompt size and token cost don't grow without limit.
- **Health probe** at `GET /api/health` (checks DB connectivity) for load
  balancers / Kubernetes readiness & liveness.
- **Streaming** responses (SSE) so long generations don't hold a buffer.
- **Security hardening:** `scrypt` password hashing, **hashed session tokens**
  (only a SHA-256 of the token is stored), single-use hashed password-reset
  tokens, CSRF (double-submit + same-origin), per-client rate limiting, and
  private-character access control enforced on every route.
- **Admin surface** at `/admin` (role- or `ADMIN_EMAILS`-gated) to moderate
  users and characters.

## What to add for very large scale

These require infrastructure that can't live inside a single app process:

1. **Shared rate limiting (required for multi-instance).**
   `src/lib/rateLimit.ts` is an in-memory fixed window — it protects **per
   instance**, not globally. Back it with **Redis** (or Upstash/Cloudflare
   rate limiting at the edge) so limits are enforced across all replicas. The
   `rateLimit()` signature is small and swappable.

2. **Managed Postgres with connection pooling & read replicas.**
   Put **PgBouncer** (transaction pooling) in front of Postgres so thousands of
   app connections collapse onto a small server pool. Send read-only queries
   (discovery, profiles) to **read replicas**; keep writes on the primary.

3. **CDN + caching.** Serve static assets and cache public, read-heavy pages
   (discovery, public profiles) at the edge with a short TTL. The app is already
   `force-dynamic` where correctness needs it; relax to ISR/cache where it's
   safe.

4. **Object storage for avatars.** Avatars are currently small inlined data
   URLs (fine to start). At scale, upload to **S3/R2** and store a URL instead,
   to keep rows small and let the CDN serve images.

5. **Denormalised counters.** `favorites` count is computed with a subquery per
   row. For very hot lists, maintain a counter column (or a materialised view)
   updated on favorite/unfavorite.

6. **Background jobs & observability.** Move email sending and cleanup to a
   queue; add metrics/tracing (OpenTelemetry), structured logs, and alerting on
   the health probe and DB pool saturation.

7. **Autoscaling & limits.** Horizontal Pod Autoscaler (or your platform's
   equivalent) keyed on CPU / request latency; set sane per-request timeouts and
   `max_tokens`.

## Migrations

Schema is created idempotently on boot (`CREATE TABLE IF NOT EXISTS` + additive
`ALTER … IF NOT EXISTS`). For large fleets, run migrations as a **separate
deploy step** rather than relying on boot-time creation, so all instances start
against a known schema.
