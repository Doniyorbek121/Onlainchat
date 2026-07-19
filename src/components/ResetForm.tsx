"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/http";

export default function ResetForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch("/api/auth/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      setDone(true);
      setTimeout(() => router.push("/login"), 1600);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-8 flex items-center justify-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand to-accent text-xl shadow-lg shadow-brand/30">
            ✦
          </span>
          <span className="text-xl font-bold tracking-tight">
            Character<span className="text-brand-soft">AI</span>
          </span>
        </Link>

        <div className="card p-7">
          {done ? (
            <div className="text-center">
              <div className="mb-2 text-4xl">✅</div>
              <h1 className="text-2xl font-bold">Password updated</h1>
              <p className="mt-2 text-sm text-muted">
                You can now sign in with your new password. Redirecting…
              </p>
              <Link href="/login" className="btn-primary mt-6 w-full">
                Go to sign in
              </Link>
            </div>
          ) : !token ? (
            <div className="text-center">
              <div className="mb-2 text-4xl">🔗</div>
              <h1 className="text-2xl font-bold">Invalid reset link</h1>
              <p className="mt-2 text-sm text-muted">
                This link is missing its token. Request a new one.
              </p>
              <Link href="/forgot" className="btn-primary mt-6 w-full">
                Request a new link
              </Link>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold">Set a new password</h1>
              <p className="mt-1 text-sm text-muted">
                Choose a strong password you don&apos;t use elsewhere.
              </p>
              <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
                <div>
                  <label className="label">New password</label>
                  <input
                    className="input"
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                  />
                </div>
                <div>
                  <label className="label">Confirm password</label>
                  <input
                    className="input"
                    type="password"
                    autoComplete="new-password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Repeat your password"
                  />
                </div>
                {error && (
                  <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-300">
                    {error}
                  </div>
                )}
                <button type="submit" disabled={loading} className="btn-primary mt-1">
                  {loading ? "Updating…" : "Update password"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
