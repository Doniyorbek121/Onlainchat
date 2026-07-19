import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  getCharacter,
  isFavorited,
  addFavorite,
  removeFavorite,
} from "@/lib/db";
import { rateLimit, clientKey } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Toggles the current user's favorite for a character. */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rl = rateLimit(clientKey(req, "favorite"), 60, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many requests." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    );
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: "Sign in to save characters." },
      { status: 401 }
    );
  }

  const { id } = await params;
  const character = await getCharacter(id);
  if (
    !character ||
    (character.visibility === "private" && character.creatorId !== user.id)
  ) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const already = await isFavorited(user.id, id);
  if (already) {
    await removeFavorite(user.id, id);
  } else {
    await addFavorite(user.id, id);
  }

  const updated = await getCharacter(id);
  return NextResponse.json({
    favorited: !already,
    count: updated?.favorites ?? 0,
  });
}
