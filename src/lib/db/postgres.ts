import pg from "pg";
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

// BIGINT (int8, OID 20) comes back as a string by default; epoch-ms values fit
// safely in a JS number, so parse them to keep the numeric row types accurate.
pg.types.setTypeParser(20, (v) => (v === null ? null : parseInt(v, 10)));

function mapUser(r: any): User {
  return {
    id: r.id,
    username: r.username,
    email: r.email,
    displayName: r.display_name,
    role: r.role === "admin" ? "admin" : "user",
    createdAt: Number(r.created_at),
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
    interactions: Number(r.interactions),
    favorites: Number(r.favorites ?? 0),
    createdAt: Number(r.created_at),
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
    createdAt: Number(r.created_at),
    updatedAt: Number(r.updated_at),
  };
}
function mapMessage(r: any): Message {
  return {
    id: r.id,
    conversationId: r.conversation_id,
    role: r.role as MessageRole,
    content: r.content,
    createdAt: Number(r.created_at),
  };
}

export function createPostgresStore(connectionString: string): DataStore {
  const needsSsl =
    /sslmode=require/.test(connectionString) ||
    process.env.DATABASE_SSL === "true";
  const pool = new pg.Pool({
    connectionString,
    ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
    max: Number(process.env.PG_POOL_MAX || 10),
  });

  const q = (text: string, params: unknown[] = []) =>
    pool.query(text, params as any[]);

  return {
    async init() {
      await q(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY, username TEXT NOT NULL UNIQUE, email TEXT NOT NULL UNIQUE,
          display_name TEXT NOT NULL DEFAULT '', password_hash TEXT NOT NULL,
          role TEXT NOT NULL DEFAULT 'user', created_at BIGINT NOT NULL
        );
        -- The 'token' column stores a SHA-256 hash of the session token.
        CREATE TABLE IF NOT EXISTS sessions (
          token TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          created_at BIGINT NOT NULL, expires_at BIGINT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
        CREATE TABLE IF NOT EXISTS password_resets (
          token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          created_at BIGINT NOT NULL, expires_at BIGINT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_resets_user ON password_resets(user_id);
        CREATE TABLE IF NOT EXISTS characters (
          id TEXT PRIMARY KEY, name TEXT NOT NULL, tagline TEXT NOT NULL DEFAULT '',
          description TEXT NOT NULL DEFAULT '', greeting TEXT NOT NULL DEFAULT '',
          persona TEXT NOT NULL DEFAULT '', avatar_emoji TEXT NOT NULL DEFAULT '🤖',
          avatar_color TEXT NOT NULL DEFAULT '#7c5cff', avatar_image TEXT NOT NULL DEFAULT '',
          category TEXT NOT NULL DEFAULT 'Assistant',
          visibility TEXT NOT NULL DEFAULT 'public', creator_id TEXT NOT NULL,
          creator_name TEXT NOT NULL DEFAULT 'Anonymous', interactions INTEGER NOT NULL DEFAULT 0,
          created_at BIGINT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS conversations (
          id TEXT PRIMARY KEY, character_id TEXT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
          user_id TEXT NOT NULL, title TEXT NOT NULL DEFAULT 'New chat',
          created_at BIGINT NOT NULL, updated_at BIGINT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS messages (
          id TEXT PRIMARY KEY, conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
          role TEXT NOT NULL, content TEXT NOT NULL, created_at BIGINT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS favorites (
          user_id TEXT NOT NULL,
          character_id TEXT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
          created_at BIGINT NOT NULL,
          PRIMARY KEY (user_id, character_id)
        );
        CREATE INDEX IF NOT EXISTS idx_conv_user ON conversations(user_id, updated_at DESC);
        CREATE INDEX IF NOT EXISTS idx_conv_char ON conversations(character_id);
        CREATE INDEX IF NOT EXISTS idx_msg_conv ON messages(conversation_id, created_at ASC);
        CREATE INDEX IF NOT EXISTS idx_char_cat ON characters(category);
        CREATE INDEX IF NOT EXISTS idx_fav_char ON favorites(character_id);
        CREATE INDEX IF NOT EXISTS idx_fav_user ON favorites(user_id, created_at DESC);
      `);
      // Add columns introduced after initial release (existing DBs).
      await q(
        `ALTER TABLE characters ADD COLUMN IF NOT EXISTS avatar_image TEXT NOT NULL DEFAULT ''`
      );
      await q(
        `ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user'`
      );
    },
    async ping() {
      await q(`SELECT 1`);
      return true;
    },

    async createUser(input: UserInput) {
      const r = await q(
        `INSERT INTO users (id, username, email, display_name, password_hash, created_at)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
        [
          `user_${genId()}`,
          input.username,
          input.email,
          input.displayName || input.username,
          input.passwordHash,
          Date.now(),
        ]
      );
      return mapUser(r.rows[0]);
    },
    async getUserById(id) {
      const r = await q(`SELECT * FROM users WHERE id = $1`, [id]);
      return r.rows[0] ? mapUser(r.rows[0]) : null;
    },
    async getUserByUsername(username) {
      const r = await q(`SELECT * FROM users WHERE lower(username) = lower($1)`, [
        username,
      ]);
      return r.rows[0] ? mapUser(r.rows[0]) : null;
    },
    async getUserAuthByLogin(login) {
      const r = await q(
        `SELECT * FROM users WHERE lower(email) = lower($1) OR lower(username) = lower($1)`,
        [login]
      );
      const row = r.rows[0];
      return row ? { user: mapUser(row), passwordHash: row.password_hash } : null;
    },
    async userExists(username, email) {
      const r = await q(
        `SELECT 1 FROM users WHERE lower(username) = lower($1) OR lower(email) = lower($2) LIMIT 1`,
        [username, email]
      );
      return r.rowCount! > 0;
    },
    async createSession(userId, tokenHash, ttlMs) {
      const now = Date.now();
      await q(
        `INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES ($1,$2,$3,$4)`,
        [tokenHash, userId, now, now + ttlMs]
      );
      await this.deleteExpiredSessions();
    },
    async getSessionUser(tokenHash) {
      const r = await q(
        `SELECT user_id, expires_at FROM sessions WHERE token = $1`,
        [tokenHash]
      );
      const row = r.rows[0];
      if (!row) return null;
      if (Number(row.expires_at) < Date.now()) {
        await this.deleteSession(tokenHash);
        return null;
      }
      return this.getUserById(row.user_id);
    },
    async deleteSession(tokenHash) {
      await q(`DELETE FROM sessions WHERE token = $1`, [tokenHash]);
    },
    async deleteExpiredSessions() {
      const r = await q(`DELETE FROM sessions WHERE expires_at < $1`, [Date.now()]);
      return r.rowCount ?? 0;
    },
    async deleteUserSessions(userId) {
      await q(`DELETE FROM sessions WHERE user_id = $1`, [userId]);
    },
    async getUserByEmail(email) {
      const r = await q(`SELECT * FROM users WHERE lower(email) = lower($1)`, [
        email,
      ]);
      return r.rows[0] ? mapUser(r.rows[0]) : null;
    },
    async updateUserPassword(userId, passwordHash) {
      await q(`UPDATE users SET password_hash = $1 WHERE id = $2`, [
        passwordHash,
        userId,
      ]);
    },
    async createPasswordReset(userId, tokenHash, ttlMs) {
      await q(`DELETE FROM password_resets WHERE expires_at < $1`, [Date.now()]);
      const now = Date.now();
      await q(
        `INSERT INTO password_resets (token_hash, user_id, created_at, expires_at)
         VALUES ($1,$2,$3,$4)`,
        [tokenHash, userId, now, now + ttlMs]
      );
    },
    async getValidPasswordReset(tokenHash) {
      const r = await q(
        `SELECT user_id, expires_at FROM password_resets WHERE token_hash = $1`,
        [tokenHash]
      );
      const row = r.rows[0];
      if (!row) return null;
      if (Number(row.expires_at) < Date.now()) {
        await this.deletePasswordReset(tokenHash);
        return null;
      }
      return { userId: row.user_id };
    },
    async deletePasswordReset(tokenHash) {
      await q(`DELETE FROM password_resets WHERE token_hash = $1`, [tokenHash]);
    },
    async reassignOwnership(fromId, toId) {
      if (fromId === toId) return;
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query(
          `UPDATE characters SET creator_id = $1 WHERE creator_id = $2`,
          [toId, fromId]
        );
        await client.query(
          `UPDATE conversations SET user_id = $1 WHERE user_id = $2`,
          [toId, fromId]
        );
        await client.query("COMMIT");
      } catch (e) {
        await client.query("ROLLBACK");
        throw e;
      } finally {
        client.release();
      }
    },

    async createCharacter(input: CharacterInput) {
      const r = await q(
        `INSERT INTO characters
          (id, name, tagline, description, greeting, persona, avatar_emoji,
           avatar_color, avatar_image, category, visibility, creator_id, creator_name, interactions, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,0,$14) RETURNING *`,
        [
          genId(),
          input.name,
          input.tagline,
          input.description,
          input.greeting,
          input.persona,
          input.avatarEmoji,
          input.avatarColor,
          input.avatarImage || "",
          input.category,
          input.visibility,
          input.creatorId,
          input.creatorName,
          Date.now(),
        ]
      );
      return mapCharacter(r.rows[0]);
    },
    async getCharacter(id) {
      const r = await q(`${CHAR_SELECT} WHERE characters.id = $1`, [id]);
      return r.rows[0] ? mapCharacter(r.rows[0]) : null;
    },
    async listCharacters(opts: ListCharactersOpts = {}) {
      const clauses: string[] = [];
      const params: unknown[] = [];
      const add = (v: unknown) => `$${params.push(v)}`;

      if (opts.creatorId) {
        clauses.push(`creator_id = ${add(opts.creatorId)}`);
      } else {
        clauses.push(`visibility = 'public'`);
      }
      if (opts.category && opts.category !== "All") {
        clauses.push(`category = ${add(opts.category)}`);
      }
      if (opts.search) {
        const p = add(`%${opts.search}%`);
        clauses.push(`(name ILIKE ${p} OR tagline ILIKE ${p} OR description ILIKE ${p})`);
      }
      const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
      const limit = opts.limit ?? 200;
      const r = await q(
        `${CHAR_SELECT} ${where}
         ORDER BY interactions DESC, created_at DESC LIMIT ${add(limit)}`,
        params
      );
      return r.rows.map(mapCharacter);
    },
    async updateCharacter(id, creatorId, update: CharacterUpdate) {
      const r = await q(
        `UPDATE characters SET
           name=$1, tagline=$2, description=$3, greeting=$4, persona=$5,
           avatar_emoji=$6, avatar_color=$7, avatar_image=$8, category=$9, visibility=$10
         WHERE id=$11 AND creator_id=$12 RETURNING *`,
        [
          update.name,
          update.tagline,
          update.description,
          update.greeting,
          update.persona,
          update.avatarEmoji,
          update.avatarColor,
          update.avatarImage || "",
          update.category,
          update.visibility,
          id,
          creatorId,
        ]
      );
      return r.rows[0] ? mapCharacter(r.rows[0]) : null;
    },
    async incrementInteractions(id) {
      await q(
        `UPDATE characters SET interactions = interactions + 1 WHERE id = $1`,
        [id]
      );
    },
    async deleteCharacter(id, creatorId) {
      const r = await q(
        `DELETE FROM characters WHERE id = $1 AND creator_id = $2`,
        [id, creatorId]
      );
      return (r.rowCount ?? 0) > 0;
    },
    async countCharacters() {
      const r = await q(`SELECT COUNT(*)::int8 AS c FROM characters`);
      return Number(r.rows[0].c);
    },

    async createConversation(characterId, userId, title = "New chat") {
      const now = Date.now();
      const r = await q(
        `INSERT INTO conversations (id, character_id, user_id, title, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
        [genId(), characterId, userId, title, now, now]
      );
      return mapConversation(r.rows[0]);
    },
    async getConversation(id) {
      const r = await q(`SELECT * FROM conversations WHERE id = $1`, [id]);
      return r.rows[0] ? mapConversation(r.rows[0]) : null;
    },
    async listConversationsForUser(userId) {
      const r = await q(
        `SELECT * FROM conversations WHERE user_id = $1 ORDER BY updated_at DESC LIMIT 100`,
        [userId]
      );
      return r.rows.map(mapConversation);
    },
    async findConversation(characterId, userId) {
      const r = await q(
        `SELECT * FROM conversations WHERE character_id = $1 AND user_id = $2
         ORDER BY updated_at DESC LIMIT 1`,
        [characterId, userId]
      );
      return r.rows[0] ? mapConversation(r.rows[0]) : null;
    },
    async touchConversation(id, title) {
      if (title) {
        await q(`UPDATE conversations SET updated_at = $1, title = $2 WHERE id = $3`, [
          Date.now(),
          title,
          id,
        ]);
      } else {
        await q(`UPDATE conversations SET updated_at = $1 WHERE id = $2`, [
          Date.now(),
          id,
        ]);
      }
    },
    async deleteConversation(id, userId) {
      const r = await q(
        `DELETE FROM conversations WHERE id = $1 AND user_id = $2`,
        [id, userId]
      );
      return (r.rowCount ?? 0) > 0;
    },

    async addMessage(conversationId, role, content) {
      const now = Date.now();
      const r = await q(
        `INSERT INTO messages (id, conversation_id, role, content, created_at)
         VALUES ($1,$2,$3,$4,$5) RETURNING *`,
        [genId(), conversationId, role, content, now]
      );
      return mapMessage(r.rows[0]);
    },
    async listMessages(conversationId) {
      const r = await q(
        `SELECT * FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC`,
        [conversationId]
      );
      return r.rows.map(mapMessage);
    },
    async deleteLastAssistantMessage(conversationId) {
      const r = await q(
        `DELETE FROM messages WHERE id = (
           SELECT id FROM messages
           WHERE conversation_id = $1 AND role = 'assistant'
           ORDER BY created_at DESC LIMIT 1
         )`,
        [conversationId]
      );
      return (r.rowCount ?? 0) > 0;
    },

    async addFavorite(userId, characterId) {
      await q(
        `INSERT INTO favorites (user_id, character_id, created_at)
         VALUES ($1, $2, $3) ON CONFLICT (user_id, character_id) DO NOTHING`,
        [userId, characterId, Date.now()]
      );
    },
    async removeFavorite(userId, characterId) {
      await q(`DELETE FROM favorites WHERE user_id = $1 AND character_id = $2`, [
        userId,
        characterId,
      ]);
    },
    async isFavorited(userId, characterId) {
      const r = await q(
        `SELECT 1 FROM favorites WHERE user_id = $1 AND character_id = $2 LIMIT 1`,
        [userId, characterId]
      );
      return (r.rowCount ?? 0) > 0;
    },
    async listFavoriteCharacters(userId) {
      const r = await q(
        `${CHAR_SELECT}
         JOIN favorites fav ON fav.character_id = characters.id
         WHERE fav.user_id = $1
         ORDER BY fav.created_at DESC LIMIT 200`,
        [userId]
      );
      return r.rows.map(mapCharacter);
    },

    async countUsers() {
      return Number((await q(`SELECT COUNT(*)::int8 AS c FROM users`)).rows[0].c);
    },
    async countConversations() {
      return Number(
        (await q(`SELECT COUNT(*)::int8 AS c FROM conversations`)).rows[0].c
      );
    },
    async countMessages() {
      return Number(
        (await q(`SELECT COUNT(*)::int8 AS c FROM messages`)).rows[0].c
      );
    },
    async listRecentUsers(limit) {
      const r = await q(
        `SELECT * FROM users ORDER BY created_at DESC LIMIT $1`,
        [limit]
      );
      return r.rows.map(mapUser);
    },
    async listRecentCharacters(limit) {
      const r = await q(`${CHAR_SELECT} ORDER BY created_at DESC LIMIT $1`, [
        limit,
      ]);
      return r.rows.map(mapCharacter);
    },
    async deleteUserCascade(userId) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const found = await client.query(`SELECT 1 FROM users WHERE id = $1`, [
          userId,
        ]);
        if (found.rowCount === 0) {
          await client.query("ROLLBACK");
          return false;
        }
        await client.query(`DELETE FROM characters WHERE creator_id = $1`, [userId]);
        await client.query(`DELETE FROM conversations WHERE user_id = $1`, [userId]);
        await client.query(`DELETE FROM favorites WHERE user_id = $1`, [userId]);
        await client.query(`DELETE FROM users WHERE id = $1`, [userId]);
        await client.query("COMMIT");
        return true;
      } catch (e) {
        await client.query("ROLLBACK");
        throw e;
      } finally {
        client.release();
      }
    },
    async adminDeleteCharacter(id) {
      const r = await q(`DELETE FROM characters WHERE id = $1`, [id]);
      return (r.rowCount ?? 0) > 0;
    },
  };
}
