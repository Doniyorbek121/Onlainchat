import Link from "next/link";
import { notFound } from "next/navigation";
import TopBar from "@/components/TopBar";
import CharacterCard from "@/components/CharacterCard";
import { getCurrentUser } from "@/lib/auth";
import {
  getUserByUsername,
  listCharacters,
  listFavoriteCharacters,
} from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const profile = await getUserByUsername(username);
  if (!profile) notFound();

  const viewer = await getCurrentUser();
  const isSelf = viewer?.id === profile.id;

  const created = await listCharacters({ creatorId: profile.id });
  // Others only see public characters; the owner sees all of theirs.
  const visibleCreated = isSelf
    ? created
    : created.filter((c) => c.visibility === "public");

  const favorites = isSelf ? await listFavoriteCharacters(profile.id) : [];
  const totalChats = created.reduce((sum, c) => sum + c.interactions, 0);
  const initial = (profile.displayName || profile.username)
    .charAt(0)
    .toUpperCase();
  const joined = new Date(profile.createdAt).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
  });

  return (
    <div className="min-h-screen">
      <TopBar />
      <main id="main" className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {/* Profile header */}
        <div className="card flex flex-col items-center gap-3 p-8 text-center">
          <span className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-brand to-accent text-3xl font-bold text-white shadow-lg shadow-brand/30">
            {initial}
          </span>
          <div>
            <h1 className="text-2xl font-bold">
              {profile.displayName || profile.username}
            </h1>
            <p className="text-sm text-muted">@{profile.username}</p>
          </div>
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-muted">
            <span>{visibleCreated.length} characters</span>
            <span>·</span>
            <span>{totalChats.toLocaleString()} chats</span>
            <span>·</span>
            <span>Joined {joined}</span>
          </div>
        </div>

        {/* Created characters */}
        <section className="mt-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
            {isSelf ? "Your characters" : "Characters"}
            <span className="ml-2 text-muted/60">{visibleCreated.length}</span>
          </h2>
          {visibleCreated.length === 0 ? (
            <div className="card p-10 text-center text-muted">
              No public characters yet.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {visibleCreated.map((c) => (
                <CharacterCard key={c.id} character={c} />
              ))}
            </div>
          )}
        </section>

        {/* Favorites (own profile only) */}
        {isSelf && (
          <section className="mt-10">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
              Saved characters
              <span className="ml-2 text-muted/60">{favorites.length}</span>
            </h2>
            {favorites.length === 0 ? (
              <div className="card p-10 text-center text-muted">
                You haven&apos;t saved any characters yet. Tap{" "}
                <span className="text-pink-300">♥ Save</span> on a character to
                keep it here.
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {favorites.map((c) => (
                  <CharacterCard key={`fav-${c.id}`} character={c} />
                ))}
              </div>
            )}
          </section>
        )}

        <div className="mt-10 text-center">
          <Link href="/" className="text-sm text-muted hover:text-white">
            ← Back to discover
          </Link>
        </div>
      </main>
    </div>
  );
}
