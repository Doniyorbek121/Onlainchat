"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/http";

export default function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/";

  const isLogin = mode === "login";

  const [login, setLogin] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const endpoint = isLogin ? "/api/auth/login" : "/api/auth/register";
      const payload = isLogin
        ? { login, password }
        : { username, email, displayName, password };
      const res = await apiFetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      router.push(next);
      router.refresh();
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
          <h1 className="text-2xl font-bold">
            {isLogin ? "Welcome back" : "Create your account"}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {isLogin
              ? "Sign in to keep chatting with your characters."
              : "Join to create characters and save your chats."}
          </p>

          <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
            {isLogin ? (
              <div>
                <label className="label">Email or username</label>
                <input
                  className="input"
                  autoComplete="username"
                  value={login}
                  onChange={(e) => setLogin(e.target.value)}
                  placeholder="you@example.com"
                />
              </div>
            ) : (
              <>
                <div>
                  <label className="label">Username</label>
                  <input
                    className="input"
                    autoComplete="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. stargazer"
                  />
                </div>
                <div>
                  <label className="label">Display name</label>
                  <input
                    className="input"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="How your name appears (optional)"
                  />
                </div>
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
              </>
            )}

            <div>
              <div className="flex items-center justify-between">
                <label className="label">Password</label>
                {isLogin && (
                  <Link
                    href="/forgot"
                    className="mb-1.5 text-xs font-medium text-brand-soft hover:underline"
                  >
                    Forgot?
                  </Link>
                )}
              </div>
              <input
                className="input"
                type="password"
                autoComplete={isLogin ? "current-password" : "new-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isLogin ? "Your password" : "At least 8 characters"}
              />
            </div>

            {error && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-300">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary mt-1">
              {loading
                ? "Please wait…"
                : isLogin
                ? "Sign in"
                : "Create account"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted">
            {isLogin ? (
              <>
                Don&apos;t have an account?{" "}
                <Link
                  href={`/register${next !== "/" ? `?next=${encodeURIComponent(next)}` : ""}`}
                  className="font-semibold text-brand-soft hover:underline"
                >
                  Sign up
                </Link>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <Link
                  href={`/login${next !== "/" ? `?next=${encodeURIComponent(next)}` : ""}`}
                  className="font-semibold text-brand-soft hover:underline"
                >
                  Sign in
                </Link>
              </>
            )}
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-muted">
          <Link href="/" className="hover:text-white">
            ← Back to discover
          </Link>
        </p>
      </div>
    </div>
  );
}
