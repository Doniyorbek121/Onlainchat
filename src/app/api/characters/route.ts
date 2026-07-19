import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createCharacter, listCharacters } from "@/lib/db";
import { CATEGORIES, AVATAR_COLORS, AVATAR_EMOJIS } from "@/lib/types";
import { rateLimit, clientKey } from "@/lib/rateLimit";
import { validAvatarImage } from "@/lib/validate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const characters = await listCharacters({
    category: searchParams.get("category") || undefined,
    search: searchParams.get("search") || undefined,
  });
  return NextResponse.json({ characters });
}

function str(v: unknown, max: number): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

export async function POST(req: NextRequest) {
  const rl = rateLimit(clientKey(req, "char-create"), 20, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "You're creating characters too quickly. Please wait a moment." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    );
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: "You must be signed in to create a character." },
      { status: 401 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const name = str(body.name, 60);
  if (!name) {
    return NextResponse.json(
      { error: "Character name is required." },
      { status: 400 }
    );
  }

  const category =
    typeof body.category === "string" &&
    CATEGORIES.includes(body.category as (typeof CATEGORIES)[number])
      ? body.category
      : "Assistant";

  const avatarEmoji =
    str(body.avatarEmoji, 8) || AVATAR_EMOJIS[0];
  const avatarColor = AVATAR_COLORS.includes(str(body.avatarColor, 9))
    ? str(body.avatarColor, 9)
    : AVATAR_COLORS[0];

  const character = await createCharacter({
    name,
    tagline: str(body.tagline, 120),
    description: str(body.description, 500),
    greeting: str(body.greeting, 500),
    persona: str(body.persona, 2000),
    avatarEmoji,
    avatarColor,
    avatarImage: validAvatarImage(body.avatarImage),
    category,
    visibility: body.visibility === "private" ? "private" : "public",
    creatorId: user.id,
    creatorName: user.displayName || user.username,
  });

  return NextResponse.json({ character }, { status: 201 });
}
