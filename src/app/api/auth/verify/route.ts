import { NextRequest, NextResponse } from "next/server";
import { verifyEmailToken } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Verification links are GET requests clicked from an email. */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") || "";
  const ok = await verifyEmailToken(token);
  const url = new URL("/settings", req.nextUrl.origin);
  url.searchParams.set("verified", ok ? "1" : "0");
  return NextResponse.redirect(url);
}
