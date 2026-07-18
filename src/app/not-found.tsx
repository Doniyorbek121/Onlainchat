import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <span className="text-5xl">🫥</span>
      <h1 className="text-2xl font-bold">Character not found</h1>
      <p className="text-muted">
        This character may have been removed or never existed.
      </p>
      <Link href="/" className="btn-primary mt-2">
        Back to discover
      </Link>
    </div>
  );
}
