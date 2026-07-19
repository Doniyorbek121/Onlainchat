import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import type {
  Character,
  Conversation,
  Message,
  MessageRole,
  User,
} from "../types";
import {
  genId,
  type CharacterInput,
  type CharacterUpdate,
  type DataStore,
  type ListCharactersOpts,
  type UserInput,
} from "./store";

/* eslint-disable @typescript-eslint/no-explicit-any */

const DB_PATH =
  process.env.DATABASE_PATH || path.join(process.cwd(), "data", "onlainchat.db");

function mapUser(r: any): User {
  return {
    id: r.id,
    username: r.username,
    email: r.email,
    displayName: r.display_name,
    createdAt: r.created_at,
  };
}
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

export function createSqliteStore(): DataStore {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("busy_timeout = 5000");
  db.pragma("foreign_keys = ON");

  return {
    async init() {
      db.exec(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY, username TEXT NOT NULL UNIQUE, email TEXT NOT NULL UNIQUE,
          display_name TEXT NOT NULL DEFAULT '', password_hash TEXT NOT NULL, created_at INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS sessions (
          token TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
        CREATE TABLE IF NOT EXISTS characters (
          id TEXT PRIMARY KEY, name TEXT NOT NULL, tagline TEXT NOT NULL DEFAULT '',
          description TEXT NOT NULL DEFAULT '', greeting TEXT NOT NULL DEFAULT '',
          persona TEXT NOT NULL DEFAULT '', avatar_emoji TEXT NOT NULL DEFAULT '🤖',
          avatar_color TEXT NOT NULL DEFAULT '#7c5cff', category TEXT NOT NULL DEFAULT 'Assistant',
          visibility TEXT NOT NULL DEFAULT 'public', creator_id TEXT NOT NULL,
          creator_name TEXT NOT NULL DEFAULT 'Anonymous', interactions INTEGER NOT NULL DEFAULT 0,
          created_at INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS conversations (
          id TEXT PRIMARY KEY, character_id TEXT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
          user_id TEXT NOT NULL, title TEXT NOT NULL DEFAULT 'New chat',
          created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS messages (
          id TEXT PRIMARY KEY, conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
          role TEXT NOT NULL, content TEXT NOT NULL, created_at INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_conv_user ON conversations(user_id, updated_at DESC);
        CREATE INDEX IF NOT EXISTS idx_conv_char ON conversations(character_id);
        CREATE INDEX IF NOT EXISTS idx_msg_conv ON messages(conversation_id, created_at ASC);
        CREATE INDEX IF NOT EXISTS idx_char_cat ON characters(category);
      `);
    },

    async createUser(input: UserInput) {
      const row = {
        id: `user_${genId()}`,
        username: input.username,
        email: input.email,
        displayName: input.displayName || input.username,
        passwordHash: input.passwordHash,
        createdAt: Date.now(),
      };
      db.prepare(
        `INSERT INTO users (id, username, email, display_name, password_hash, created_at)
         VALUES (@id, @username, @email, @displayName, @passwordHash, @createdAt)`
      ).run(row);
      return (await this.getUserById(row.id))!;
    },
    async getUserById(id) {
      const r = db.prepare(`SELECT * FROM users WHERE id = ?`).get(id);
      return r ? mapUser(r) : null;
    },
    async getUserAuthByLogin(login) {
      const r = db
        .prepare(
          `SELECT * FROM users WHERE lower(email) = lower(?) OR lower(username) = lower(?)`
        )
        .get(login, login) as any;
      return r ? { user: mapUser(r), passwordHash: r.password_hash } : null;
    },
    async userExists(username, email) {
      const r = db
        .prepare(
          `SELECT 1 FROM users WHERE lower(username) = lower(?) OR lower(email) = lower(?) LIMIT 1`
        )
        .get(username, email);
      return Boolean(r);
    },
    async createSession(userId, ttlMs) {
      const token = `${genId()}${genId()}`;
      const now = Date.now();
      db.prepare(
        `INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)`
      ).run(token, userId, now, now + ttlMs);
      await this.deleteExpiredSessions();
      return token;
    },
    async getSessionUser(token) {
      const r = db
        .prepare(`SELECT user_id, expires_at FROM sessions WHERE token = ?`)
        .get(token) as any;
      if (!r) return null;
      if (r.expires_at < Date.now()) {
        await this.deleteSession(token);
        return null;
      }
      return this.getUserById(r.user_id);
    },
    async deleteSession(token) {
      db.prepare(`DELETE FROM sessions WHERE token = ?`).run(token);
    },
    async deleteExpiredSessions() {
      return db.prepare(`DELETE FROM sessions WHERE expires_at < ?`).run(Date.now())
        .changes;
    },
    async reassignOwnership(fromId, toId) {
      if (fromId === toId) return;
      db.transaction(() => {
        db.prepare(`UPDATE characters SET creator_id = ? WHERE creator_id = ?`).run(
          toId,
          fromId
        );
        db.prepare(`UPDATE conversations SET user_id = ? WHERE user_id = ?`).run(
          toId,
          fromId
        );
      })();
    },

    async createCharacter(input: CharacterInput) {
      const row = { id: genId(), ...input, interactions: 0, createdAt: Date.now() };
      db.prepare(
        `INSERT INTO characters
          (id, name, tagline, description, greeting, persona, avatar_emoji,
           avatar_color, category, visibility, creator_id, creator_name, interactions, created_at)
         VALUES
          (@id, @name, @tagline, @description, @greeting, @persona, @avatarEmoji,
           @avatarColor, @category, @visibility, @creatorId, @creatorName, @interactions, @createdAt)`
      ).run(row);
      return (await this.getCharacter(row.id))!;
    },
    async getCharacter(id) {
      const r = db.prepare(`SELECT * FROM characters WHERE id = ?`).get(id);
      return r ? mapCharacter(r) : null;
    },
    async listCharacters(opts: ListCharactersOpts = {}) {
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
          `SELECT * FROM characters ${where} ORDER BY interactions DESC, created_at DESC LIMIT ${limit}`
        )
        .all(params);
      return rows.map(mapCharacter);
    },
    async updateCharacter(id, creatorId, update: CharacterUpdate) {
      const res = db
        .prepare(
          `UPDATE characters SET
             name = @name, tagline = @tagline, description = @description,
             greeting = @greeting, persona = @persona, avatar_emoji = @avatarEmoji,
             avatar_color = @avatarColor, category = @category, visibility = @visibility
           WHERE id = @id AND creator_id = @creatorId`
        )
        .run({ ...update, id, creatorId });
      if (res.changes === 0) return null;
      return this.getCharacter(id);
    },
    async incrementInteractions(id) {
      db.prepare(
        `UPDATE characters SET interactions = interactions + 1 WHERE id = ?`
      ).run(id);
    },
    async deleteCharacter(id, creatorId) {
      return (
        db.prepare(`DELETE FROM characters WHERE id = ? AND creator_id = ?`).run(
          id,
          creatorId
        ).changes > 0
      );
    },
    async countCharacters() {
      return (db.prepare(`SELECT COUNT(*) AS c FROM characters`).get() as any).c;
    },

    async createConversation(characterId, userId, title = "New chat") {
      const now = Date.now();
      const row = { id: genId(), characterId, userId, title, createdAt: now, updatedAt: now };
      db.prepare(
        `INSERT INTO conversations (id, character_id, user_id, title, created_at, updated_at)
         VALUES (@id, @characterId, @userId, @title, @createdAt, @updatedAt)`
      ).run(row);
      return {
        id: row.id,
        characterId,
        userId,
        title,
        createdAt: now,
        updatedAt: now,
      };
    },
    async getConversation(id) {
      const r = db.prepare(`SELECT * FROM conversations WHERE id = ?`).get(id);
      return r ? mapConversation(r) : null;
    },
    async listConversationsForUser(userId) {
      const rows = db
        .prepare(
          `SELECT * FROM conversations WHERE user_id = ? ORDER BY updated_at DESC LIMIT 100`
        )
        .all(userId);
      return rows.map(mapConversation);
    },
    async findConversation(characterId, userId) {
      const r = db
        .prepare(
          `SELECT * FROM conversations WHERE character_id = ? AND user_id = ?
           ORDER BY updated_at DESC LIMIT 1`
        )
        .get(characterId, userId);
      return r ? mapConversation(r) : null;
    },
    async touchConversation(id, title) {
      if (title) {
        db.prepare(`UPDATE conversations SET updated_at = ?, title = ? WHERE id = ?`).run(
          Date.now(),
          title,
          id
        );
      } else {
        db.prepare(`UPDATE conversations SET updated_at = ? WHERE id = ?`).run(
          Date.now(),
          id
        );
      }
    },
    async deleteConversation(id, userId) {
      return (
        db.prepare(`DELETE FROM conversations WHERE id = ? AND user_id = ?`).run(
          id,
          userId
        ).changes > 0
      );
    },

    async addMessage(conversationId, role, content) {
      const row = { id: genId(), conversationId, role, content, createdAt: Date.now() };
      db.prepare(
        `INSERT INTO messages (id, conversation_id, role, content, created_at)
         VALUES (@id, @conversationId, @role, @content, @createdAt)`
      ).run(row);
      return { id: row.id, conversationId, role, content, createdAt: row.createdAt };
    },
    async listMessages(conversationId) {
      const rows = db
        .prepare(
          `SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC`
        )
        .all(conversationId);
      return rows.map(mapMessage);
    },
  };
}
