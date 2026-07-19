"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/http";

export default function FavoriteButton({
  characterId,
  initialFavorited,
  initialCount,
  isAuthed,
}: {
  characterId: string;
  initialFavorited: boolean;
  initialCount: number;
  isAuthed: boolean;
}) {
  const router = useRouter();
  const [favorited, setFavorited] = useState(initialFavorited);
  const [count, setCount] = useState(initialCount);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (!isAuthed) {
      router.push(`/login?next=/character/${characterId}`);
      return;
    }
    if (busy) return;
    setBusy(true);
    // Optimistic
    const next = !favorited;
    setFavorited(next);
    setCount((c) => c + (next ? 1 : -1));
    try {
      const res = await apiFetch(`/api/characters/${characterId}/favorite`, {
        method: "POST",
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setFavorited(data.favorited);
      setCount(data.count);
    } catch {
      // revert
      setFavorited(!next);
      setCount((c) => c - (next ? 1 : -1));
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={busy}
      className={`btn px-5 border transition-colors ${
        favorited
          ? "border-pink-500/50 bg-pink-500/15 text-pink-300"
          : "border-line bg-bg-card text-white hover:bg-bg-hover"
      }`}
      aria-pressed={favorited}
    >
      <span className="text-base leading-none">{favorited ? "♥" : "♡"}</span>
      {favorited ? "Saved" : "Save"}
      {count > 0 && (
        <span className="text-xs text-muted">· {count.toLocaleString()}</span>
      )}
    </button>
  );
}
