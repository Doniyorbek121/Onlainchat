import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, sendEmailVerification } from "@/lib/auth";
import { rateLimit, clientKey } from "@/lib/rateLimit";
import { captureError } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const rl = await rateLimit(clientKey(req, "verify-resend"), 3, 15 * 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Please wait before requesting another email." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    );
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  if (user.emailVerified) {
    return NextResponse.json({ ok: true, alreadyVerified: true });
  }

  let devToken: string | undefined;
  try {
    const { token, sent } = await sendEmailVerification(user, req.nextUrl.origin);
    if (!sent && process.env.NODE_ENV !== "production") devToken = token;
  } catch (err) {
    await captureError(err, { where: "verify.resend" });
    return NextResponse.json({ error: "Could not send email." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, verificationToken: devToken });
}
