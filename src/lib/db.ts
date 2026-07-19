import type { Character, MessageRole, ReportStatus } from "./types";
import type {
  CharacterInput,
  CharacterUpdate,
  DataStore,
  ListCharactersOpts,
  ReportInput,
  UserInput,
} from "./db/store";

export type { CharacterInput, CharacterUpdate, ListCharactersOpts, ReportInput };

// ---------------------------------------------------------------------------
// Backend selection: Postgres when DATABASE_URL is set (production), otherwise
// the embedded SQLite file (local dev / demo). Dynamic import keeps the unused
// driver — and its native/optional deps — out of the bundle.
// ---------------------------------------------------------------------------

const globalForStore = globalThis as unknown as {
  __storePromise?: Promise<DataStore>;
};

function selectStore(): Promise<DataStore> {
  return (async () => {
    const url = process.env.DATABASE_URL;
    let store: DataStore;
    if (url) {
      const { createPostgresStore } = await import("./db/postgres");
      store = createPostgresStore(url);
    } else {
      const { createSqliteStore } = await import("./db/sqlite");
      store = createSqliteStore();
    }
    await store.init();
    return store;
  })();
}

function store(): Promise<DataStore> {
  return (globalForStore.__storePromise ??= selectStore());
}

// ---------------------------------------------------------------------------
// Public async data API (delegates to the selected backend)
// ---------------------------------------------------------------------------

// Users & sessions
export const createUser = async (i: UserInput) => (await store()).createUser(i);
export const getUserById = async (id: string) => (await store()).getUserById(id);
export const getUserByUsername = async (username: string) =>
  (await store()).getUserByUsername(username);
export const getUserAuthByLogin = async (login: string) =>
  (await store()).getUserAuthByLogin(login);
export const userExists = async (u: string, e: string) =>
  (await store()).userExists(u, e);
export const ping = async () => (await store()).ping();
export const createSession = async (
  userId: string,
  tokenHash: string,
  ttlMs: number
) => (await store()).createSession(userId, tokenHash, ttlMs);
export const getSessionUser = async (tokenHash: string) =>
  (await store()).getSessionUser(tokenHash);
export const deleteSession = async (tokenHash: string) =>
  (await store()).deleteSession(tokenHash);
export const deleteExpiredSessions = async () =>
  (await store()).deleteExpiredSessions();
export const deleteUserSessions = async (userId: string) =>
  (await store()).deleteUserSessions(userId);
export const reassignOwnership = async (from: string, to: string) =>
  (await store()).reassignOwnership(from, to);

// Password reset
export const getUserByEmail = async (email: string) =>
  (await store()).getUserByEmail(email);
export const updateUserPassword = async (userId: string, passwordHash: string) =>
  (await store()).updateUserPassword(userId, passwordHash);
export const createPasswordReset = async (
  userId: string,
  tokenHash: string,
  ttlMs: number
) => (await store()).createPasswordReset(userId, tokenHash, ttlMs);
export const getValidPasswordReset = async (tokenHash: string) =>
  (await store()).getValidPasswordReset(tokenHash);
export const deletePasswordReset = async (tokenHash: string) =>
  (await store()).deletePasswordReset(tokenHash);

// Email verification
export const markEmailVerified = async (userId: string) =>
  (await store()).markEmailVerified(userId);
export const createEmailVerification = async (
  userId: string,
  tokenHash: string,
  ttlMs: number
) => (await store()).createEmailVerification(userId, tokenHash, ttlMs);
export const getValidEmailVerification = async (tokenHash: string) =>
  (await store()).getValidEmailVerification(tokenHash);
export const deleteEmailVerification = async (tokenHash: string) =>
  (await store()).deleteEmailVerification(tokenHash);

// Moderation reports
export const createReport = async (input: ReportInput) =>
  (await store()).createReport(input);
export const listReports = async (status: ReportStatus | "all", limit: number) =>
  (await store()).listReports(status, limit);
export const updateReportStatus = async (id: string, status: ReportStatus) =>
  (await store()).updateReportStatus(id, status);
export const countOpenReports = async () => (await store()).countOpenReports();

