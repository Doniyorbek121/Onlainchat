/**
 * Next.js instrumentation hook. Initialises Sentry on the server and edge
 * runtimes, but only when SENTRY_DSN is configured — with no DSN this is a
 * complete no-op, so local/dev and self-hosted setups need zero Sentry config.
 */
export async function register() {
  if (!process.env.SENTRY_DSN) return;
  const Sentry = await import("@sentry/nextjs");
  const common = {
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || 0.1),
  };
  if (process.env.NEXT_RUNTIME === "nodejs") {
    Sentry.init(common);
  } else if (process.env.NEXT_RUNTIME === "edge") {
    Sentry.init(common);
  }
}

/**
 * Forwards uncaught errors from React Server Components / route handlers to
 * Sentry (no-op when Sentry isn't initialised).
 */
export async function onRequestError(
  ...args: Parameters<
    typeof import("@sentry/nextjs")["captureRequestError"]
  >
) {
  if (!process.env.SENTRY_DSN) return;
  const Sentry = await import("@sentry/nextjs");
  Sentry.captureRequestError(...args);
}
