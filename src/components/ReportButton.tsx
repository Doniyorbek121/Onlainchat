"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/http";
import { useT } from "./I18nProvider";
import type { ReportTargetType } from "@/lib/types";

const REASONS = [
  "sexual-content",
  "minor-safety",
  "harassment",
  "hate",
  "violence",
  "illegal",
  "spam",
  "other",
] as const;

export default function ReportButton({
  targetType,
  targetId,
  className = "",
}: {
  targetType: ReportTargetType;
  targetId: string;
  className?: string;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string>("sexual-content");
  const [details, setDetails] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "done">("idle");

  async function submit() {
    setStatus("sending");
    try {
      await apiFetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetType, targetId, reason, details }),
      });
      setStatus("done");
      setTimeout(() => {
        setOpen(false);
        setStatus("idle");
        setDetails("");
      }, 1600);
    } catch {
      setStatus("idle");
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          className ||
          "btn px-4 border border-line bg-bg-card text-muted hover:text-white hover:bg-bg-hover"
        }
        aria-haspopup="dialog"
      >
        <span aria-hidden="true">⚑</span> {t("common.report")}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={t("report.title")}
          onClick={(e) => {
            if (e.target === e.currentTarget && status !== "sending") setOpen(false);
          }}
        >
          <div className="w-full max-w-md rounded-2xl border border-line bg-bg-card p-6 shadow-xl">
            {status === "done" ? (
              <p className="py-6 text-center text-white">{t("report.thanks")}</p>
            ) : (
              <>
                <h2 className="text-lg font-semibold text-white">
                  {t("report.title")}
                </h2>
                <p className="mt-1 text-sm text-muted">{t("report.subtitle")}</p>

                <label
                  className="mt-4 block text-sm font-medium text-white"
                  htmlFor="report-reason"
                >
                  {t("report.reason")}
                </label>
                <select
                  id="report-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-line bg-bg px-3 py-2 text-white"
                >
                  {REASONS.map((r) => (
                    <option key={r} value={r}>
                      {t(`report.reason.${r}`)}
                    </option>
                  ))}
                </select>

                <label
                  className="mt-4 block text-sm font-medium text-white"
                  htmlFor="report-details"
                >
                  {t("report.details")}
                </label>
                <textarea
                  id="report-details"
                  value={details}
                  onChange={(e) => setDetails(e.target.value.slice(0, 1000))}
                  rows={3}
                  className="mt-1 w-full resize-none rounded-lg border border-line bg-bg px-3 py-2 text-white"
                />

                <div className="mt-5 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    disabled={status === "sending"}
                    className="btn px-4 border border-line bg-bg text-muted hover:text-white"
                  >
                    {t("common.cancel")}
                  </button>
                  <button
                    type="button"
                    onClick={submit}
                    disabled={status === "sending"}
                    className="btn px-5 bg-brand text-white hover:opacity-90 disabled:opacity-60"
                  >
                    {t("report.submit")}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
