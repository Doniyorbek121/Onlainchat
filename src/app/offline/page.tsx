import type { Metadata } from "next";

export const metadata: Metadata = { title: "Offline — Character AI" };

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/15 text-3xl">
        📡
      </div>
      <h1 className="text-xl font-bold text-white">You&apos;re offline</h1>
      <p className="mt-2 max-w-sm text-sm text-muted">
        Character AI needs a connection to chat. Please reconnect and try again.
      </p>
    </div>
  );
}
