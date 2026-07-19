import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { loginUser, setSessionCookie } from "@/lib/auth";
import { peekAnonId } from "@/lib/session";
import { reassignOwnership } from "@/lib/db";
import { rateLimit, resetRateLimit, clientKey } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Per-account lockout: block brute force against a single account even from
// rotating IPs. Every attempt counts; a successful login clears the counter.
const ACCOUNT_MAX_ATTEMPTS = 10;
const ACCOUNT_WINDOW_MS = 15 * 60_000;

export async function POST(req: NextRequest) {
  const rl = await rateLimit(clientKey(req, "login"), 10, 5 * 60_000);
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

  const login = String(body.login || "");
  const acctKey = `login-acct:${login.trim().toLowerCase()}`;
  if (login.trim()) {
    const acct = await rateLimit(acctKey, ACCOUNT_MAX_ATTEMPTS, ACCOUNT_WINDOW_MS);
    if (!acct.ok) {
      return NextResponse.json(
        {
          error:
            "This account is temporarily locked after too many attempts. Please try again later or reset your password.",
        },
        { status: 429, headers: { "Retry-After": String(acct.retryAfter) } }
      );
    }
  }

  const result = await loginUser(login, String(body.password || ""));

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 401 });
  }

  // Successful login — clear the per-account attempt counter.
  await resetRateLimit(acctKey);

  const anonId = await peekAnonId();
  if (anonId) {
    await reassignOwnership(anonId, result.user.id);
    (await cookies()).delete("oc_uid");
  }

  await setSessionCookie(result.token);
  return NextResponse.json({ user: result.user });
}
