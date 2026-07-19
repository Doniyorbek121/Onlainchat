"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/http";
import { useT } from "./I18nProvider";

/**
 * Non-blocking banner shown to signed-in users whose email isn't verified.
 * Renders nothing when the user is verified.
 */
export default function VerifyEmailBanner({ verified }: { verified: boolean }) {
  const t = useT();
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [hidden, setHidden] = useState(false);

  if (verified || hidden) return null;

  async function resend() {
    setState("sending");
    try {
      await apiFetch("/api/auth/verify/resend", { method: "POST" });
      setState("sent");
    } catch {
      setState("idle");
    }
  }

  return (
    <div
      role="status"
      className="flex items-center justify-center gap-3 bg-brand/15 px-4 py-2 text-sm text-white"
    >
      <span aria-hidden="true">✉️</span>
      <span>{state === "sent" ? t("verify.sent") : t("verify.banner")}</span>
      {state !== "sent" && (
        <button
          type="button"
          onClick={resend}
          disabled={state === "sending"}
          className="font-semibold text-brand-soft underline disabled:opacity-60"
        >
          {t("verify.resend")}
        </button>
      )}
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => setHidden(true)}
        className="ml-2 text-muted hover:text-white"
      >
        ✕
      </button>
    </div>
  );
}
