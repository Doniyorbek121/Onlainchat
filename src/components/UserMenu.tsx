"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/http";
import type { User } from "@/lib/types";

export default function UserMenu({ user }: { user: User }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function logout() {
    setLoading(true);
    await apiFetch("/api/auth/logout", { method: "POST" });
    setOpen(false);
    router.push("/");
    router.refresh();
  }

  const initial = (user.displayName || user.username).charAt(0).toUpperCase();

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-xl border border-line bg-bg-card px-2.5 py-1.5 text-sm font-medium hover:bg-bg-hover"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-brand to-accent text-xs font-bold text-white">
          {initial}
        </span>
        <span className="hidden max-w-[120px] truncate sm:inline">
          {user.displayName || user.username}
        </span>
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
          <div className="absolute right-0 z-50 mt-2 w-52 overflow-hidden rounded-xl border border-line bg-bg-card shadow-2xl shadow-black/40">
            <div className="border-b border-line px-4 py-3">
              <p className="truncate text-sm font-semibold">
                {user.displayName || user.username}
              </p>
              <p className="truncate text-xs text-muted">@{user.username}</p>
            </div>
            <Link
              href={`/u/${user.username}`}
              onClick={() => setOpen(false)}
              className="block px-4 py-2.5 text-sm hover:bg-bg-hover"
            >
              View profile
            </Link>
            <Link
              href="/mine"
              onClick={() => setOpen(false)}
              className="block px-4 py-2.5 text-sm hover:bg-bg-hover"
            >
              My characters
            </Link>
            <Link
              href="/library"
              onClick={() => setOpen(false)}
              className="block px-4 py-2.5 text-sm hover:bg-bg-hover"
            >
              My chats
            </Link>
            <Link
              href="/create"
              onClick={() => setOpen(false)}
              className="block px-4 py-2.5 text-sm hover:bg-bg-hover"
            >
              Create character
            </Link>
            <button
              onClick={logout}
              disabled={loading}
              className="block w-full px-4 py-2.5 text-left text-sm text-red-300 hover:bg-bg-hover"
            >
              {loading ? "Signing out…" : "Sign out"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
