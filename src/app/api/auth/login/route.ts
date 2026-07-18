import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { loginUser, setSessionCookie } from "@/lib/auth";
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

  const result = loginUser(
    String(body.login || ""),
    String(body.password || "")
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 401 });
  }

  const anonId = await peekAnonId();
  if (anonId) {
    reassignOwnership(anonId, result.user.id);
    (await cookies()).delete("oc_uid");
  }

  await setSessionCookie(result.token);
  return NextResponse.json({ user: result.user });
}
