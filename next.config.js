/**
 * Build a Content-Security-Policy. Extra origins are added only when the
 * corresponding optional integration is configured, so the policy stays as
 * tight as possible for a given deployment.
 */
function buildCsp() {
  const plausible = process.env.NEXT_PUBLIC_PLAUSIBLE_SRC
    ? new URL(process.env.NEXT_PUBLIC_PLAUSIBLE_SRC).origin
    : process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN
    ? "https://plausible.io"
    : "";
  let sentry = "";
  try {
    if (process.env.NEXT_PUBLIC_SENTRY_DSN)
      sentry = new URL(process.env.NEXT_PUBLIC_SENTRY_DSN).origin;
  } catch {
    /* ignore malformed DSN */
  }

  // Next's dev server (HMR/React Refresh) needs 'unsafe-eval'; production doesn't.
  const devEval = process.env.NODE_ENV !== "production" ? "'unsafe-eval'" : "";
  const script = ["'self'", "'unsafe-inline'", devEval, plausible]
    .filter(Boolean)
    .join(" ");
  const connect = ["'self'", plausible, sentry].filter(Boolean).join(" ");

  return [
    "default-src 'self'",
    `script-src ${script}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    `connect-src ${connect}`,
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    "upgrade-insecure-requests",
  ].join("; ");
}

const securityHeaders = [
  { key: "Content-Security-Policy", value: buildCsp() },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Don't advertise the framework.
  poweredByHeader: false,
  // Heavy, Node-only packages that should be required at runtime rather than
  // bundled (keeps server/edge bundles small and silences the OTel
  // require-in-the-middle warning from Sentry's auto-instrumentation).
  serverExternalPackages: [
    "better-sqlite3",
    "@sentry/nextjs",
    "@aws-sdk/client-s3",
    "ioredis",
    "nodemailer",
  ],
  eslint: {
    ignoreDuringBuilds: true,
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

module.exports = nextConfig;
