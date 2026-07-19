"use client";

import { useEffect } from "react";
import Link from "next/link";

/** Route-level error boundary. Shows a friendly recovery UI instead of a crash. */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface to the console; Sentry (if configured) captures it globally.
    console.error("route-error", error?.message, error?.digest);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/15 text-3xl">
        ⚠️
      </div>
      <h1 className="text-xl font-bold text-white">Something went wrong</h1>
      <p className="mt-2 max-w-sm text-sm text-muted">
        An unexpected error occurred. You can try again, or head back to the
        home page.
      </p>
      <div className="mt-6 flex gap-2">
        <button onClick={() => reset()} className="btn-primary px-6">
          Try again
        </button>
        <Link href="/" className="btn-ghost px-6">
          Go home
        </Link>
      </div>
      {error?.digest && (
        <p className="mt-6 text-xs text-muted/60">Reference: {error.digest}</p>
      )}
    </div>
  );
}
