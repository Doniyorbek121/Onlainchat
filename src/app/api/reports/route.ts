import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/session";
import { createReport } from "@/lib/db";
import { rateLimit, clientKey } from "@/lib/rateLimit";
import type { ReportTargetType } from "@/lib/types";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TARGET_TYPES: ReportTargetType[] = ["character", "message", "user"];
const REASONS = [
  "sexual-content",
  "minor-safety",
  "harassment",
  "hate",
  "violence",
  "illegal",
  "spam",
  "other",
];

export async function POST(req: NextRequest) {
  const rl = await rateLimit(clientKey(req, "report"), 20, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "You're reporting too quickly. Please wait a moment." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    );
  }

  const reporterId = await getUserId();

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const targetType = body.targetType as ReportTargetType;
  const targetId =
    typeof body.targetId === "string" ? body.targetId.slice(0, 64) : "";
  const reason = typeof body.reason === "string" ? body.reason : "";
  const details =
    typeof body.details === "string" ? body.details.trim().slice(0, 1000) : "";

  if (!TARGET_TYPES.includes(targetType) || !targetId) {
    return NextResponse.json({ error: "Invalid report target." }, { status: 400 });
  }
  if (!REASONS.includes(reason)) {
    return NextResponse.json({ error: "Invalid report reason." }, { status: 400 });
  }

  await createReport({ targetType, targetId, reporterId, reason, details });
  logger.info("report.created", { targetType, reason });

  return NextResponse.json({ ok: true }, { status: 201 });
}
