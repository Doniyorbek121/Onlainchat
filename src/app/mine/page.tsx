import Link from "next/link";
import { redirect } from "next/navigation";
import TopBar from "@/components/TopBar";
import Avatar from "@/components/Avatar";
import { getCurrentUser } from "@/lib/auth";
import { listCharacters } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function MyCharactersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/mine");

  const characters = listCharacters({ creatorId: user.id });

  return (
    <div className="min-h-screen">
      <TopBar />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">My characters</h1>
            <p className="text-sm text-muted">
              {characters.length} character{characters.length === 1 ? "" : "s"} you created
            </p>
          </div>
          <Link href="/create" className="btn-primary">
            ＋ New
          </Link>
        </div>

        {characters.length === 0 ? (
          <div className="card flex flex-col items-center gap-3 p-12 text-center">
            <span className="text-4xl">✨</span>
            <p className="text-muted">You haven&apos;t created any characters yet.</p>
            <Link href="/create" className="btn-primary mt-2">
              Create your first
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {characters.map((c) => (
              <div
                key={c.id}
                className="card flex flex-col gap-3 p-4 transition-colors hover:border-brand/40"
              >
                <div className="flex items-start gap-3">
                  <Avatar emoji={c.avatarEmoji} color={c.avatarColor} size={52} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate font-semibold">{c.name}</h3>
                      {c.visibility === "private" && (
                        <span className="rounded-full bg-bg-soft px-2 py-0.5 text-[10px] font-semibold text-muted">
                          🔒 Private
                        </span>
                      )}
                    </div>
                    <p className="truncate text-xs text-muted">
                      {c.category} · {c.interactions.toLocaleString()} chats
                    </p>
                  </div>
                </div>
                <p className="line-clamp-2 min-h-[2.5rem] text-sm text-muted">
                  {c.tagline || c.description || "No description yet."}
                </p>
                <div className="mt-auto grid grid-cols-3 gap-2 pt-1">
                  <Link href={`/chat/${c.id}`} className="btn-ghost !py-2 text-xs">
                    Chat
                  </Link>
                  <Link
                    href={`/character/${c.id}/edit`}
                    className="btn-ghost !py-2 text-xs"
                  >
                    Edit
                  </Link>
                  <Link
                    href={`/character/${c.id}`}
                    className="btn-ghost !py-2 text-xs"
                  >
                    View
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
