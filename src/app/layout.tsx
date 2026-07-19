import type { Metadata, Viewport } from "next";
import "./globals.css";
import { getServerI18n } from "@/lib/i18n/server";
import { I18nProvider } from "@/components/I18nProvider";

export const metadata: Metadata = {
  title: "Character AI — Chat with AI characters",
  description:
    "Create and chat with lifelike AI characters. A professional open-source Character.AI-style platform powered by Claude.",
};

export const viewport: Viewport = {
  themeColor: "#0e0e11",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { locale, dir, dict } = await getServerI18n();

  return (
    <html lang={locale} dir={dir}>
      <body className="font-sans antialiased">
        <I18nProvider dict={dict} locale={locale}>
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
