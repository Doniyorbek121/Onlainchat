import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getCharacter, deleteCharacter, updateCharacter } from "@/lib/db";
import { CATEGORIES, AVATAR_COLORS, AVATAR_EMOJIS } from "@/lib/types";
import { validAvatarImage } from "@/lib/validate";
import { persistAvatar, deleteAvatar } from "@/lib/storage";
import { screenCharacterFields, MODERATION_MESSAGE } from "@/lib/moderation";
import { logger } from "@/lib/logger";

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

  const tagline = str(body.tagline, 120);
  const description = str(body.description, 500);
  const greeting = str(body.greeting, 500);
  const persona = str(body.persona, 2000);

  const screen = screenCharacterFields({
    name,
    tagline,
    description,
    greeting,
    persona,
  });
  if (!screen.ok) {
    logger.warn("moderation.blocked", {
      surface: "character.update",
      userId: user.id,
      category: screen.category,
    });
    return NextResponse.json({ error: MODERATION_MESSAGE }, { status: 422 });
  }

  // Avatar handling on edit:
  //  - a new data: URL → validate + (optionally) upload to object storage
  //  - empty string    → the user removed the photo
  //  - anything else    → keep the stored value (e.g. an existing S3/CDN URL),
  //    so editing other fields never wipes the avatar or re-uploads it.
  const incomingAvatar =
    typeof body.avatarImage === "string" ? body.avatarImage : "";
  let avatarImage: string;
  if (incomingAvatar === "") {
    avatarImage = "";
  } else if (incomingAvatar.startsWith("data:")) {
    avatarImage = await persistAvatar(validAvatarImage(incomingAvatar));
  } else {
    avatarImage = existing.avatarImage;
  }
  // If the stored image changed, clean up the old object (no-op unless S3).
  if (existing.avatarImage && existing.avatarImage !== avatarImage) {
    await deleteAvatar(existing.avatarImage);
  }

  const character = await updateCharacter(id, user.id, {
    name,
    tagline,
    description,
    greeting,
    persona,
    avatarEmoji: str(body.avatarEmoji, 8) || AVATAR_EMOJIS[0],
    avatarColor: AVATAR_COLORS.includes(str(body.avatarColor, 9))
      ? str(body.avatarColor, 9)
      : existing.avatarColor,
    avatarImage,
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
  const existing = await getCharacter(id);
  const ok = await deleteCharacter(id, user.id);
  if (!ok) {
    return NextResponse.json(
      { error: "Not found or not yours" },
      { status: 403 }
    );
  }
  if (existing?.avatarImage) await deleteAvatar(existing.avatarImage);
  return NextResponse.json({ ok: true });
}
