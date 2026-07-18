import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import UserMenu from "./UserMenu";

export default async function TopBar() {
  const user = await getCurrentUser();

  return (
    <header className="sticky top-0 z-30 border-b border-line/70 bg-bg/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand to-accent text-lg shadow-lg shadow-brand/30">
            ✦
          </span>
          <span className="text-lg font-bold tracking-tight">
            Character<span className="text-brand-soft">AI</span>
          </span>
        </Link>

        <nav className="ml-auto flex items-center gap-2">
          <Link href="/" className="btn-ghost hidden sm:inline-flex">
            Discover
          </Link>

          {user ? (
            <>
              <Link href="/create" className="btn-primary">
                <span className="text-base leading-none">＋</span>
                <span className="hidden sm:inline">Create</span>
              </Link>
              <UserMenu user={user} />
            </>
          ) : (
            <>
              <Link href="/login" className="btn-ghost">
                Sign in
              </Link>
              <Link href="/register" className="btn-primary">
                Sign up
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
