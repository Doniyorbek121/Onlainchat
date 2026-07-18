import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import type {
  Character,
  Conversation,
  Message,
  MessageRole,
} from "./types";

// ---------------------------------------------------------------------------
// Connection (singleton across hot reloads in dev)
// ---------------------------------------------------------------------------

const DB_PATH =
  process.env.DATABASE_PATH || path.join(process.cwd(), "data", "onlainchat.db");

const globalForDb = globalThis as unknown as { __db?: Database.Database };

function createConnection(): Database.Database {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const conn = new Database(DB_PATH);
  conn.pragma("journal_mode = WAL");
  conn.pragma("busy_timeout = 5000");
  conn.pragma("foreign_keys = ON");
  migrate(conn);
  return conn;
}

/**
 * Lazily-initialised connection. Connecting on first query (not at module
 * import) keeps `next build`'s page-data collection from opening the database
 * across parallel workers, which would race on the schema migration.
 */
function getDb(): Database.Database {
  return globalForDb.__db ?? (globalForDb.__db = createConnection());
}

/** Backwards-compatible accessor used throughout the data layer. */
const db = new Proxy({} as Database.Database, {
  get(_t, prop) {
    const conn = getDb();
    const value = (conn as unknown as Record<string | symbol, unknown>)[prop];
    return typeof value === "function" ? value.bind(conn) : value;
  },
});

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

