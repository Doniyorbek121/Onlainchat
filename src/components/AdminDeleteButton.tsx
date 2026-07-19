"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/http";

export default function AdminDeleteButton({
  kind,
  id,
  label,
}: {
  kind: "users" | "characters";
  id: string;
  label: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function remove() {
    if (!confirm(`Delete this ${kind === "users" ? "user" : "character"}: ${label}?\nThis cannot be undone.`)) {
      return;
    }
    setBusy(true);
    const res = await apiFetch(`/api/admin/${kind}/${id}`, { method: "DELETE" });
    if (res.ok) {
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      alert(data.error || "Delete failed");
      setBusy(false);
    }
  }

  return (
    <button
      onClick={remove}
      disabled={busy}
      className="rounded-lg border border-red-500/40 bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-300 hover:bg-red-500/20 disabled:opacity-50"
    >
      {busy ? "…" : "Delete"}
    </button>
  );
}
