import Link from "next/link";
import { getServerI18n } from "@/lib/i18n/server";

export default async function Footer() {
  const { t } = await getServerI18n();
  const year = new Date().getFullYear();
  return (
    <footer className="mt-16 border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-6 text-sm text-muted sm:flex-row">
        <p>© {year} Character AI. {t("footer.rights")}</p>
        <nav aria-label="Legal" className="flex items-center gap-5">
          <Link href="/terms" className="hover:text-white">
            {t("footer.terms")}
          </Link>
          <Link href="/privacy" className="hover:text-white">
            {t("footer.privacy")}
          </Link>
          <Link href="/settings" className="hover:text-white">
            {t("settings.title")}
          </Link>
        </nav>
      </div>
    </footer>
  );
}
