import type { Metadata, Viewport } from "next";
import "./globals.css";
import { getServerI18n } from "@/lib/i18n/server";
import { I18nProvider } from "@/components/I18nProvider";
import ConsentGate from "@/components/ConsentGate";
import Analytics from "@/components/Analytics";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL || "http://localhost:3000"),
  applicationName: "Character AI",
  title: {
    default: "Character AI — Chat with AI characters",
    template: "%s",
  },
  description:
    "Create and chat with lifelike AI characters. A professional open-source Character.AI-style platform powered by Claude.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Character AI",
  },
  icons: {
    icon: "/icon.svg",
    apple: "/icons/apple-touch-icon.png",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#0e0e11",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
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
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <I18nProvider dict={dict} locale={locale}>
          {children}
          <ConsentGate />
        </I18nProvider>
        <Analytics />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
