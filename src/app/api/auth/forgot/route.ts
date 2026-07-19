import { NextRequest, NextResponse } from "next/server";
import { requestPasswordReset } from "@/lib/auth";
import { deliverPasswordReset } from "@/lib/email";
import { rateLimit, clientKey } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const rl = rateLimit(clientKey(req, "forgot"), 5, 15 * 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = String(body.email || "").trim();
  // Generic response either way — never reveal whether an account exists.
  const generic = { ok: true } as Record<string, unknown>;

  if (email) {
    const result = await requestPasswordReset(email);
    if (result) {
      const base = process.env.APP_URL || req.nextUrl.origin;
      const link = `${base}/reset?token=${result.token}`;
      const sent = await deliverPasswordReset(email, link);
      // Self-hosted convenience: when no email transport is configured and we're
      // not in production, return the link so the user can proceed.
      if (!sent && process.env.NODE_ENV !== "production") {
        generic.devResetUrl = link;
      }
    }
  }

  return NextResponse.json(generic);
}
