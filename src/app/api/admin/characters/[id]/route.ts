import { NextRequest, NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth";
import { adminDeleteCharacter, getCharacter } from "@/lib/db";
import { deleteAvatar } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const existing = await getCharacter(id);
  const ok = await adminDeleteCharacter(id);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing?.avatarImage) await deleteAvatar(existing.avatarImage);
  return NextResponse.json({ ok: true });
}
