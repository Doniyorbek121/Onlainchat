import TopBar from "@/components/TopBar";
import LibraryList, { type LibraryItem } from "@/components/LibraryList";
import { peekUserId } from "@/lib/session";
import {
  listConversationsForUser,
  getCharacter,
  listMessages,
} from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function LibraryPage() {
  const userId = await peekUserId();
  const conversations = userId ? listConversationsForUser(userId) : [];

  const items: LibraryItem[] = [];
  for (const conv of conversations) {
    const character = getCharacter(conv.characterId);
    if (!character) continue;
    const msgs = listMessages(conv.id);
    const last = msgs[msgs.length - 1];
    items.push({
      conversationId: conv.id,
      characterId: character.id,
      characterName: character.name,
      avatarEmoji: character.avatarEmoji,
      avatarColor: character.avatarColor,
      preview: last
        ? `${last.role === "user" ? "You: " : ""}${last.content}`
        : "",
      updatedAt: conv.updatedAt,
    });
  }

  return (
    <div className="min-h-screen">
      <TopBar />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="mb-6 text-2xl font-bold">My chats</h1>
        <LibraryList items={items} />
      </main>
    </div>
  );
}
