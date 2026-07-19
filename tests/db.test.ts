import { beforeAll, describe, expect, it } from "vitest";
import os from "node:os";
import path from "node:path";
import fs from "node:fs";

// Point the data layer at a throwaway SQLite database before importing it.
const DB = path.join(
  os.tmpdir(),
  `oc-db-test-${Date.now()}-${Math.random().toString(36).slice(2)}.db`
);
process.env.DATABASE_PATH = DB;
delete process.env.DATABASE_URL; // force the SQLite backend

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
  it("creates and reads a user", async () => {
    const u = await db.createUser({
      username: "alice",
      email: "alice@example.com",
      displayName: "Alice",
      passwordHash: "hash",
    });
    expect(u.username).toBe("alice");
    expect((await db.getUserById(u.id))?.email).toBe("alice@example.com");
  });

  it("finds users case-insensitively by email or username", async () => {
    const found = await db.getUserAuthByLogin("ALICE@EXAMPLE.COM");
    expect(found?.user.username).toBe("alice");
    expect(found?.passwordHash).toBe("hash");
    expect((await db.getUserAuthByLogin("Alice"))?.user.username).toBe("alice");
  });

  it("detects existing username/email", async () => {
    expect(await db.userExists("alice", "x@y.com")).toBe(true);
    expect(await db.userExists("nobody", "none@none.com")).toBe(false);
  });
});

