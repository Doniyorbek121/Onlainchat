import Script from "next/script";

/**
 * Privacy-friendly, cookieless analytics via Plausible. Renders nothing unless
 * NEXT_PUBLIC_PLAUSIBLE_DOMAIN is configured, so there is no third-party script
 * (and no tracking) by default. Self-hosters can point NEXT_PUBLIC_PLAUSIBLE_SRC
 * at their own instance.
 */
export default function Analytics() {
  const domain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;
  if (!domain) return null;
  const src =
    process.env.NEXT_PUBLIC_PLAUSIBLE_SRC ||
    "https://plausible.io/js/script.js";
  return (
    <Script
      defer
      data-domain={domain}
      src={src}
      strategy="afterInteractive"
    />
  );
}
