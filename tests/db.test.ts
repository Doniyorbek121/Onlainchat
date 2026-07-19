import { beforeAll, describe, expect, it } from "vitest";
import os from "node:os";
import path from "node:path";
import fs from "node:fs";

// Point the data layer at a throwaway database before importing it.
const DB = path.join(
  os.tmpdir(),
  `oc-db-test-${Date.now()}-${Math.random().toString(36).slice(2)}.db`
);
process.env.DATABASE_PATH = DB;

/* eslint-disable @typescript-eslint/no-explicit-any */
let db: any;
beforeAll(async () => {
  db = await import("@/lib/db");
});

function cleanup() {
  for (const suffix of ["", "-wal", "-shm"]) {
    try {
      fs.unlinkSync(DB + suffix);
    } catch {
      /* ignore */
    }
  }
}

describe("users", () => {
  it("creates and reads a user", () => {
    const u = db.createUser({
      username: "alice",
      email: "alice@example.com",
      displayName: "Alice",
      passwordHash: "hash",
    });
    expect(u.username).toBe("alice");
    expect(db.getUserById(u.id)?.email).toBe("alice@example.com");
  });

  it("finds users case-insensitively by email or username", () => {
    const found = db.getUserAuthByLogin("ALICE@EXAMPLE.COM");
    expect(found?.user.username).toBe("alice");
    expect(found?.passwordHash).toBe("hash");
    expect(db.getUserAuthByLogin("Alice")?.user.username).toBe("alice");
  });

  it("detects existing username/email", () => {
    expect(db.userExists("alice", "x@y.com")).toBe(true);
    expect(db.userExists("nobody", "none@none.com")).toBe(false);
  });
});

describe("sessions", () => {
  it("resolves a valid session and rejects an expired one", () => {
    const u = db.createUser({
      username: "bob",
      email: "bob@example.com",
      displayName: "Bob",
      passwordHash: "h",
    });
    const good = db.createSession(u.id, 60_000);
    expect(db.getSessionUser(good)?.id).toBe(u.id);

    const expired = db.createSession(u.id, -1000); // already expired
    expect(db.getSessionUser(expired)).toBeNull();

    db.deleteSession(good);
    expect(db.getSessionUser(good)).toBeNull();
  });
});

describe("characters", () => {
  const owner = "user_owner";
  const other = "user_other";

  function make(visibility: "public" | "private" = "public") {
    return db.createCharacter({
      name: "Hero",
      tagline: "t",
      description: "d",
      greeting: "hi",
      persona: "p",
      avatarEmoji: "🤖",
      avatarColor: "#7c5cff",
      category: "Games",
      visibility,
      creatorId: owner,
      creatorName: "Owner",
    });
  }

  it("updates only for the owner", () => {
    const c = make();
    expect(
      db.updateCharacter(c.id, other, { ...c, name: "Hacked" })
    ).toBeNull();
    const updated = db.updateCharacter(c.id, owner, { ...c, name: "Renamed" });
    expect(updated?.name).toBe("Renamed");
  });

  it("deletes only for the owner", () => {
    const c = make();
    expect(db.deleteCharacter(c.id, other)).toBe(false);
    expect(db.deleteCharacter(c.id, owner)).toBe(true);
    expect(db.getCharacter(c.id)).toBeNull();
  });

  it("hides private characters from the public listing but shows to owner", () => {
    const pub = make("public");
    const priv = make("private");
    const publicList = db.listCharacters();
    expect(publicList.some((x: any) => x.id === pub.id)).toBe(true);
    expect(publicList.some((x: any) => x.id === priv.id)).toBe(false);

    const ownerList = db.listCharacters({ creatorId: owner });
    expect(ownerList.some((x: any) => x.id === priv.id)).toBe(true);
  });

  it("cascades conversations and messages on delete", () => {
    const c = make();
    const conv = db.createConversation(c.id, owner, "chat");
    db.addMessage(conv.id, "user", "hello");
    db.addMessage(conv.id, "assistant", "hi there");
    expect(db.listMessages(conv.id)).toHaveLength(2);

    db.deleteCharacter(c.id, owner);
    expect(db.getConversation(conv.id)).toBeNull();
    expect(db.listMessages(conv.id)).toHaveLength(0);
    cleanup();
  });
});
