"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useT } from "./I18nProvider";

const CONSENT_COOKIE = "oc_consent";

function hasConsent(): boolean {
  if (typeof document === "undefined") return true;
  return /(?:^|;\s*)oc_consent=1(?:;|$)/.test(document.cookie);
}

/**
 * First-visit gate: confirms the visitor meets the minimum age and accepts the
 * Terms & Privacy Policy, and doubles as the cookie notice. Stored in a
 * long-lived `oc_consent` cookie so it shows only once. Blocking by design —
 * age assurance for an AI companion product must precede use.
 */
export default function ConsentGate() {
  const t = useT();
  const [show, setShow] = useState(false);
  const [declined, setDeclined] = useState(false);

  useEffect(() => {
    if (!hasConsent()) setShow(true);
  }, []);

  function accept() {
    document.cookie = `${CONSENT_COOKIE}=1; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    setShow(false);
  }

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Age and terms confirmation"
    >
      <div className="w-full max-w-md rounded-2xl border border-line bg-bg-card p-6 text-center shadow-2xl">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand/20 text-2xl">
          🔞
        </div>
        {declined ? (
          <>
            <h2 className="text-lg font-semibold text-white">Come back later</h2>
            <p className="mt-2 text-sm text-muted">
              You must be at least 18 years old to use this service.
            </p>
          </>
        ) : (
          <>
            <h2 className="text-lg font-semibold text-white">
              Before you continue
            </h2>
            <p className="mt-2 text-sm text-muted">
              This platform hosts AI characters created by users. Please confirm
              you are <strong className="text-white">18 or older</strong> and
              agree to our{" "}
              <Link href="/terms" className="text-brand-soft hover:underline">
                {t("footer.terms")}
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="text-brand-soft hover:underline">
                {t("footer.privacy")}
              </Link>
              .
            </p>
            <p className="mt-3 text-xs text-muted">{t("cookie.message")}</p>
            <div className="mt-5 flex flex-col gap-2">
              <button
                type="button"
                onClick={accept}
                className="btn-primary w-full py-2.5"
              >
                I&apos;m 18+ and I agree
              </button>
              <button
                type="button"
                onClick={() => setDeclined(true)}
                className="btn w-full py-2.5 text-muted hover:text-white"
              >
                I&apos;m under 18
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
