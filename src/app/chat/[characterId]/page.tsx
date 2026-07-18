import { notFound } from "next/navigation";
import ChatRoom from "@/components/ChatRoom";
import { peekUserId } from "@/lib/session";
import {
  getCharacter,
  findConversation,
  listMessages,
} from "@/lib/db";
import { ensureSeeded } from "@/lib/seed";

export const dynamic = "force-dynamic";

export default async function ChatPage({
  params,
}: {
  params: Promise<{ characterId: string }>;
}) {
  ensureSeeded();
  const { characterId } = await params;

  const character = getCharacter(characterId);
  if (!character) notFound();

  const userId = await peekUserId();
  const conversation = userId
    ? findConversation(character.id, userId)
    : null;
  const messages = conversation ? listMessages(conversation.id) : [];

  return (
    <ChatRoom
      character={character}
      initialConversationId={conversation?.id ?? null}
      initialMessages={messages}
    />
  );
}
