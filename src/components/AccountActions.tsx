"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/http";
import { useT } from "./I18nProvider";

export default function AccountActions() {
  const t = useT();
  const router = useRouter();
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function deleteAccount() {
    if (confirm !== "DELETE") return;
    setBusy(true);
    setError("");
    try {
      const res = await apiFetch("/api/account", { method: "DELETE" });
      if (!res.ok) throw new Error();
      router.push("/");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
      setBusy(false);
    }
  }

  return (
    <div className="mt-8 space-y-6">
      <section className="card p-5">
        <h2 className="text-lg font-semibold text-white">
          {t("settings.export")}
        </h2>
        <p className="mt-1 text-sm text-muted">{t("settings.exportDesc")}</p>
        <a
          href="/api/account/export"
          className="btn-primary mt-4 inline-block px-5"
          download
        >
          ⬇ {t("settings.export")}
        </a>
      </section>

      <section className="card border-red-500/30 p-5">
        <h2 className="text-lg font-semibold text-red-400">
          {t("settings.delete")}
        </h2>
        <p className="mt-1 text-sm text-muted">{t("settings.deleteDesc")}</p>
        <label
          htmlFor="delete-confirm"
          className="mt-4 block text-sm font-medium text-white"
        >
          {t("settings.deleteConfirm")}
        </label>
        <input
          id="delete-confirm"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="mt-1 w-full max-w-xs rounded-lg border border-line bg-bg px-3 py-2 text-white"
          autoComplete="off"
        />
        {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
        <div className="mt-4">
          <button
            type="button"
            onClick={deleteAccount}
            disabled={confirm !== "DELETE" || busy}
            className="btn bg-red-600 px-5 text-white hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t("settings.delete")}
          </button>
        </div>
      </section>
    </div>
  );
}
