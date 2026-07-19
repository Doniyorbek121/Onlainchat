import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import type {
  Character,
  Conversation,
  Message,
  MessageRole,
  Report,
  ReportStatus,
  User,
} from "../types";
import {
  genId,
  type CharacterInput,
  type CharacterUpdate,
  type DataStore,
  type ListCharactersOpts,
  type ReportInput,
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
    role: r.role === "admin" ? "admin" : "user",
    emailVerified: Boolean(r.email_verified),
    createdAt: r.created_at,
  };
}
function mapAudit(r: any) {
  return {
    id: r.id,
    adminId: r.admin_id,
    action: r.action,
    targetType: r.target_type ?? "",
    targetId: r.target_id ?? "",
    createdAt: r.created_at,
  };
}
function mapReport(r: any): Report {
  return {
    id: r.id,
    targetType: r.target_type,
    targetId: r.target_id,
    reporterId: r.reporter_id,
    reason: r.reason,
    details: r.details ?? "",
    status: r.status,
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
    avatarImage: r.avatar_image ?? "",
    category: r.category,
    visibility: r.visibility,
    creatorId: r.creator_id,
    creatorName: r.creator_name,
    interactions: r.interactions,
    favorites: r.favorites ?? 0,
    createdAt: r.created_at,
  };
}

