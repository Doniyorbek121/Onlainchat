import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  listCharacters,
  listConversationsForUser,
  listMessages,
  listFavoriteCharacters,
} from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GDPR data export: everything we store about the signed-in user, as JSON. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const [characters, conversations, favorites] = await Promise.all([
    listCharacters({ creatorId: user.id }),
    listConversationsForUser(user.id),
    listFavoriteCharacters(user.id),
  ]);

  const chats = await Promise.all(
    conversations.map(async (c) => ({
      ...c,
      messages: await listMessages(c.id),
    }))
  );

  const payload = {
    exportedAt: new Date().toISOString(),
    account: user,
    characters,
    conversations: chats,
    favorites: favorites.map((f) => ({ id: f.id, name: f.name })),
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="character-ai-export-${user.username}.json"`,
    },
  });
}
