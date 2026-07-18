export interface User {
  id: string;
  username: string;
  email: string;
  displayName: string;
  createdAt: number;
}

export interface Character {
  id: string;
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
  interactions: number;
  createdAt: number;
}

export interface Conversation {
  id: string;
  characterId: string;
  userId: string;
  title: string;
  createdAt: number;
  updatedAt: number;
}

export type MessageRole = "user" | "assistant";

export interface Message {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  createdAt: number;
}

export const CATEGORIES = [
  "Assistant",
  "Companion",
  "Roleplay",
  "Creative",
  "Games",
  "Education",
  "Anime",
  "History",
  "Famous",
  "Helper",
] as const;

export const AVATAR_COLORS = [
  "#7c5cff",
  "#00d6b4",
  "#ff6b6b",
  "#ffa94d",
  "#4dabf7",
  "#f06595",
  "#38d9a9",
  "#a78bfa",
  "#fcc419",
  "#748ffc",
];

export const AVATAR_EMOJIS = [
  "🤖", "🧙", "🦸", "👩‍🚀", "🧑‍🏫", "🕵️", "🧛", "🧝", "👨‍🍳", "🦉",
  "🐉", "🌟", "🎭", "🎨", "🎮", "📚", "⚔️", "🔮", "💫", "🚀",
];
