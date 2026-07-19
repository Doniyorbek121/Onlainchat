/** @type {import('next').NextConfig} */
const nextConfig = {
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
};

module.exports = nextConfig;
