/**
 * Client-side Sentry init. Runs in the browser before hydration. To avoid
 * shipping the Sentry SDK to every visitor when error tracking isn't in use,
 * the SDK is only imported when NEXT_PUBLIC_SENTRY_DSN is set at build time —
 * otherwise this file compiles to a no-op and adds nothing to the bundle.
 */
if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  import("@sentry/nextjs").then((Sentry) => {
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      environment: process.env.NODE_ENV,
      tracesSampleRate: Number(
        process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE || 0.1
      ),
      replaysSessionSampleRate: 0,
      replaysOnErrorSampleRate: 0,
    });
  });
}
