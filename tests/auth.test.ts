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
beforeAll(async () => {
  auth = await import("@/lib/auth");
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
