import { NextRequest } from "next/server";
import { getUserId } from "@/lib/session";
import {
  getCharacter,
  getConversation,
  createConversation,
  addMessage,
  listMessages,
  touchConversation,
  incrementInteractions,
  deleteLastAssistantMessage,
} from "@/lib/db";
import { streamCharacterReply } from "@/lib/anthropic";
import { rateLimit, clientKey } from "@/lib/rateLimit";
import { screenText } from "@/lib/moderation";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function sse(event: string, data: unknown): Uint8Array {
  return new TextEncoder().encode(
    `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
  );
}

export async function POST(req: NextRequest) {
  const userId = await getUserId();

  // Rate limit: 30 messages / minute per client.
  const rl = await rateLimit(clientKey(req, "chat"), 30, 60_000);
  if (!rl.ok) {
    return new Response("Too many messages. Please slow down.", {
      status: 429,
      headers: { "Retry-After": String(rl.retryAfter) },
    });
  }

  let body: {
    characterId?: string;
    conversationId?: string;
    message?: string;
    regenerate?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const regenerate = body.regenerate === true;
  const message = (body.message || "").trim();
  if (!body.characterId) {
    return new Response("characterId is required", { status: 400 });
  }
  if (!regenerate && !message) {
    return new Response("message is required", { status: 400 });
  }
  if (message.length > 4000) {
    return new Response("Message is too long.", { status: 400 });
  }
  // Screen inbound messages for the hardest-line category (sexualisation of
  // minors). General adult content is left to the model provider's guardrails
  // so ordinary roleplay isn't blocked.
  if (!regenerate) {
    const screen = screenText(message);
    if (!screen.ok && screen.category === "csae") {
      logger.warn("moderation.blocked", {
        surface: "chat.message",
        userId,
        category: screen.category,
      });
      return new Response("This message violates our content policy.", {
        status: 422,
      });
    }
  }

  const character = await getCharacter(body.characterId);
  if (!character) {
    return new Response("Character not found", { status: 404 });
  }

  // P0: private characters can only be chatted with by their creator.
  if (character.visibility === "private" && character.creatorId !== userId) {
    return new Response("Character not found", { status: 404 });
  }

  let conversation = body.conversationId
    ? await getConversation(body.conversationId)
    : null;
  const owned =
    conversation &&
    conversation.userId === userId &&
    conversation.characterId === character.id;

  if (regenerate) {
    // Regeneration requires an existing, owned conversation. Drop the last
    // assistant reply so we respond afresh to the trailing user message.
    if (!owned || !conversation) {
      return new Response("Conversation not found", { status: 404 });
    }
    await deleteLastAssistantMessage(conversation.id);
  } else {
    // Normal turn: reuse the owned conversation or start a fresh one.
    if (!owned) {
      conversation = await createConversation(
        character.id,
        userId,
        message.slice(0, 60)
      );
    }
    await addMessage(conversation!.id, "user", message);
  }

  const conversationId = conversation!.id;
  const fullHistory = await listMessages(conversationId);
  if (fullHistory.length === 0) {
    return new Response("Nothing to respond to", { status: 400 });
  }
  // Bound the context sent to the model: keep the most recent turns and ensure
  // the window starts on a user message (required by the API). Full history
  // stays in the database; only the prompt context is trimmed.
  const MAX_CONTEXT = 40;
  let history = fullHistory.slice(-MAX_CONTEXT);
  while (history.length && history[0].role !== "user") history.shift();
  if (history.length === 0) history = fullHistory.slice(-1);

  let full = "";
  let saved = false;
  async function persistPartial() {
    if (saved) return;
    saved = true;
    const clean = full.trim();
    if (clean) {
      await addMessage(conversationId, "assistant", clean);
      await touchConversation(conversationId);
      await incrementInteractions(character!.id);
    }
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      controller.enqueue(sse("meta", { conversationId }));

      try {
        for await (const delta of streamCharacterReply(
          character,
          history,
          req.signal
        )) {
          full += delta;
          controller.enqueue(sse("delta", { text: delta }));
        }
      } catch (err) {
        // Client abort (stop button / disconnect): keep what we streamed.
        if (req.signal.aborted || (err as Error)?.name === "AbortError") {
          await persistPartial();
          try {
            controller.close();
          } catch {
            /* already closed */
          }
          return;
        }
        const messageText = err instanceof Error ? err.message : "Unknown error";
        controller.enqueue(
          sse("error", { message: `The character couldn't reply: ${messageText}` })
        );
        try {
          controller.close();
        } catch {
          /* already closed */
        }
        return;
      }

      await persistPartial();
      try {
        controller.enqueue(sse("done", { conversationId }));
        controller.close();
      } catch {
        /* client already gone */
      }
    },
    async cancel() {
      // Consumer went away mid-stream — persist whatever we have.
      await persistPartial();
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
