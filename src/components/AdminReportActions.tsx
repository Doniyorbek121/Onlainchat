"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/http";

export default function AdminReportActions({
  id,
  targetType,
  targetId,
}: {
  id: string;
  targetType: "character" | "message" | "user";
  targetId: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function setStatus(status: "resolved" | "dismissed") {
    setBusy(true);
    const res = await apiFetch(`/api/admin/reports/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) router.refresh();
    else setBusy(false);
  }

  async function deleteTarget() {
    if (targetType !== "character" && targetType !== "user") return;
    if (!confirm(`Delete the reported ${targetType}? This cannot be undone.`)) return;
    setBusy(true);
    const kind = targetType === "user" ? "users" : "characters";
    const res = await apiFetch(`/api/admin/${kind}/${targetId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      await apiFetch(`/api/admin/reports/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "resolved" }),
      });
      router.refresh();
    } else {
      setBusy(false);
    }
  }

  return (
    <div className="flex shrink-0 gap-1.5">
      {(targetType === "character" || targetType === "user") && (
        <button
          onClick={deleteTarget}
          disabled={busy}
          className="rounded-lg border border-red-500/40 bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-300 hover:bg-red-500/20 disabled:opacity-50"
        >
          Delete {targetType}
        </button>
      )}
      <button
        onClick={() => setStatus("resolved")}
        disabled={busy}
        className="rounded-lg border border-accent/40 bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent hover:bg-accent/20 disabled:opacity-50"
      >
        Resolve
      </button>
      <button
        onClick={() => setStatus("dismissed")}
        disabled={busy}
        className="rounded-lg border border-line bg-bg px-2.5 py-1 text-xs font-medium text-muted hover:text-white disabled:opacity-50"
      >
        Dismiss
      </button>
    </div>
  );
}
