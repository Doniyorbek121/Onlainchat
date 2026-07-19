import { describe, expect, it, beforeAll } from "vitest";

// Ensure the in-memory path (no Redis) is exercised.
delete process.env.REDIS_URL;

let rateLimit: typeof import("@/lib/rateLimit").rateLimit;
let resetRateLimit: typeof import("@/lib/rateLimit").resetRateLimit;

beforeAll(async () => {
  ({ rateLimit, resetRateLimit } = await import("@/lib/rateLimit"));
});

describe("rateLimit (in-memory)", () => {
  it("allows up to the limit then blocks", async () => {
    const key = `test-${Math.random()}`;
    const a = await rateLimit(key, 2, 60_000);
    const b = await rateLimit(key, 2, 60_000);
    const c = await rateLimit(key, 2, 60_000);
    expect(a.ok).toBe(true);
    expect(b.ok).toBe(true);
    expect(c.ok).toBe(false);
    expect(c.retryAfter).toBeGreaterThan(0);
  });

  it("resets after the window elapses", async () => {
    const key = `test-${Math.random()}`;
    const first = await rateLimit(key, 1, -1); // already-expired window
    const second = await rateLimit(key, 1, -1);
    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true); // previous window expired immediately
  });

  it("tracks remaining count", async () => {
    const key = `test-${Math.random()}`;
    const a = await rateLimit(key, 5, 60_000);
    expect(a.remaining).toBe(4);
  });

  it("resetRateLimit clears the counter (account-lockout unlock)", async () => {
    const key = `test-${Math.random()}`;
    await rateLimit(key, 1, 60_000); // exhaust
    expect((await rateLimit(key, 1, 60_000)).ok).toBe(false);
    await resetRateLimit(key);
    expect((await rateLimit(key, 1, 60_000)).ok).toBe(true);
  });
});
