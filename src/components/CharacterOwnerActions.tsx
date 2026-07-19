"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/http";

export default function CharacterOwnerActions({
  characterId,
  characterName,
}: {
  characterId: string;
  characterName: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    setDeleting(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/characters/${characterId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Could not delete character");
      }
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setDeleting(false);
      setConfirming(false);
    }
  }

  return (
    <div className="mt-4 w-full">
      <div className="flex items-center justify-center gap-2">
        <Link
          href={`/character/${characterId}/edit`}
          className="btn-ghost px-5"
        >
          ✏️ Edit
        </Link>
        <button
          onClick={() => setConfirming(true)}
          className="btn px-5 border border-red-500/40 bg-red-500/10 text-red-300 hover:bg-red-500/20"
        >
          🗑 Delete
        </button>
      </div>

      {error && (
        <p className="mt-3 text-center text-sm text-red-300">{error}</p>
      )}

      {confirming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="card w-full max-w-sm p-6 text-center">
            <div className="mb-2 text-3xl">🗑</div>
            <h3 className="text-lg font-bold">Delete this character?</h3>
            <p className="mt-1 text-sm text-muted">
              <span className="font-semibold text-white/90">
                {characterName}
              </span>{" "}
              and all of its chats will be permanently removed. This can&apos;t
              be undone.
            </p>
            <div className="mt-5 flex gap-2">
              <button
                onClick={() => setConfirming(false)}
                disabled={deleting}
                className="btn-ghost flex-1"
              >
                Cancel
              </button>
              <button
                onClick={remove}
                disabled={deleting}
                className="btn flex-1 bg-red-500 text-white hover:bg-red-600"
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