function migrate(database: Database.Database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS characters (
      id            TEXT PRIMARY KEY,
      name          TEXT NOT NULL,
      tagline       TEXT NOT NULL DEFAULT '',
      description   TEXT NOT NULL DEFAULT '',
      greeting      TEXT NOT NULL DEFAULT '',
      persona       TEXT NOT NULL DEFAULT '',
      avatar_emoji  TEXT NOT NULL DEFAULT '🤖',
      avatar_color  TEXT NOT NULL DEFAULT '#7c5cff',
      category      TEXT NOT NULL DEFAULT 'Assistant',
      visibility    TEXT NOT NULL DEFAULT 'public',
      creator_id    TEXT NOT NULL,
      creator_name  TEXT NOT NULL DEFAULT 'Anonymous',
      interactions  INTEGER NOT NULL DEFAULT 0,
      created_at    INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS conversations (
      id            TEXT PRIMARY KEY,
      character_id  TEXT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
      user_id       TEXT NOT NULL,
      title         TEXT NOT NULL DEFAULT 'New chat',
      created_at    INTEGER NOT NULL,
      updated_at    INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS messages (
      id               TEXT PRIMARY KEY,
      conversation_id  TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      role             TEXT NOT NULL,
      content          TEXT NOT NULL,
      created_at       INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_conv_user ON conversations(user_id, updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_conv_char ON conversations(character_id);
    CREATE INDEX IF NOT EXISTS idx_msg_conv ON messages(conversation_id, created_at ASC);
    CREATE INDEX IF NOT EXISTS idx_char_cat ON characters(category);
  `);
}

// ---------------------------------------------------------------------------
// Row mappers
// ---------------------------------------------------------------------------

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapCharacter(r: any): Character {
  return {
    id: r.id,
    name: r.name,
    tagline: r.tagline,
    description: r.description,
    greeting: r.greeting,
    persona: r.persona,
    avatarEmoji: r.avatar_emoji,
    avatarColor: r.avatar_color,
    category: r.category,
    visibility: r.visibility,
    creatorId: r.creator_id,
    creatorName: r.creator_name,
    interactions: r.interactions,
    createdAt: r.created_at,
  };
}

function mapConversation(r: any): Conversation {
  return {
    id: r.id,
    characterId: r.character_id,
    userId: r.user_id,
    title: r.title,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function mapMessage(r: any): Message {
  return {
    id: r.id,
    conversationId: r.conversation_id,
    role: r.role as MessageRole,
    content: r.content,
    createdAt: r.created_at,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

const id = () =>
  `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;

// ---------------------------------------------------------------------------
// Character queries
// ---------------------------------------------------------------------------

export interface CharacterInput {
  name: string;
  tagline: string;
  description: string;
  greeting: string;
  persona: string;
  avatarEmoji: string;
  avatarColor: string;
  category: string;
  visibility: "public" | "private";
  creatorId: string;
  creatorName: string;
}

export function createCharacter(input: CharacterInput): Character {
  const row = {
    id: id(),
    ...input,
    interactions: 0,
    createdAt: Date.now(),
  };
  db.prepare(
    `INSERT INTO characters
      (id, name, tagline, description, greeting, persona, avatar_emoji,
       avatar_color, category, visibility, creator_id, creator_name,
       interactions, created_at)
     VALUES
      (@id, @name, @tagline, @description, @greeting, @persona, @avatarEmoji,
       @avatarColor, @category, @visibility, @creatorId, @creatorName,
       @interactions, @createdAt)`
  ).run(row);
  return getCharacter(row.id)!;
}

export function getCharacter(characterId: string): Character | null {
  const r = db
    .prepare(`SELECT * FROM characters WHERE id = ?`)
    .get(characterId);
  return r ? mapCharacter(r) : null;
}

export function listCharacters(opts: {
  category?: string;
  search?: string;
  creatorId?: string;
  limit?: number;
} = {}): Character[] {
  const clauses: string[] = [];
  const params: Record<string, unknown> = {};

  if (opts.creatorId) {
    clauses.push(`creator_id = @creatorId`);
    params.creatorId = opts.creatorId;
  } else {
    clauses.push(`visibility = 'public'`);
  }
  if (opts.category && opts.category !== "All") {
    clauses.push(`category = @category`);
    params.category = opts.category;
  }
  if (opts.search) {
    clauses.push(`(name LIKE @q OR tagline LIKE @q OR description LIKE @q)`);
    params.q = `%${opts.search}%`;
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const limit = opts.limit ?? 200;

  const rows = db
    .prepare(
      `SELECT * FROM characters ${where}
       ORDER BY interactions DESC, created_at DESC
       LIMIT ${limit}`
    )
    .all(params);
  return rows.map(mapCharacter);
}

export function incrementInteractions(characterId: string) {
  db.prepare(
    `UPDATE characters SET interactions = interactions + 1 WHERE id = ?`
  ).run(characterId);
}

export function deleteCharacter(characterId: string, creatorId: string): boolean {
  const res = db
    .prepare(`DELETE FROM characters WHERE id = ? AND creator_id = ?`)
    .run(characterId, creatorId);
  return res.changes > 0;
}

// ---------------------------------------------------------------------------
// Conversation queries
// ---------------------------------------------------------------------------

export function createConversation(
  characterId: string,
  userId: string,
  title = "New chat"
): Conversation {
  const now = Date.now();
  const row = {
    id: id(),
    characterId,
    userId,
    title,
    createdAt: now,
    updatedAt: now,
  };
  db.prepare(
    `INSERT INTO conversations
      (id, character_id, user_id, title, created_at, updated_at)
     VALUES (@id, @characterId, @userId, @title, @createdAt, @updatedAt)`
  ).run(row);
  return mapConversation({
    id: row.id,
    character_id: characterId,
    user_id: userId,
    title,
    created_at: now,
    updated_at: now,
  });
}

export function getConversation(conversationId: string): Conversation | null {
  const r = db
    .prepare(`SELECT * FROM conversations WHERE id = ?`)
    .get(conversationId);
  return r ? mapConversation(r) : null;
}

export function listConversationsForUser(userId: string): Conversation[] {
  const rows = db
    .prepare(
      `SELECT * FROM conversations WHERE user_id = ? ORDER BY updated_at DESC LIMIT 100`
    )
    .all(userId);
  return rows.map(mapConversation);
}

export function findConversation(
  characterId: string,
  userId: string
): Conversation | null {
  const r = db
    .prepare(
      `SELECT * FROM conversations WHERE character_id = ? AND user_id = ?
       ORDER BY updated_at DESC LIMIT 1`
    )
    .get(characterId, userId);
  return r ? mapConversation(r) : null;
}

export function touchConversation(conversationId: string, title?: string) {
  if (title) {
    db.prepare(
      `UPDATE conversations SET updated_at = ?, title = ? WHERE id = ?`
    ).run(Date.now(), title, conversationId);
  } else {
    db.prepare(`UPDATE conversations SET updated_at = ? WHERE id = ?`).run(
      Date.now(),
      conversationId
    );
  }
}

export function deleteConversation(conversationId: string, userId: string): boolean {
  const res = db
    .prepare(`DELETE FROM conversations WHERE id = ? AND user_id = ?`)
    .run(conversationId, userId);
  return res.changes > 0;
}

// ---------------------------------------------------------------------------
// Message queries
// ---------------------------------------------------------------------------

export function addMessage(
  conversationId: string,
  role: MessageRole,
  content: string
): Message {
  const row = {
    id: id(),
    conversationId,
    role,
    content,
    createdAt: Date.now(),
  };
  db.prepare(
    `INSERT INTO messages (id, conversation_id, role, content, created_at)
     VALUES (@id, @conversationId, @role, @content, @createdAt)`
  ).run(row);
  return {
    id: row.id,
    conversationId,
    role,
    content,
    createdAt: row.createdAt,
  };
}

export function listMessages(conversationId: string): Message[] {
  const rows = db
    .prepare(
      `SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC`
    )
    .all(conversationId);
  return rows.map(mapMessage);
}

export function countCharacters(): number {
  const r = db.prepare(`SELECT COUNT(*) AS c FROM characters`).get() as {
    c: number;
  };
  return r.c;
}
