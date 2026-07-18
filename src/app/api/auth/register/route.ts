import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { registerUser, setSessionCookie } from "@/lib/auth";
import { peekAnonId } from "@/lib/session";
import { reassignOwnership } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const result = registerUser({
    username: String(body.username || ""),
    email: String(body.email || ""),
    password: String(body.password || ""),
    displayName: body.displayName ? String(body.displayName) : undefined,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  // Migrate any anonymous characters/chats into the new account.
  const anonId = await peekAnonId();
  if (anonId) {
    reassignOwnership(anonId, result.user.id);
    (await cookies()).delete("oc_uid");
  }

  await setSessionCookie(result.token);
  return NextResponse.json({ user: result.user }, { status: 201 });
}
