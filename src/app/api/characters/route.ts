import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, REQUIRE_EMAIL_VERIFICATION } from "@/lib/auth";
import { createCharacter, listCharacters } from "@/lib/db";
import { CATEGORIES, AVATAR_COLORS, AVATAR_EMOJIS } from "@/lib/types";
import { rateLimit, clientKey } from "@/lib/rateLimit";
import { validAvatarImage } from "@/lib/validate";
import { persistAvatar } from "@/lib/storage";
import { screenCharacterFields, MODERATION_MESSAGE } from "@/lib/moderation";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PAGE_SIZE = 24;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const offset = Math.max(parseInt(searchParams.get("offset") || "0", 10) || 0, 0);
  // Fetch one extra row to detect whether another page exists.
  const rows = await listCharacters({
    category: searchParams.get("category") || undefined,
    search: searchParams.get("search") || undefined,
    limit: PAGE_SIZE + 1,
    offset,
  });
  const hasMore = rows.length > PAGE_SIZE;
  const characters = hasMore ? rows.slice(0, PAGE_SIZE) : rows;
  return NextResponse.json({ characters, hasMore, nextOffset: offset + characters.length });
}

function str(v: unknown, max: number): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

export async function POST(req: NextRequest) {
  const rl = await rateLimit(clientKey(req, "char-create"), 20, 60_000);
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
  if (REQUIRE_EMAIL_VERIFICATION && !user.emailVerified) {
    return NextResponse.json(
      { error: "Please verify your email before creating a character." },
      { status: 403 }
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

  const tagline = str(body.tagline, 120);
  const description = str(body.description, 500);
  const greeting = str(body.greeting, 500);
  const persona = str(body.persona, 2000);

  // Baseline content safety screening before anything is stored.
  const screen = screenCharacterFields({
    name,
    tagline,
    description,
    greeting,
    persona,
  });
  if (!screen.ok) {
    logger.warn("moderation.blocked", {
      surface: "character.create",
      userId: user.id,
      category: screen.category,
    });
    return NextResponse.json({ error: MODERATION_MESSAGE }, { status: 422 });
  }

  const character = await createCharacter({
    name,
    tagline,
    description,
    greeting,
    persona,
    avatarEmoji,
    avatarColor,
    avatarImage: await persistAvatar(validAvatarImage(body.avatarImage)),
    category,
    visibility: body.visibility === "private" ? "private" : "public",
    creatorId: user.id,
    creatorName: user.displayName || user.username,
  });

  return NextResponse.json({ character }, { status: 201 });
}
