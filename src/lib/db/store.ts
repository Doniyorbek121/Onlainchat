import type {
  Character,
  Conversation,
  Message,
  MessageRole,
  Report,
  ReportStatus,
  ReportTargetType,
  User,
} from "../types";

export interface CharacterInput {
  name: string;
  tagline: string;
  description: string;
  greeting: string;
  persona: string;
  avatarEmoji: string;
  avatarColor: string;
  avatarImage?: string; // data URL; defaults to "" (emoji avatar)
  category: string;
  visibility: "public" | "private";
  creatorId: string;
  creatorName: string;
}

export type CharacterUpdate = Pick<
  CharacterInput,
  | "name"
  | "tagline"
  | "description"
  | "greeting"
  | "persona"
  | "avatarEmoji"
  | "avatarColor"
  | "avatarImage"
  | "category"
  | "visibility"
>;

export interface ListCharactersOpts {
  category?: string;
  search?: string;
  creatorId?: string;
  limit?: number;
  offset?: number;
}

export interface ReportInput {
  targetType: ReportTargetType;
  targetId: string;
  reporterId: string;
  reason: string;
  details: string;
}

export interface UserInput {
  username: string;
  email: string;
  displayName: string;
  passwordHash: string;
}

/**
 * Backend-agnostic data store. Every method is async so the same interface can
 * be implemented by synchronous SQLite (dev) and asynchronous Postgres (prod).
 */
export interface DataStore {
  init(): Promise<void>;
  ping(): Promise<boolean>;

  // Users & sessions
  createUser(input: UserInput): Promise<User>;
  getUserById(id: string): Promise<User | null>;
  getUserByUsername(username: string): Promise<User | null>;
  getUserAuthByLogin(
    login: string
  ): Promise<{ user: User; passwordHash: string } | null>;
  userExists(username: string, email: string): Promise<boolean>;
  // Sessions are stored by a SHA-256 hash of the opaque token (never the raw
  // value), so a database leak does not expose usable session tokens.
  createSession(userId: string, tokenHash: string, ttlMs: number): Promise<void>;
  getSessionUser(tokenHash: string): Promise<User | null>;
  deleteSession(tokenHash: string): Promise<void>;
  deleteExpiredSessions(): Promise<number>;
  deleteUserSessions(userId: string): Promise<void>;
  reassignOwnership(fromId: string, toId: string): Promise<void>;

  // Admin
  countUsers(): Promise<number>;
  countConversations(): Promise<number>;
  countMessages(): Promise<number>;
  listRecentUsers(limit: number): Promise<User[]>;
  listRecentCharacters(limit: number): Promise<Character[]>;
  deleteUserCascade(userId: string): Promise<boolean>;
  adminDeleteCharacter(id: string): Promise<boolean>;

  // Password reset
  getUserByEmail(email: string): Promise<User | null>;
  updateUserPassword(userId: string, passwordHash: string): Promise<void>;
  createPasswordReset(
    userId: string,
    tokenHash: string,
    ttlMs: number
  ): Promise<void>;
  getValidPasswordReset(
    tokenHash: string
  ): Promise<{ userId: string } | null>;
  deletePasswordReset(tokenHash: string): Promise<void>;

  // Email verification
  markEmailVerified(userId: string): Promise<void>;
  createEmailVerification(
    userId: string,
    tokenHash: string,
    ttlMs: number
  ): Promise<void>;
  getValidEmailVerification(
    tokenHash: string
  ): Promise<{ userId: string } | null>;
  deleteEmailVerification(tokenHash: string): Promise<void>;

  // Moderation reports
  createReport(input: ReportInput): Promise<Report>;
  listReports(status: ReportStatus | "all", limit: number): Promise<Report[]>;
  updateReportStatus(id: string, status: ReportStatus): Promise<boolean>;
  countOpenReports(): Promise<number>;

  // Characters
  createCharacter(input: CharacterInput): Promise<Character>;
  getCharacter(id: string): Promise<Character | null>;
  listCharacters(opts?: ListCharactersOpts): Promise<Character[]>;
  updateCharacter(
    id: string,
    creatorId: string,
    update: CharacterUpdate
  ): Promise<Character | null>;
  incrementInteractions(id: string): Promise<void>;
  deleteCharacter(id: string, creatorId: string): Promise<boolean>;
  countCharacters(): Promise<number>;

  // Conversations
  createConversation(
    characterId: string,
    userId: string,
    title?: string
  ): Promise<Conversation>;
  getConversation(id: string): Promise<Conversation | null>;
  listConversationsForUser(userId: string): Promise<Conversation[]>;
  findConversation(
    characterId: string,
    userId: string
  ): Promise<Conversation | null>;
  touchConversation(id: string, title?: string): Promise<void>;
  deleteConversation(id: string, userId: string): Promise<boolean>;

  // Messages
  addMessage(
    conversationId: string,
    role: MessageRole,
    content: string
  ): Promise<Message>;
  listMessages(conversationId: string): Promise<Message[]>;
  deleteLastAssistantMessage(conversationId: string): Promise<boolean>;

  // Favorites
  addFavorite(userId: string, characterId: string): Promise<void>;
  removeFavorite(userId: string, characterId: string): Promise<void>;
  isFavorited(userId: string, characterId: string): Promise<boolean>;
  listFavoriteCharacters(userId: string): Promise<Character[]>;
}

/** Shared id generator for both backends. */
export const genId = () =>
  `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
