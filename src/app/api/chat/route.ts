import { NextRequest } from "next/server";
import { getUserId } from "@/lib/session";
import {
  getCharacter,
  getConversation,
  createConversation,
  findConversation,
  addMessage,
  listMessages,
  touchConversation,
  incrementInteractions,
} from "@/lib/db";
import { streamCharacterReply } from "@/lib/anthropic";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function sse(event: string, data: unknown): Uint8Array {
  return new TextEncoder().encode(
    `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
  );
}

export async function POST(req: NextRequest) {
  const userId = await getUserId();

  let body: { characterId?: string; conversationId?: string; message?: string };
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const message = (body.message || "").trim();
  if (!body.characterId || !message) {
    return new Response("characterId and message are required", { status: 400 });
  }

  const character = getCharacter(body.characterId);
  if (!character) {
    return new Response("Character not found", { status: 404 });
  }

  // Resolve conversation (owned by this user).
  let conversation = body.conversationId
    ? getConversation(body.conversationId)
    : findConversation(character.id, userId);

  if (!conversation || conversation.userId !== userId) {
    conversation = createConversation(
      character.id,
      userId,
      message.slice(0, 60)
    );
  }
  const conversationId = conversation.id;

  // Persist the user's message, then load full history for context.
  addMessage(conversationId, "user", message);
  const history = listMessages(conversationId);

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      controller.enqueue(sse("meta", { conversationId }));

      let full = "";
      try {
        for await (const delta of streamCharacterReply(character, history)) {
          full += delta;
          controller.enqueue(sse("delta", { text: delta }));
        }
      } catch (err) {
        const messageText =
          err instanceof Error ? err.message : "Unknown error";
        controller.enqueue(
          sse("error", { message: `The character couldn't reply: ${messageText}` })
        );
        controller.close();
        return;
      }

      const clean = full.trim();
      if (clean) {
        addMessage(conversationId, "assistant", clean);
        touchConversation(conversationId);
        incrementInteractions(character.id);
      }
      controller.enqueue(sse("done", { conversationId }));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
