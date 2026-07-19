import type {
  Character,
  Conversation,
  Message,
  MessageRole,
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

  // Users & sessions
  createUser(input: UserInput): Promise<User>;
  getUserById(id: string): Promise<User | null>;
  getUserAuthByLogin(
    login: string
  ): Promise<{ user: User; passwordHash: string } | null>;
  userExists(username: string, email: string): Promise<boolean>;
  createSession(userId: string, ttlMs: number): Promise<string>;
  getSessionUser(token: string): Promise<User | null>;
  deleteSession(token: string): Promise<void>;
  deleteExpiredSessions(): Promise<number>;
  deleteUserSessions(userId: string): Promise<void>;
  reassignOwnership(fromId: string, toId: string): Promise<void>;

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
}

/** Shared id generator for both backends. */
export const genId = () =>
  `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
