import { NextResponse } from "next/server";
import { ping } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Liveness/readiness probe for load balancers and orchestrators. */
export async function GET() {
  try {
    await ping();
    return NextResponse.json({ ok: true, db: "up" });
  } catch {
    return NextResponse.json({ ok: false, db: "down" }, { status: 503 });
  }
}
