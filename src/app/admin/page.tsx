import Link from "next/link";
import { redirect } from "next/navigation";
import TopBar from "@/components/TopBar";
import Avatar from "@/components/Avatar";
import AdminDeleteButton from "@/components/AdminDeleteButton";
import { getAdminUser } from "@/lib/auth";
import {
  countUsers,
  countCharacters,
  countConversations,
  countMessages,
  listRecentUsers,
  listRecentCharacters,
} from "@/lib/db";

export const dynamic = "force-dynamic";

function fmt(n: number) {
  return n.toLocaleString();
}

export default async function AdminPage() {
  const admin = await getAdminUser();
  if (!admin) redirect("/");

  const [users, characters, conversations, messages, recentUsers, recentChars] =
    await Promise.all([
      countUsers(),
      countCharacters(),
      countConversations(),
      countMessages(),
      listRecentUsers(20),
      listRecentCharacters(20),
    ]);

  const stats = [
    { label: "Users", value: users },
    { label: "Characters", value: characters },
    { label: "Conversations", value: conversations },
    { label: "Messages", value: messages },
  ];

  return (
    <div className="min-h-screen">
      <TopBar />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex items-center gap-2">
          <h1 className="text-2xl font-bold">Admin</h1>
          <span className="rounded-full bg-brand/15 px-2.5 py-0.5 text-xs font-semibold text-brand-soft">
            {admin.username}
          </span>
        </div>

        {/* Stats */}
        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="card p-5">
              <p className="text-2xl font-bold">{fmt(s.value)}</p>
              <p className="text-xs text-muted">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Recent users */}
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
            Recent users
          </h2>
          <div className="card divide-y divide-line">
            {recentUsers.map((u) => (
              <div key={u.id} className="flex items-center gap-3 p-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-brand to-accent text-sm font-bold text-white">
                  {(u.displayName || u.username).charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    <Link href={`/u/${u.username}`} className="hover:underline">
                      {u.displayName || u.username}
                    </Link>{" "}
                    {u.role === "admin" && (
                      <span className="text-xs text-brand-soft">· admin</span>
                    )}
                  </p>
                  <p className="truncate text-xs text-muted">
                    @{u.username} · {u.email}
                  </p>
                </div>
                <AdminDeleteButton
                  kind="users"
                  id={u.id}
                  label={u.username}
                />
              </div>
            ))}
          </div>
        </section>

        {/* Recent characters */}
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
            Recent characters
          </h2>
          <div className="card divide-y divide-line">
            {recentChars.map((c) => (
              <div key={c.id} className="flex items-center gap-3 p-3">
                <Avatar
                  emoji={c.avatarEmoji}
                  color={c.avatarColor}
                  imageUrl={c.avatarImage}
                  size={36}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    <Link
                      href={`/character/${c.id}`}
                      className="hover:underline"
                    >
                      {c.name}
                    </Link>{" "}
                    {c.visibility === "private" && (
                      <span className="text-xs text-muted">· 🔒</span>
                    )}
                  </p>
                  <p className="truncate text-xs text-muted">
                    by {c.creatorName} · {c.category} · ◆ {fmt(c.interactions)}
                  </p>
                </div>
                <AdminDeleteButton
                  kind="characters"
                  id={c.id}
                  label={c.name}
                />
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
