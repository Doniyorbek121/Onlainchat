"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LOCALES } from "@/lib/i18n/config";
import { useLocale } from "./I18nProvider";

export default function LanguageSwitcher() {
  const router = useRouter();
  const locale = useLocale();
  const [open, setOpen] = useState(false);

  const current = LOCALES.find((l) => l.code === locale) ?? LOCALES[0];

  function choose(code: string) {
    document.cookie = `oc_lang=${code}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    setOpen(false);
    router.refresh();
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 items-center gap-1.5 rounded-xl border border-line bg-bg-card px-2.5 text-sm font-medium hover:bg-bg-hover"
        aria-label="Language"
        title={current.name}
      >
        <span className="text-base leading-none">🌐</span>
        <span className="hidden sm:inline">{current.code.toUpperCase()}</span>
        <span className="text-muted">▾</span>
      </button>

      {open && (
        <>
          <button
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setOpen(false)}
            aria-hidden
            tabIndex={-1}
          />
          <div className="absolute right-0 z-50 mt-2 max-h-80 w-52 overflow-y-auto rounded-xl border border-line bg-bg-card py-1 shadow-2xl shadow-black/40">
            {LOCALES.map((l) => (
              <button
                key={l.code}
                onClick={() => choose(l.code)}
                dir={l.dir}
                className={`flex w-full items-center justify-between px-4 py-2 text-sm hover:bg-bg-hover ${
                  l.code === locale ? "text-brand-soft" : ""
                }`}
              >
                <span>{l.name}</span>
                {l.code === locale && <span>✓</span>}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
