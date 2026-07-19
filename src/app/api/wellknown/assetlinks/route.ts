import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Digital Asset Links for the Trusted Web Activity (Play Store) wrapper, served
 * at /.well-known/assetlinks.json via a rewrite. This is what lets the Android
 * app open the site full-screen (no browser chrome) and verify ownership.
 *
 * Configure:
 *   ANDROID_PACKAGE_NAME   e.g. com.characterai.app
 *   ANDROID_CERT_SHA256    comma-separated SHA-256 signing fingerprints
 *                          (upload key + Play App Signing key from Play Console)
 *
 * Returns [] until configured, which is valid JSON (verification simply fails
 * until the operator fills these in).
 */
export function GET() {
  const pkg = process.env.ANDROID_PACKAGE_NAME;
  const fingerprints = (process.env.ANDROID_CERT_SHA256 || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const body =
    pkg && fingerprints.length
      ? [
          {
            relation: ["delegate_permission/common.handle_all_urls"],
            target: {
              namespace: "android_app",
              package_name: pkg,
              sha256_cert_fingerprints: fingerprints,
            },
          },
        ]
      : [];

  return NextResponse.json(body, {
    headers: { "Content-Type": "application/json" },
  });
}