describe("sessions", () => {
  it("resolves a valid session and rejects an expired one", async () => {
    const u = await db.createUser({
      username: "bob",
      email: "bob@example.com",
      displayName: "Bob",
      passwordHash: "h",
    });
    await db.createSession(u.id, "hash_good", 60_000);
    expect((await db.getSessionUser("hash_good"))?.id).toBe(u.id);

    await db.createSession(u.id, "hash_expired", -1000);
    expect(await db.getSessionUser("hash_expired")).toBeNull();

    await db.deleteSession("hash_good");
    expect(await db.getSessionUser("hash_good")).toBeNull();
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

  it("updates only for the owner", async () => {
    const c = await make();
    expect(await db.updateCharacter(c.id, other, { ...c, name: "Hacked" })).toBeNull();
    const updated = await db.updateCharacter(c.id, owner, { ...c, name: "Renamed" });
    expect(updated?.name).toBe("Renamed");
  });

  it("deletes only for the owner", async () => {
    const c = await make();
    expect(await db.deleteCharacter(c.id, other)).toBe(false);
    expect(await db.deleteCharacter(c.id, owner)).toBe(true);
    expect(await db.getCharacter(c.id)).toBeNull();
  });

  it("hides private characters from the public listing but shows to owner", async () => {
    const pub = await make("public");
    const priv = await make("private");
    const publicList = await db.listCharacters();
    expect(publicList.some((x: any) => x.id === pub.id)).toBe(true);
    expect(publicList.some((x: any) => x.id === priv.id)).toBe(false);

    const ownerList = await db.listCharacters({ creatorId: owner });
    expect(ownerList.some((x: any) => x.id === priv.id)).toBe(true);
  });

  it("deletes only the most recent assistant message (for regenerate)", async () => {
    const c = await make();
    const conv = await db.createConversation(c.id, owner, "chat");
    await db.addMessage(conv.id, "user", "q1");
    await db.addMessage(conv.id, "assistant", "a1");
    await db.addMessage(conv.id, "user", "q2");
    await db.addMessage(conv.id, "assistant", "a2");

    expect(await db.deleteLastAssistantMessage(conv.id)).toBe(true);
    const after = await db.listMessages(conv.id);
    expect(after.map((m: any) => m.content)).toEqual(["q1", "a1", "q2"]);
    // No assistant left after another delete removes a1; then none remain
    expect(await db.deleteLastAssistantMessage(conv.id)).toBe(true);
    expect(await db.deleteLastAssistantMessage(conv.id)).toBe(false);
  });

  it("cascades conversations and messages on delete", async () => {
    const c = await make();
    const conv = await db.createConversation(c.id, owner, "chat");
    await db.addMessage(conv.id, "user", "hello");
    await db.addMessage(conv.id, "assistant", "hi there");
    expect(await db.listMessages(conv.id)).toHaveLength(2);

    await db.deleteCharacter(c.id, owner);
    expect(await db.getConversation(conv.id)).toBeNull();
    expect(await db.listMessages(conv.id)).toHaveLength(0);
  });

  it("favorites: toggle, count, list, and cascade", async () => {
    const c = await make();
    expect(await db.isFavorited("fan1", c.id)).toBe(false);

    await db.addFavorite("fan1", c.id);
    await db.addFavorite("fan1", c.id); // idempotent
    await db.addFavorite("fan2", c.id);
    expect(await db.isFavorited("fan1", c.id)).toBe(true);
    expect((await db.getCharacter(c.id))?.favorites).toBe(2);

    const favs = await db.listFavoriteCharacters("fan1");
    expect(favs.some((x: any) => x.id === c.id)).toBe(true);

    await db.removeFavorite("fan1", c.id);
    expect(await db.isFavorited("fan1", c.id)).toBe(false);
    expect((await db.getCharacter(c.id))?.favorites).toBe(1);

    await db.deleteCharacter(c.id, owner); // favorites cascade away
    expect(await db.listFavoriteCharacters("fan2")).toHaveLength(0);
    cleanup();
  });
});

describe("getUserByUsername", () => {
  it("finds a user case-insensitively", async () => {
    const u = await db.createUser({
      username: "ProfileUser",
      email: "prof@example.com",
      displayName: "Prof",
      passwordHash: "h",
    });
    expect(u.role).toBe("user");
    expect((await db.getUserByUsername("profileuser"))?.id).toBe(u.id);
    expect(await db.getUserByUsername("nobody")).toBeNull();
  });
});

describe("email verification", () => {
  it("marks verified and consumes single-use tokens", async () => {
    const u = await db.createUser({
      username: "verifyme",
      email: "verifyme@example.com",
      displayName: "V",
      passwordHash: "h",
    });
    expect((await db.getUserById(u.id))?.emailVerified).toBe(false);

    await db.createEmailVerification(u.id, "vhash_good", 60_000);
    expect((await db.getValidEmailVerification("vhash_good"))?.userId).toBe(u.id);

    await db.createEmailVerification(u.id, "vhash_expired", -1000);
    expect(await db.getValidEmailVerification("vhash_expired")).toBeNull();

    await db.markEmailVerified(u.id);
    expect((await db.getUserById(u.id))?.emailVerified).toBe(true);

    await db.deleteEmailVerification("vhash_good");
    expect(await db.getValidEmailVerification("vhash_good")).toBeNull();
  });
});

describe("reports", () => {
  it("creates, lists, counts and resolves reports", async () => {
    const before = await db.countOpenReports();
    const r = await db.createReport({
      targetType: "character",
      targetId: "char_x",
      reporterId: "user_reporter",
      reason: "spam",
      details: "looks fake",
    });
    expect(r.status).toBe("open");
    expect(await db.countOpenReports()).toBe(before + 1);

    const open = await db.listReports("open", 50);
    expect(open.some((x: any) => x.id === r.id)).toBe(true);

    expect(await db.updateReportStatus(r.id, "resolved")).toBe(true);
    expect(await db.countOpenReports()).toBe(before);
    const all = await db.listReports("all", 50);
    expect(all.find((x: any) => x.id === r.id)?.status).toBe("resolved");
  });
});

describe("pagination", () => {
  it("offsets the character listing", async () => {
    const owner = "pager";
    for (let i = 0; i < 3; i++) {
      await db.createCharacter({
        name: `Pager${i}`,
        tagline: "",
        description: "",
        greeting: "",
        persona: "p",
        avatarEmoji: "🤖",
        avatarColor: "#7c5cff",
        category: "Games",
        visibility: "public",
        creatorId: owner,
        creatorName: "Pager",
      });
    }
    const page1 = await db.listCharacters({ creatorId: owner, limit: 2, offset: 0 });
    const page2 = await db.listCharacters({ creatorId: owner, limit: 2, offset: 2 });
    expect(page1).toHaveLength(2);
    expect(page2.length).toBeGreaterThanOrEqual(1);
    const ids = new Set(page1.map((c: any) => c.id));
    expect(page2.every((c: any) => !ids.has(c.id))).toBe(true);
  });
});

describe("admin", () => {
  it("counts, lists, deletes characters and cascades a user", async () => {
    const u = await db.createUser({
      username: "adminvictim",
      email: "av@example.com",
      displayName: "AV",
      passwordHash: "h",
    });
    const c = await db.createCharacter({
      name: "Orphan",
      tagline: "t",
      description: "d",
      greeting: "hi",
      persona: "p",
      avatarEmoji: "🤖",
      avatarColor: "#7c5cff",
      category: "Games",
      visibility: "public",
      creatorId: u.id,
      creatorName: "AV",
    });
    const conv = await db.createConversation(c.id, u.id, "chat");
    await db.addMessage(conv.id, "user", "hi");

    expect(await db.countUsers()).toBeGreaterThan(0);
    expect(await db.countUsersSince(0)).toBeGreaterThan(0);
    expect(await db.countUsersSince(Date.now() + 1_000_000)).toBe(0);
    expect(await db.countCharactersSince(0)).toBeGreaterThan(0);
    expect(await db.countMessagesSince(0)).toBeGreaterThan(0);
    expect((await db.listRecentUsers(50)).some((x: any) => x.id === u.id)).toBe(
      true
    );

    // admin can delete any character regardless of owner
    const c2 = await db.createCharacter({
      name: "AnyDelete",
      tagline: "",
      description: "",
      greeting: "",
      persona: "p",
      avatarEmoji: "🤖",
      avatarColor: "#7c5cff",
      category: "Games",
      visibility: "public",
      creatorId: "someone_else",
      creatorName: "X",
    });
    expect(await db.adminDeleteCharacter(c2.id)).toBe(true);
    expect(await db.getCharacter(c2.id)).toBeNull();

    // audit log records admin actions
    await db.addAuditLog({
      adminId: "admin_1",
      action: "delete_character",
      targetType: "character",
      targetId: c2.id,
    });
    const audit = await db.listAuditLog(10);
    expect(audit[0].action).toBe("delete_character");
    expect(audit[0].adminId).toBe("admin_1");

    // deleting the user cascades their characters/conversations/messages
    expect(await db.deleteUserCascade(u.id)).toBe(true);
    expect(await db.getUserById(u.id)).toBeNull();
    expect(await db.getCharacter(c.id)).toBeNull();
    expect(await db.getConversation(conv.id)).toBeNull();
    expect(await db.deleteUserCascade(u.id)).toBe(false); // already gone
  });
});
