import { NextResponse } from "next/server";
import { getCurrentUser, clearSessionCookie } from "@/lib/auth";
import { deleteUserCascade } from "@/lib/db";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GDPR account deletion: permanently removes the user and all their data. */
export async function DELETE() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const ok = await deleteUserCascade(user.id);
  await clearSessionCookie();
  logger.info("account.deleted", { userId: user.id });

  return NextResponse.json({ ok });
}