// Characters
//
// Short-TTL in-process cache for the public discovery lists (no search, no
// owner filter). Discovery is the hottest read path and slightly-stale
// ordering is fine; the cache is cleared whenever characters change. This is
// per-instance — behind multiple replicas each keeps its own (a shared cache
// like Redis would be the next step at very large scale).
const DISCOVERY_TTL = 20_000;
const discoveryCache = new Map<string, { at: number; data: Character[] }>();

function invalidateDiscovery() {
  discoveryCache.clear();
}

export const createCharacter = async (i: CharacterInput) => {
  const c = await (await store()).createCharacter(i);
  invalidateDiscovery();
  return c;
};
export const getCharacter = async (id: string) => (await store()).getCharacter(id);
export const listCharacters = async (opts: ListCharactersOpts = {}) => {
  const cacheable = !opts.creatorId && !opts.search;
  if (!cacheable) return (await store()).listCharacters(opts);
  const key = `${opts.category ?? "All"}:${opts.limit ?? 200}:${opts.offset ?? 0}`;
  const hit = discoveryCache.get(key);
  if (hit && Date.now() - hit.at < DISCOVERY_TTL) return hit.data;
  const data = await (await store()).listCharacters(opts);
  discoveryCache.set(key, { at: Date.now(), data });
  return data;
};
export const updateCharacter = async (
  id: string,
  creatorId: string,
  update: CharacterUpdate
) => {
  const c = await (await store()).updateCharacter(id, creatorId, update);
  invalidateDiscovery();
  return c;
};
export const incrementInteractions = async (id: string) =>
  (await store()).incrementInteractions(id);
export const deleteCharacter = async (id: string, creatorId: string) => {
  const ok = await (await store()).deleteCharacter(id, creatorId);
  if (ok) invalidateDiscovery();
  return ok;
};
export const countCharacters = async () => (await store()).countCharacters();

// Conversations
export const createConversation = async (
  characterId: string,
  userId: string,
  title?: string
) => (await store()).createConversation(characterId, userId, title);
export const getConversation = async (id: string) =>
  (await store()).getConversation(id);
export const listConversationsForUser = async (userId: string) =>
  (await store()).listConversationsForUser(userId);
export const findConversation = async (characterId: string, userId: string) =>
  (await store()).findConversation(characterId, userId);
export const touchConversation = async (id: string, title?: string) =>
  (await store()).touchConversation(id, title);
export const deleteConversation = async (id: string, userId: string) =>
  (await store()).deleteConversation(id, userId);

// Messages
export const addMessage = async (
  conversationId: string,
  role: MessageRole,
  content: string
) => (await store()).addMessage(conversationId, role, content);
export const listMessages = async (conversationId: string) =>
  (await store()).listMessages(conversationId);
export const deleteLastAssistantMessage = async (conversationId: string) =>
  (await store()).deleteLastAssistantMessage(conversationId);

// Favorites
export const addFavorite = async (userId: string, characterId: string) =>
  (await store()).addFavorite(userId, characterId);
export const removeFavorite = async (userId: string, characterId: string) =>
  (await store()).removeFavorite(userId, characterId);
export const isFavorited = async (userId: string, characterId: string) =>
  (await store()).isFavorited(userId, characterId);
export const listFavoriteCharacters = async (userId: string) =>
  (await store()).listFavoriteCharacters(userId);

// Admin
export const countUsers = async () => (await store()).countUsers();
export const countConversations = async () =>
  (await store()).countConversations();
export const countMessages = async () => (await store()).countMessages();
export const countUsersSince = async (sinceMs: number) =>
  (await store()).countUsersSince(sinceMs);
export const countCharactersSince = async (sinceMs: number) =>
  (await store()).countCharactersSince(sinceMs);
export const countMessagesSince = async (sinceMs: number) =>
  (await store()).countMessagesSince(sinceMs);
export const listRecentUsers = async (limit: number) =>
  (await store()).listRecentUsers(limit);
export const listRecentCharacters = async (limit: number) =>
  (await store()).listRecentCharacters(limit);
export const deleteUserCascade = async (userId: string) => {
  const ok = await (await store()).deleteUserCascade(userId);
  if (ok) invalidateDiscovery();
  return ok;
};
export const adminDeleteCharacter = async (id: string) => {
  const ok = await (await store()).adminDeleteCharacter(id);
  if (ok) invalidateDiscovery();
  return ok;
};
