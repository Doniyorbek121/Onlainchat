import Link from "next/link";
import { redirect } from "next/navigation";
import TopBar from "@/components/TopBar";
import Avatar from "@/components/Avatar";
import AdminDeleteButton from "@/components/AdminDeleteButton";
import AdminReportActions from "@/components/AdminReportActions";
import { getAdminUser } from "@/lib/auth";
import {
  countUsers,
  countCharacters,
  countConversations,
  countMessages,
  countOpenReports,
  countUsersSince,
  countCharactersSince,
  countMessagesSince,
  listRecentUsers,
  listRecentCharacters,
  listReports,
  listAuditLog,
} from "@/lib/db";

export const dynamic = "force-dynamic";

function fmt(n: number) {
  return n.toLocaleString();
}

export default async function AdminPage() {
  const admin = await getAdminUser();
  if (!admin) redirect("/");

  const now = Date.now();
  const DAY = 86_400_000;
  const [
    users,
    characters,
    conversations,
    messages,
    openReports,
    recentUsers,
    recentChars,
    reports,
    auditLog,
    users24h,
    users7d,
    chars24h,
    chars7d,
    msgs24h,
    msgs7d,
  ] = await Promise.all([
    countUsers(),
    countCharacters(),
    countConversations(),
    countMessages(),
    countOpenReports(),
    listRecentUsers(20),
    listRecentCharacters(20),
    listReports("open", 50),
    listAuditLog(20),
    countUsersSince(now - DAY),
    countUsersSince(now - 7 * DAY),
    countCharactersSince(now - DAY),
    countCharactersSince(now - 7 * DAY),
    countMessagesSince(now - DAY),
    countMessagesSince(now - 7 * DAY),
  ]);

  const stats = [
    { label: "Users", value: users },
    { label: "Characters", value: characters },
    { label: "Conversations", value: conversations },
    { label: "Messages", value: messages },
  ];

  const growth = [
    { label: "New users", d1: users24h, d7: users7d },
    { label: "New characters", d1: chars24h, d7: chars7d },
    { label: "Messages", d1: msgs24h, d7: msgs7d },
  ];

  return (
    <div className="min-h-screen">
      <TopBar />
      <main id="main" className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
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

        {/* Growth */}
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
            Growth
          </h2>
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs text-muted">
                  <th className="p-3 font-medium">Metric</th>
                  <th className="p-3 text-right font-medium">Last 24h</th>
                  <th className="p-3 text-right font-medium">Last 7d</th>
                </tr>
              </thead>
              <tbody>
                {growth.map((g) => (
                  <tr key={g.label} className="border-b border-line/50 last:border-0">
                    <td className="p-3 text-white">{g.label}</td>
                    <td className="p-3 text-right font-semibold text-white">
                      +{fmt(g.d1)}
                    </td>
                    <td className="p-3 text-right text-muted">+{fmt(g.d7)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Open reports */}
        <section className="mb-8">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted">
            Moderation queue
            <span
              className={`rounded-full px-2 py-0.5 text-xs ${
                openReports > 0
                  ? "bg-red-500/15 text-red-300"
                  : "bg-bg-hover text-muted"
              }`}
            >
              {fmt(openReports)} open
            </span>
          </h2>
          {reports.length === 0 ? (
            <div className="card p-6 text-center text-sm text-muted">
              Nothing to review. 🎉
            </div>
          ) : (
            <div className="card divide-y divide-line">
              {reports.map((r) => (
                <div key={r.id} className="flex items-start gap-3 p-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white">
                      <span className="rounded bg-bg-hover px-1.5 py-0.5 text-xs uppercase text-muted">
                        {r.targetType}
                      </span>{" "}
                      {r.targetType === "character" ? (
                        <Link
                          href={`/character/${r.targetId}`}
                          className="text-brand-soft hover:underline"
                        >
                          {r.targetId}
                        </Link>
                      ) : (
                        <span className="text-muted">{r.targetId}</span>
                      )}
                    </p>
                    <p className="mt-0.5 text-xs text-muted">
                      Reason: <span className="text-white/80">{r.reason}</span>
                      {r.details && ` · ${r.details}`}
                    </p>
                  </div>
                  <AdminReportActions
                    id={r.id}
                    targetType={r.targetType}
                    targetId={r.targetId}
                  />
                </div>
              ))}
            </div>
          )}
        </section>

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

        {/* Audit log */}
        <section className="mt-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
            Audit log
          </h2>
          {auditLog.length === 0 ? (
            <div className="card p-6 text-center text-sm text-muted">
              No admin actions yet.
            </div>
          ) : (
            <div className="card divide-y divide-line">
              {auditLog.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between gap-3 p-3 text-sm"
                >
                  <span className="font-mono text-xs text-white">
                    {a.action}
                    <span className="text-muted">
                      {" "}
                      · {a.targetType}:{a.targetId.slice(0, 16)}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs text-muted">
                    {new Date(a.createdAt).toISOString().replace("T", " ").slice(0, 16)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
