import type { MessageRole } from "./types";
import type {
  CharacterInput,
  CharacterUpdate,
  DataStore,
  ListCharactersOpts,
  UserInput,
} from "./db/store";

export type { CharacterInput, CharacterUpdate, ListCharactersOpts };

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
export const createSession = async (userId: string, ttlMs: number) =>
  (await store()).createSession(userId, ttlMs);
export const getSessionUser = async (token: string) =>
  (await store()).getSessionUser(token);
export const deleteSession = async (token: string) =>
  (await store()).deleteSession(token);
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

// Characters
export const createCharacter = async (i: CharacterInput) =>
  (await store()).createCharacter(i);
export const getCharacter = async (id: string) => (await store()).getCharacter(id);
export const listCharacters = async (opts?: ListCharactersOpts) =>
  (await store()).listCharacters(opts);
export const updateCharacter = async (
  id: string,
  creatorId: string,
  update: CharacterUpdate
) => (await store()).updateCharacter(id, creatorId, update);
export const incrementInteractions = async (id: string) =>
  (await store()).incrementInteractions(id);
export const deleteCharacter = async (id: string, creatorId: string) =>
  (await store()).deleteCharacter(id, creatorId);
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
