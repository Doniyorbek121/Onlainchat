import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getCharacter, deleteCharacter, updateCharacter } from "@/lib/db";
import { CATEGORIES, AVATAR_COLORS, AVATAR_EMOJIS } from "@/lib/types";
import { validAvatarImage } from "@/lib/validate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function str(v: unknown, max: number): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const character = await getCharacter(id);
  if (!character) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  // P0: don't leak private characters to non-owners.
  if (character.visibility === "private") {
    const user = await getCurrentUser();
    if (character.creatorId !== user?.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
  }
  return NextResponse.json({ character });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const existing = await getCharacter(id);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (existing.creatorId !== user.id) {
    return NextResponse.json(
      { error: "You can only edit characters you created." },
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
      : existing.category;

  const character = await updateCharacter(id, user.id, {
    name,
    tagline: str(body.tagline, 120),
    description: str(body.description, 500),
    greeting: str(body.greeting, 500),
    persona: str(body.persona, 2000),
    avatarEmoji: str(body.avatarEmoji, 8) || AVATAR_EMOJIS[0],
    avatarColor: AVATAR_COLORS.includes(str(body.avatarColor, 9))
      ? str(body.avatarColor, 9)
      : existing.avatarColor,
    avatarImage: validAvatarImage(body.avatarImage),
    category,
    visibility: body.visibility === "private" ? "private" : "public",
  });

  return NextResponse.json({ character }, { status: 200 });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  const ok = await deleteCharacter(id, user.id);
  if (!ok) {
    return NextResponse.json(
      { error: "Not found or not yours" },
      { status: 403 }
    );
  }
  return NextResponse.json({ ok: true });
}
