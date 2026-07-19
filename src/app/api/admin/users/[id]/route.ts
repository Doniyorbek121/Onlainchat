import { NextRequest, NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth";
import { deleteUserCascade } from "@/lib/db";

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
  if (id === admin.id) {
    return NextResponse.json(
      { error: "You can't delete your own admin account here." },
      { status: 400 }
    );
  }
  const ok = await deleteUserCascade(id);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
