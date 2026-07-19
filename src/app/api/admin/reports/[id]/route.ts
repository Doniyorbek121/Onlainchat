import { NextRequest, NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth";
import { updateReportStatus, addAuditLog } from "@/lib/db";
import type { ReportStatus } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATUSES: ReportStatus[] = ["open", "resolved", "dismissed"];

/** Admin: change a report's status (resolve / dismiss / reopen). */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;

  let body: { status?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const status = body.status as ReportStatus;
  if (!STATUSES.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const ok = await updateReportStatus(id, status);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await addAuditLog({
    adminId: admin.id,
    action: `report_${status}`,
    targetType: "report",
    targetId: id,
  });
  return NextResponse.json({ ok: true });
}
