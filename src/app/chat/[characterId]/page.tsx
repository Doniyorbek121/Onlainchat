import { notFound } from "next/navigation";
import ChatRoom from "@/components/ChatRoom";
import { peekUserId } from "@/lib/session";
import {
  getCharacter,
  getConversation,
  findConversation,
  listMessages,
} from "@/lib/db";
import { ensureSeeded } from "@/lib/seed";

export const dynamic = "force-dynamic";

export default async function ChatPage({
  params,
  searchParams,
}: {
  params: Promise<{ characterId: string }>;
  searchParams: Promise<{ c?: string; new?: string }>;
}) {
  ensureSeeded();
  const { characterId } = await params;
  const { c, new: isNew } = await searchParams;

  const character = getCharacter(characterId);
  if (!character) notFound();

  const userId = await peekUserId();

  // P0: private characters are reachable only by their creator.
  if (character.visibility === "private" && character.creatorId !== userId) {
    notFound();
  }

  // Resolve which conversation to open:
  //   ?new=1      → a fresh, empty chat
  //   ?c=<id>     → a specific conversation (must be owned)
  //   otherwise   → the most recent conversation with this character
  let conversation = null;
  if (!isNew) {
    if (c) {
      const found = getConversation(c);
      if (found && found.userId === userId && found.characterId === character.id) {
        conversation = found;
      }
    } else if (userId) {
      conversation = findConversation(character.id, userId);
    }
  }

  const messages = conversation ? listMessages(conversation.id) : [];

  return (
    <ChatRoom
      character={character}
      initialConversationId={conversation?.id ?? null}
      initialMessages={messages}
    />
  );
}