const CHAR_SELECT = `SELECT characters.*,
  (SELECT COUNT(*) FROM favorites f WHERE f.character_id = characters.id) AS favorites
  FROM characters`;
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
          display_name TEXT NOT NULL DEFAULT '', password_hash TEXT NOT NULL,
          role TEXT NOT NULL DEFAULT 'user', email_verified INTEGER NOT NULL DEFAULT 0,
          created_at INTEGER NOT NULL
        );
        -- The 'token' column stores a SHA-256 hash of the session token.
        CREATE TABLE IF NOT EXISTS sessions (
          token TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
        CREATE TABLE IF NOT EXISTS password_resets (
          token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_resets_user ON password_resets(user_id);
        CREATE TABLE IF NOT EXISTS email_verifications (
          token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_verif_user ON email_verifications(user_id);
        CREATE TABLE IF NOT EXISTS reports (
          id TEXT PRIMARY KEY, target_type TEXT NOT NULL, target_id TEXT NOT NULL,
          reporter_id TEXT NOT NULL, reason TEXT NOT NULL, details TEXT NOT NULL DEFAULT '',
          status TEXT NOT NULL DEFAULT 'open', created_at INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status, created_at DESC);
        CREATE TABLE IF NOT EXISTS audit_log (
          id TEXT PRIMARY KEY, admin_id TEXT NOT NULL, action TEXT NOT NULL,
          target_type TEXT NOT NULL DEFAULT '', target_id TEXT NOT NULL DEFAULT '',
          created_at INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at DESC);
        CREATE TABLE IF NOT EXISTS characters (
          id TEXT PRIMARY KEY, name TEXT NOT NULL, tagline TEXT NOT NULL DEFAULT '',
          description TEXT NOT NULL DEFAULT '', greeting TEXT NOT NULL DEFAULT '',
          persona TEXT NOT NULL DEFAULT '', avatar_emoji TEXT NOT NULL DEFAULT '🤖',
          avatar_color TEXT NOT NULL DEFAULT '#7c5cff', avatar_image TEXT NOT NULL DEFAULT '',
          category TEXT NOT NULL DEFAULT 'Assistant',
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
        CREATE TABLE IF NOT EXISTS favorites (
          user_id TEXT NOT NULL,
          character_id TEXT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
          created_at INTEGER NOT NULL,
          PRIMARY KEY (user_id, character_id)
        );
        CREATE INDEX IF NOT EXISTS idx_conv_user ON conversations(user_id, updated_at DESC);
        CREATE INDEX IF NOT EXISTS idx_conv_char ON conversations(character_id);
        CREATE INDEX IF NOT EXISTS idx_msg_conv ON messages(conversation_id, created_at ASC);
        CREATE INDEX IF NOT EXISTS idx_char_cat ON characters(category);
        CREATE INDEX IF NOT EXISTS idx_fav_char ON favorites(character_id);
        CREATE INDEX IF NOT EXISTS idx_fav_user ON favorites(user_id, created_at DESC);
        -- Hot discovery path: public list ordered by popularity/recency,
        -- optionally filtered by category; plus owner ("my characters") lists.
        CREATE INDEX IF NOT EXISTS idx_char_public
          ON characters(visibility, interactions DESC, created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_char_viscat
          ON characters(visibility, category, interactions DESC);
        CREATE INDEX IF NOT EXISTS idx_char_creator
          ON characters(creator_id, created_at DESC);
      `);
      // Add columns introduced after initial release (existing DBs).
      const cols = db
        .prepare(`PRAGMA table_info(characters)`)
        .all()
        .map((c: any) => c.name);
      if (!cols.includes("avatar_image")) {
        db.exec(
          `ALTER TABLE characters ADD COLUMN avatar_image TEXT NOT NULL DEFAULT ''`
        );
      }
      const userCols = db
        .prepare(`PRAGMA table_info(users)`)
        .all()
        .map((c: any) => c.name);
      if (!userCols.includes("role")) {
        db.exec(
          `ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user'`
        );
      }
      if (!userCols.includes("email_verified")) {
        db.exec(
          `ALTER TABLE users ADD COLUMN email_verified INTEGER NOT NULL DEFAULT 0`
        );
      }
    },
    async ping() {
      db.prepare(`SELECT 1`).get();
      return true;
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
    async getUserByUsername(username) {
      const r = db
        .prepare(`SELECT * FROM users WHERE lower(username) = lower(?)`)
        .get(username);
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
    async createSession(userId, tokenHash, ttlMs) {
      const now = Date.now();
      db.prepare(
        `INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)`
      ).run(tokenHash, userId, now, now + ttlMs);
      await this.deleteExpiredSessions();
    },
    async getSessionUser(tokenHash) {
      const r = db
        .prepare(`SELECT user_id, expires_at FROM sessions WHERE token = ?`)
        .get(tokenHash) as any;
      if (!r) return null;
      if (r.expires_at < Date.now()) {
        await this.deleteSession(tokenHash);
        return null;
      }
      return this.getUserById(r.user_id);
    },
    async deleteSession(tokenHash) {
      db.prepare(`DELETE FROM sessions WHERE token = ?`).run(tokenHash);
    },
    async deleteExpiredSessions() {
      return db.prepare(`DELETE FROM sessions WHERE expires_at < ?`).run(Date.now())
        .changes;
    },
    async deleteUserSessions(userId) {
      db.prepare(`DELETE FROM sessions WHERE user_id = ?`).run(userId);
    },
    async getUserByEmail(email) {
      const r = db
        .prepare(`SELECT * FROM users WHERE lower(email) = lower(?)`)
        .get(email);
      return r ? mapUser(r) : null;
    },
    async updateUserPassword(userId, passwordHash) {
      db.prepare(`UPDATE users SET password_hash = ? WHERE id = ?`).run(
        passwordHash,
        userId
      );
    },
    async createPasswordReset(userId, tokenHash, ttlMs) {
      db.prepare(`DELETE FROM password_resets WHERE expires_at < ?`).run(Date.now());
      const now = Date.now();
      db.prepare(
        `INSERT INTO password_resets (token_hash, user_id, created_at, expires_at)
         VALUES (?, ?, ?, ?)`
      ).run(tokenHash, userId, now, now + ttlMs);
    },
    async getValidPasswordReset(tokenHash) {
      const r = db
        .prepare(
          `SELECT user_id, expires_at FROM password_resets WHERE token_hash = ?`
        )
        .get(tokenHash) as any;
      if (!r) return null;
      if (r.expires_at < Date.now()) {
        await this.deletePasswordReset(tokenHash);
        return null;
      }
      return { userId: r.user_id };
    },
    async deletePasswordReset(tokenHash) {
      db.prepare(`DELETE FROM password_resets WHERE token_hash = ?`).run(tokenHash);
    },
    async markEmailVerified(userId) {
      db.prepare(`UPDATE users SET email_verified = 1 WHERE id = ?`).run(userId);
    },
    async createEmailVerification(userId, tokenHash, ttlMs) {
      db.prepare(`DELETE FROM email_verifications WHERE expires_at < ?`).run(Date.now());
      const now = Date.now();
      db.prepare(
        `INSERT INTO email_verifications (token_hash, user_id, created_at, expires_at)
         VALUES (?, ?, ?, ?)`
      ).run(tokenHash, userId, now, now + ttlMs);
    },
    async getValidEmailVerification(tokenHash) {
      const r = db
        .prepare(
          `SELECT user_id, expires_at FROM email_verifications WHERE token_hash = ?`
        )
        .get(tokenHash) as any;
      if (!r) return null;
      if (r.expires_at < Date.now()) {
        await this.deleteEmailVerification(tokenHash);
        return null;
      }
      return { userId: r.user_id };
    },
    async deleteEmailVerification(tokenHash) {
      db.prepare(`DELETE FROM email_verifications WHERE token_hash = ?`).run(tokenHash);
    },
    async createReport(input: ReportInput) {
      const row = {
        id: `rep_${genId()}`,
        ...input,
        details: input.details || "",
        status: "open",
        createdAt: Date.now(),
      };
      db.prepare(
        `INSERT INTO reports (id, target_type, target_id, reporter_id, reason, details, status, created_at)
         VALUES (@id, @targetType, @targetId, @reporterId, @reason, @details, @status, @createdAt)`
      ).run(row);
      return mapReport({
        id: row.id,
        target_type: row.targetType,
        target_id: row.targetId,
        reporter_id: row.reporterId,
        reason: row.reason,
        details: row.details,
        status: row.status,
        created_at: row.createdAt,
      });
    },
    async listReports(status, limit) {
      const capped = Math.min(Math.max(limit, 1), 200);
      const rows =
        status === "all"
          ? db
              .prepare(
                `SELECT * FROM reports ORDER BY created_at DESC LIMIT ${capped}`
              )
              .all()
          : db
              .prepare(
                `SELECT * FROM reports WHERE status = ? ORDER BY created_at DESC LIMIT ${capped}`
              )
              .all(status);
      return rows.map(mapReport);
    },
    async updateReportStatus(id, status: ReportStatus) {
      return (
        db.prepare(`UPDATE reports SET status = ? WHERE id = ?`).run(status, id)
          .changes > 0
      );
    },
    async countOpenReports() {
      return (
        db.prepare(`SELECT COUNT(*) AS c FROM reports WHERE status = 'open'`).get() as any
      ).c;
    },
    async addAuditLog(input) {
      db.prepare(
        `INSERT INTO audit_log (id, admin_id, action, target_type, target_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      ).run(
        `aud_${genId()}`,
        input.adminId,
        input.action,
        input.targetType,
        input.targetId,
        Date.now()
      );
    },
    async listAuditLog(limit) {
      const capped = Math.min(Math.max(limit, 1), 200);
      return db
        .prepare(`SELECT * FROM audit_log ORDER BY created_at DESC LIMIT ${capped}`)
        .all()
        .map(mapAudit);
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
      const row = {
        id: genId(),
        ...input,
        avatarImage: input.avatarImage || "",
        interactions: 0,
        createdAt: Date.now(),
      };
      db.prepare(
        `INSERT INTO characters
          (id, name, tagline, description, greeting, persona, avatar_emoji,
           avatar_color, avatar_image, category, visibility, creator_id, creator_name, interactions, created_at)
         VALUES
          (@id, @name, @tagline, @description, @greeting, @persona, @avatarEmoji,
           @avatarColor, @avatarImage, @category, @visibility, @creatorId, @creatorName, @interactions, @createdAt)`
      ).run(row);
      return (await this.getCharacter(row.id))!;
    },
    async getCharacter(id) {
      const r = db.prepare(`${CHAR_SELECT} WHERE characters.id = ?`).get(id);
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
      const limit = Math.min(Math.max(opts.limit ?? 200, 1), 200);
      const offset = Math.max(opts.offset ?? 0, 0);
      const rows = db
        .prepare(
          `${CHAR_SELECT} ${where} ORDER BY interactions DESC, created_at DESC LIMIT ${limit} OFFSET ${offset}`
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
             avatar_color = @avatarColor, avatar_image = @avatarImage,
             category = @category, visibility = @visibility
           WHERE id = @id AND creator_id = @creatorId`
        )
        .run({ ...update, avatarImage: update.avatarImage || "", id, creatorId });
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
    async deleteLastAssistantMessage(conversationId) {
      const res = db
        .prepare(
          `DELETE FROM messages WHERE id = (
             SELECT id FROM messages
             WHERE conversation_id = ? AND role = 'assistant'
             ORDER BY created_at DESC LIMIT 1
           )`
        )
        .run(conversationId);
      return res.changes > 0;
    },

    async addFavorite(userId, characterId) {
      db.prepare(
        `INSERT OR IGNORE INTO favorites (user_id, character_id, created_at)
         VALUES (?, ?, ?)`
      ).run(userId, characterId, Date.now());
    },
    async removeFavorite(userId, characterId) {
      db.prepare(
        `DELETE FROM favorites WHERE user_id = ? AND character_id = ?`
      ).run(userId, characterId);
    },
    async isFavorited(userId, characterId) {
      const r = db
        .prepare(
          `SELECT 1 FROM favorites WHERE user_id = ? AND character_id = ? LIMIT 1`
        )
        .get(userId, characterId);
      return Boolean(r);
    },
    async listFavoriteCharacters(userId) {
      const rows = db
        .prepare(
          `${CHAR_SELECT}
           JOIN favorites fav ON fav.character_id = characters.id
           WHERE fav.user_id = ?
           ORDER BY fav.created_at DESC LIMIT 200`
        )
        .all(userId);
      return rows.map(mapCharacter);
    },

    async countUsers() {
      return (db.prepare(`SELECT COUNT(*) AS c FROM users`).get() as any).c;
    },
    async countConversations() {
      return (db.prepare(`SELECT COUNT(*) AS c FROM conversations`).get() as any)
        .c;
    },
    async countMessages() {
      return (db.prepare(`SELECT COUNT(*) AS c FROM messages`).get() as any).c;
    },
    async countUsersSince(sinceMs) {
      return (
        db
          .prepare(`SELECT COUNT(*) AS c FROM users WHERE created_at >= ?`)
          .get(sinceMs) as any
      ).c;
    },
    async countCharactersSince(sinceMs) {
      return (
        db
          .prepare(`SELECT COUNT(*) AS c FROM characters WHERE created_at >= ?`)
          .get(sinceMs) as any
      ).c;
    },
    async countMessagesSince(sinceMs) {
      return (
        db
          .prepare(`SELECT COUNT(*) AS c FROM messages WHERE created_at >= ?`)
          .get(sinceMs) as any
      ).c;
    },
    async listRecentUsers(limit) {
      const rows = db
        .prepare(`SELECT * FROM users ORDER BY created_at DESC LIMIT ?`)
        .all(limit);
      return rows.map(mapUser);
    },
    async listRecentCharacters(limit) {
      const rows = db
        .prepare(`${CHAR_SELECT} ORDER BY created_at DESC LIMIT ?`)
        .all(limit);
      return rows.map(mapCharacter);
    },
    async deleteUserCascade(userId) {
      const exists = db
        .prepare(`SELECT 1 FROM users WHERE id = ?`)
        .get(userId);
      if (!exists) return false;
      db.transaction(() => {
        db.prepare(`DELETE FROM characters WHERE creator_id = ?`).run(userId);
        db.prepare(`DELETE FROM conversations WHERE user_id = ?`).run(userId);
        db.prepare(`DELETE FROM favorites WHERE user_id = ?`).run(userId);
        db.prepare(`DELETE FROM users WHERE id = ?`).run(userId); // cascades sessions/resets
      })();
      return true;
    },
    async adminDeleteCharacter(id) {
      return db.prepare(`DELETE FROM characters WHERE id = ?`).run(id).changes > 0;
    },
  };
}
