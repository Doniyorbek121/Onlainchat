import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/session";
import { deleteConversation } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const userId = await getUserId();
  const ok = await deleteConversation(id, userId);
  if (!ok) {
    return NextResponse.json({ error: "Not found" }, { status: 403 });
  }
  return NextResponse.json({ ok: true });
}
