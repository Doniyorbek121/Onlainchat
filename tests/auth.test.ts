import { beforeAll, describe, expect, it, vi } from "vitest";
import os from "node:os";
import path from "node:path";

// next/headers requires a request scope; stub it so the module imports cleanly.
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: () => undefined,
    set: () => {},
    delete: () => {},
  }),
}));

process.env.DATABASE_PATH = path.join(
  os.tmpdir(),
  `oc-auth-test-${Date.now()}-${Math.random().toString(36).slice(2)}.db`
);
delete process.env.DATABASE_URL; // force the SQLite backend

/* eslint-disable @typescript-eslint/no-explicit-any */
let auth: any;
let db: any;
beforeAll(async () => {
  auth = await import("@/lib/auth");
  db = await import("@/lib/db");
});

describe("password hashing", () => {
  it("round-trips and rejects wrong passwords", () => {
    const hash = auth.hashPassword("correct horse battery");
    expect(hash).toContain(":");
    expect(auth.verifyPassword("correct horse battery", hash)).toBe(true);
    expect(auth.verifyPassword("wrong", hash)).toBe(false);
  });

  it("produces different hashes for the same password (salted)", () => {
    expect(auth.hashPassword("same")).not.toBe(auth.hashPassword("same"));
  });
});

describe("registerUser validation", () => {
  it("rejects short passwords", async () => {
    const r = await auth.registerUser({
      username: "validname",
      email: "a@b.com",
      password: "short",
    });
    expect(r.ok).toBe(false);
  });

  it("rejects bad usernames and emails", async () => {
    expect(
      (await auth.registerUser({ username: "a", email: "a@b.com", password: "longenough1" })).ok
    ).toBe(false);
    expect(
      (await auth.registerUser({ username: "gooduser", email: "not-an-email", password: "longenough1" })).ok
    ).toBe(false);
  });

  it("registers a valid user and blocks duplicates", async () => {
    const ok = await auth.registerUser({
      username: "charlie",
      email: "charlie@example.com",
      password: "supersecret1",
      displayName: "Charlie",
    });
    expect(ok.ok).toBe(true);
    expect(ok.user.displayName).toBe("Charlie");

    const dup = await auth.registerUser({
      username: "charlie",
      email: "other@example.com",
      password: "supersecret1",
    });
    expect(dup.ok).toBe(false);
  });
});

describe("loginUser", () => {
  it("accepts correct credentials and rejects wrong ones", async () => {
    await auth.registerUser({
      username: "dave",
      email: "dave@example.com",
      password: "supersecret1",
    });
    expect((await auth.loginUser("dave", "supersecret1")).ok).toBe(true);
    expect((await auth.loginUser("dave@example.com", "supersecret1")).ok).toBe(true);
    expect((await auth.loginUser("dave", "nope")).ok).toBe(false);
    expect((await auth.loginUser("ghost", "whatever")).ok).toBe(false);
  });
});

describe("password reset", () => {
  it("returns null for unknown emails, a token for known ones", async () => {
    await auth.registerUser({
      username: "erin",
      email: "erin@example.com",
      password: "supersecret1",
    });
    expect(await auth.requestPasswordReset("nobody@example.com")).toBeNull();
    const req = await auth.requestPasswordReset("ERIN@EXAMPLE.COM"); // case-insensitive
    expect(req?.token).toBeTruthy();
    expect(req.user.username).toBe("erin");
  });

  it("resets the password, is single-use, and invalidates sessions", async () => {
    const reg = await auth.registerUser({
      username: "frank",
      email: "frank@example.com",
      password: "oldpassword1",
    });
    const oldSession = reg.token;
    expect((await db.getSessionUser(oldSession))?.username).toBe("frank");

    const { token } = await auth.requestPasswordReset("frank@example.com");

    // Short password rejected
    expect((await auth.resetPassword(token, "short")).ok).toBe(false);

    // Valid reset
    expect((await auth.resetPassword(token, "newpassword1")).ok).toBe(true);

    // Old password no longer works, new one does
    expect((await auth.loginUser("frank", "oldpassword1")).ok).toBe(false);
    expect((await auth.loginUser("frank", "newpassword1")).ok).toBe(true);

    // Existing session invalidated
    expect(await db.getSessionUser(oldSession)).toBeNull();

    // Token is single-use
    expect((await auth.resetPassword(token, "another12")).ok).toBe(false);
  });

  it("rejects invalid tokens", async () => {
    expect((await auth.resetPassword("bogus-token", "whatever8")).ok).toBe(false);
  });
});
