import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * security.txt (RFC 9116). Configure the contact via SECURITY_CONTACT
 * (an email or URL). Served at /.well-known/security.txt via a rewrite.
 */
export function GET() {
  const contact =
    process.env.SECURITY_CONTACT || "mailto:security@example.com";
  const appUrl = (process.env.APP_URL || "").replace(/\/$/, "");
  // Expiry one year out, per the spec's recommendation.
  const expires = new Date(Date.now() + 365 * 86_400_000).toISOString();

  const lines = [
    `Contact: ${contact}`,
    `Expires: ${expires}`,
    "Preferred-Languages: en",
    appUrl ? `Canonical: ${appUrl}/.well-known/security.txt` : "",
    appUrl ? `Policy: ${appUrl}/terms` : "",
  ].filter(Boolean);

  return new NextResponse(lines.join("\n") + "\n", {
    status: 200,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
