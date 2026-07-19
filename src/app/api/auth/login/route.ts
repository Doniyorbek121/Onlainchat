import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { loginUser, setSessionCookie } from "@/lib/auth";
import { peekAnonId } from "@/lib/session";
import { reassignOwnership } from "@/lib/db";
import { rateLimit, clientKey } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const rl = rateLimit(clientKey(req, "login"), 10, 5 * 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many attempts. Please try again shortly." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const result = await loginUser(
    String(body.login || ""),
    String(body.password || "")
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 401 });
  }

  const anonId = await peekAnonId();
  if (anonId) {
    await reassignOwnership(anonId, result.user.id);
    (await cookies()).delete("oc_uid");
  }

  await setSessionCookie(result.token);
  return NextResponse.json({ user: result.user });
}
