import Link from "next/link";
import TopBar from "@/components/TopBar";
import Discovery from "@/components/Discovery";
import { listCharacters } from "@/lib/db";
import { ensureSeeded } from "@/lib/seed";
import { hasApiKey } from "@/lib/anthropic";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  await ensureSeeded();
  const characters = await listCharacters();
  const demoMode = !hasApiKey();

  return (
    <div className="min-h-screen">
      <TopBar />

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {/* Hero */}
        <section className="mb-10 overflow-hidden rounded-3xl border border-line bg-gradient-to-br from-bg-card to-bg-soft p-8 sm:p-12">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-brand/40 bg-brand/10 px-3 py-1 text-xs font-semibold text-brand-soft">
              ✦ Powered by Claude
            </span>
            <h1 className="mt-4 text-3xl font-bold leading-tight tracking-tight sm:text-5xl">
              Chat with AI characters,
              <br />
              <span className="bg-gradient-to-r from-brand-soft to-accent bg-clip-text text-transparent">
                or create your own.
              </span>
            </h1>
            <p className="mt-4 text-base text-muted sm:text-lg">
              Meet lifelike AI companions, mentors, heroes and helpers — each with
              their own personality. Or design a character in seconds and bring it
              to life.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/create" className="btn-primary">
                ＋ Create a character
              </Link>
              <a href="#explore" className="btn-ghost">
                Explore
              </a>
            </div>
          </div>
        </section>

        {demoMode && (
          <div className="mb-8 flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
            <span className="text-lg leading-none">⚡</span>
            <p>
              <strong>Demo mode.</strong> No <code>ANTHROPIC_API_KEY</code> is set,
              so characters reply with placeholder text. Add a key to your
              environment to enable full, in-character AI conversations.
            </p>
          </div>
        )}

        <div id="explore">
          <Discovery characters={characters} />
        </div>

        <footer className="mt-16 border-t border-line/60 pt-6 text-center text-xs text-muted">
          Character AI — an open-source Character.AI-style platform · Built with
          Next.js & Claude
        </footer>
      </main>
    </div>
  );
}
