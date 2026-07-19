"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Avatar from "./Avatar";
import { apiFetch } from "@/lib/http";

export interface LibraryItem {
  conversationId: string;
  characterId: string;
  characterName: string;
  avatarEmoji: string;
  avatarColor: string;
  avatarImage: string;
  preview: string;
  updatedAt: number;
}

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function LibraryList({ items }: { items: LibraryItem[] }) {
  const router = useRouter();
  const [rows, setRows] = useState(items);
  const [busy, setBusy] = useState<string | null>(null);

  async function remove(conversationId: string) {
    setBusy(conversationId);
    const res = await apiFetch(`/api/conversations/${conversationId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setRows((r) => r.filter((x) => x.conversationId !== conversationId));
      router.refresh();
    }
    setBusy(null);
  }

  if (rows.length === 0) {
    return (
      <div className="card flex flex-col items-center gap-3 p-12 text-center">
        <span className="text-4xl">💬</span>
        <p className="text-muted">No chats here yet.</p>
        <Link href="/" className="btn-primary mt-2">
          Discover characters
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {rows.map((it) => (
        <div
          key={it.conversationId}
          className="card group flex items-center gap-3 p-3 transition-colors hover:border-brand/50 hover:bg-bg-hover"
        >
          <Link
            href={`/chat/${it.characterId}?c=${it.conversationId}`}
            className="flex min-w-0 flex-1 items-center gap-3"
          >
            <Avatar
              emoji={it.avatarEmoji}
              color={it.avatarColor}
              imageUrl={it.avatarImage}
              size={48}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate font-semibold">{it.characterName}</p>
                <span className="shrink-0 text-[11px] text-muted">
                  {timeAgo(it.updatedAt)}
                </span>
              </div>
              <p className="truncate text-sm text-muted">
                {it.preview || "New chat"}
              </p>
            </div>
          </Link>
          <button
            onClick={() => remove(it.conversationId)}
            disabled={busy === it.conversationId}
            title="Delete chat"
            className="shrink-0 rounded-lg px-2.5 py-2 text-muted transition-colors hover:bg-red-500/15 hover:text-red-300"
          >
            {busy === it.conversationId ? "…" : "🗑"}
          </button>
        </div>
      ))}
    </div>
  );
}
