import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { registerUser, setSessionCookie, sendEmailVerification } from "@/lib/auth";
import { peekAnonId } from "@/lib/session";
import { reassignOwnership } from "@/lib/db";
import { rateLimit, clientKey } from "@/lib/rateLimit";
import { captureError } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const rl = await rateLimit(clientKey(req, "register"), 5, 10 * 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many attempts. Please try again later." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const result = await registerUser({
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
    await reassignOwnership(anonId, result.user.id);
    (await cookies()).delete("oc_uid");
  }

  await setSessionCookie(result.token);

  // Send the verification email (best-effort — never blocks sign-up).
  let devToken: string | undefined;
  try {
    const { token, sent } = await sendEmailVerification(
      result.user,
      req.nextUrl.origin
    );
    if (!sent && process.env.NODE_ENV !== "production") devToken = token;
  } catch (err) {
    await captureError(err, { where: "register.sendVerification" });
  }

  return NextResponse.json(
    { user: result.user, verificationToken: devToken },
    { status: 201 }
  );
}
