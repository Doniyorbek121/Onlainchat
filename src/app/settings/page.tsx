import { redirect } from "next/navigation";
import TopBar from "@/components/TopBar";
import Footer from "@/components/Footer";
import AccountActions from "@/components/AccountActions";
import { getCurrentUser } from "@/lib/auth";
import { getServerI18n } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ verified?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { t } = await getServerI18n();
  const { verified } = await searchParams;

  return (
    <div className="min-h-screen">
      <TopBar />
      <main id="main" className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="text-2xl font-bold text-white">{t("settings.title")}</h1>
        {verified === "1" && (
          <p className="mt-4 rounded-lg border border-accent/40 bg-accent/10 p-3 text-sm text-accent">
            {t("verify.success")}
          </p>
        )}
        {verified === "0" && (
          <p className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-400">
            {t("verify.failed")}
          </p>
        )}
        <div className="mt-4 card p-5">
          <dl className="grid grid-cols-[auto,1fr] gap-x-6 gap-y-2 text-sm">
            <dt className="text-muted">{t("auth.username")}</dt>
            <dd className="text-white">{user.username}</dd>
            <dt className="text-muted">{t("auth.email")}</dt>
            <dd className="text-white">
              {user.email}{" "}
              {user.emailVerified ? (
                <span className="text-accent">✓</span>
              ) : (
                <span className="text-muted">(unverified)</span>
              )}
            </dd>
            <dt className="text-muted">{t("auth.displayName")}</dt>
            <dd className="text-white">{user.displayName}</dd>
          </dl>
        </div>
        <AccountActions />
      </main>
      <Footer />
    </div>
  );
}
