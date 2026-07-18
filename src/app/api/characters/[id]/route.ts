import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/session";
import { getCharacter, deleteCharacter } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const character = getCharacter(id);
  if (!character) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ character });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const userId = await getUserId();
  const ok = deleteCharacter(id, userId);
  if (!ok) {
    return NextResponse.json(
      { error: "Not found or not yours" },
      { status: 403 }
    );
  }
  return NextResponse.json({ ok: true });
}
