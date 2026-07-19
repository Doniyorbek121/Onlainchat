import { NextRequest, NextResponse } from "next/server";
import { resetPassword } from "@/lib/auth";
import { rateLimit, clientKey } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const rl = await rateLimit(clientKey(req, "reset"), 10, 15 * 60_000);
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

  const result = await resetPassword(
    String(body.token || ""),
    String(body.password || "")
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
