"use client";

import { useState } from "react";

export default function ShareButton({ path }: { path: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url =
      typeof window !== "undefined" ? `${window.location.origin}${path}` : path;
    try {
      if (navigator.share) {
        await navigator.share({ url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* user cancelled or clipboard blocked */
    }
  }

  return (
    <button
      onClick={share}
      className="btn px-5 border border-line bg-bg-card text-white hover:bg-bg-hover"
    >
      <span className="text-base leading-none">🔗</span>
      {copied ? "Copied!" : "Share"}
    </button>
  );
}
