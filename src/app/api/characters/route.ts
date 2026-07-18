import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/session";
import { createCharacter, listCharacters } from "@/lib/db";
import { CATEGORIES, AVATAR_COLORS, AVATAR_EMOJIS } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const characters = listCharacters({
    category: searchParams.get("category") || undefined,
    search: searchParams.get("search") || undefined,
  });
  return NextResponse.json({ characters });
}

function str(v: unknown, max: number): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

export async function POST(req: NextRequest) {
  const userId = await getUserId();

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

  const category = CATEGORIES.includes(
    (body.category as (typeof CATEGORIES)[number]) ?? "Assistant"
  )
    ? (body.category as string)
    : "Assistant";

  const avatarEmoji =
    str(body.avatarEmoji, 8) || AVATAR_EMOJIS[0];
  const avatarColor = AVATAR_COLORS.includes(str(body.avatarColor, 9))
    ? str(body.avatarColor, 9)
    : AVATAR_COLORS[0];

  const creatorName = str(body.creatorName, 40) || "Anonymous";

  const character = createCharacter({
    name,
    tagline: str(body.tagline, 120),
    description: str(body.description, 500),
    greeting: str(body.greeting, 500),
    persona: str(body.persona, 2000),
    avatarEmoji,
    avatarColor,
    category,
    visibility: body.visibility === "private" ? "private" : "public",
    creatorId: userId,
    creatorName,
  });

  return NextResponse.json({ character }, { status: 201 });
}
