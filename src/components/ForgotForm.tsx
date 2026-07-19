"use client";

import { useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/http";

export default function ForgotForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [devUrl, setDevUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch("/api/auth/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      setSent(true);
      if (data.devResetUrl) setDevUrl(data.devResetUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
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
          {sent ? (
            <div className="text-center">
              <div className="mb-2 text-4xl">📬</div>
              <h1 className="text-2xl font-bold">Check your email</h1>
              <p className="mt-2 text-sm text-muted">
                If an account exists for <strong>{email}</strong>, we&apos;ve sent a
                link to reset your password. It&apos;s valid for 1 hour.
              </p>
              {devUrl && (
                <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-left text-xs text-amber-200">
                  <p className="mb-1 font-semibold">Dev mode (no email configured):</p>
                  <Link href={devUrl} className="break-all underline">
                    {devUrl}
                  </Link>
                </div>
              )}
              <Link href="/login" className="btn-primary mt-6 w-full">
                Back to sign in
              </Link>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold">Forgot your password?</h1>
              <p className="mt-1 text-sm text-muted">
                Enter your email and we&apos;ll send you a reset link.
              </p>
              <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
                <div>
                  <label className="label">Email</label>
                  <input
                    className="input"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                  />
                </div>
                {error && (
                  <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-300">
                    {error}
                  </div>
                )}
                <button type="submit" disabled={loading} className="btn-primary mt-1">
                  {loading ? "Sending…" : "Send reset link"}
                </button>
              </form>
              <p className="mt-6 text-center text-sm text-muted">
                Remembered it?{" "}
                <Link href="/login" className="font-semibold text-brand-soft hover:underline">
                  Sign in
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
