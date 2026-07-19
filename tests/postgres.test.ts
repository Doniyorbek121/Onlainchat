import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { DataStore } from "@/lib/db/store";

// Only runs when a Postgres URL is provided (e.g. locally or a CI service).
const URL = process.env.TEST_DATABASE_URL;

/* eslint-disable @typescript-eslint/no-explicit-any */
describe.skipIf(!URL)("postgres backend", () => {
  let store: DataStore;
  const suffix = Math.random().toString(36).slice(2, 8);

  beforeAll(async () => {
    const { createPostgresStore } = await import("@/lib/db/postgres");
    store = createPostgresStore(URL!);
    await store.init();
  });

  afterAll(async () => {
    // Best-effort cleanup of this run's rows via public API.
    const mine = await store.listCharacters({ creatorId: `owner_${suffix}` });
    for (const c of mine) await store.deleteCharacter(c.id, `owner_${suffix}`);
  });

  it("users: create, case-insensitive login, exists", async () => {
    const u = await store.createUser({
      username: `alice_${suffix}`,
      email: `alice_${suffix}@ex.com`,
      displayName: "Alice",
      passwordHash: "hash",
    });
    expect((await store.getUserById(u.id))?.username).toBe(`alice_${suffix}`);
    const found = await store.getUserAuthByLogin(`ALICE_${suffix}@EX.COM`);
    expect(found?.passwordHash).toBe("hash");
    expect(await store.userExists(`alice_${suffix}`, "x@y.com")).toBe(true);
  });

  it("sessions: valid vs expired", async () => {
    const u = await store.createUser({
      username: `bob_${suffix}`,
      email: `bob_${suffix}@ex.com`,
      displayName: "Bob",
      passwordHash: "h",
    });
    const good = await store.createSession(u.id, 60_000);
    expect((await store.getSessionUser(good))?.id).toBe(u.id);
    const expired = await store.createSession(u.id, -1000);
    expect(await store.getSessionUser(expired)).toBeNull();
  });

  it("password reset: token lifecycle + password update", async () => {
    const u = await store.createUser({
      username: `carol_${suffix}`,
      email: `carol_${suffix}@ex.com`,
      displayName: "Carol",
      passwordHash: "old",
    });
    expect((await store.getUserByEmail(`CAROL_${suffix}@EX.COM`))?.id).toBe(u.id);

    await store.createPasswordReset(u.id, `hash_${suffix}`, 60_000);
    expect((await store.getValidPasswordReset(`hash_${suffix}`))?.userId).toBe(u.id);

    await store.createPasswordReset(u.id, `expired_${suffix}`, -1000);
    expect(await store.getValidPasswordReset(`expired_${suffix}`)).toBeNull();

    await store.updateUserPassword(u.id, "newhash");
    expect((await store.getUserAuthByLogin(`carol_${suffix}`))?.passwordHash).toBe("newhash");

    await store.deletePasswordReset(`hash_${suffix}`);
    expect(await store.getValidPasswordReset(`hash_${suffix}`)).toBeNull();
  });

  it("characters: ownership on update/delete, private hidden, cascade", async () => {
    const owner = `owner_${suffix}`;
    const other = `other_${suffix}`;
    const base = {
      name: "Hero",
      tagline: "t",
      description: "d",
      greeting: "hi",
      persona: "p",
      avatarEmoji: "🤖",
      avatarColor: "#7c5cff",
      category: "Games",
      creatorId: owner,
      creatorName: "Owner",
    };

    const pub = await store.createCharacter({ ...base, visibility: "public" });
    const priv = await store.createCharacter({ ...base, visibility: "private" });

    expect(await store.updateCharacter(pub.id, other, { ...pub, name: "X" })).toBeNull();
    expect((await store.updateCharacter(pub.id, owner, { ...pub, name: "Renamed" }))?.name).toBe("Renamed");

    const ownerList = await store.listCharacters({ creatorId: owner });
    expect(ownerList.some((x: any) => x.id === priv.id)).toBe(true);
    const publicList = await store.listCharacters({ search: "Hero" });
    expect(publicList.some((x: any) => x.id === priv.id)).toBe(false);

    const conv = await store.createConversation(pub.id, owner, "chat");
    await store.addMessage(conv.id, "user", "hello");
    await store.addMessage(conv.id, "assistant", "hi");
    expect(await store.listMessages(conv.id)).toHaveLength(2);

    // Regenerate: drop only the trailing assistant message
    expect(await store.deleteLastAssistantMessage(conv.id)).toBe(true);
    expect((await store.listMessages(conv.id)).map((m: any) => m.role)).toEqual([
      "user",
    ]);
    await store.addMessage(conv.id, "assistant", "hi2");

    expect(await store.deleteCharacter(pub.id, other)).toBe(false);
    expect(await store.deleteCharacter(pub.id, owner)).toBe(true);
    expect(await store.getConversation(conv.id)).toBeNull();
    expect(await store.listMessages(conv.id)).toHaveLength(0);
  });
});
