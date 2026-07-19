/**
 * Minimal structured logger. Emits single-line JSON so logs are machine
 * parseable by any aggregator (Datadog, Loki, CloudWatch, …). Errors are also
 * forwarded to Sentry when SENTRY_DSN is configured.
 */
type Level = "debug" | "info" | "warn" | "error";
type Context = Record<string, unknown>;

const LEVELS: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };
const MIN = LEVELS[(process.env.LOG_LEVEL as Level) || "info"] ?? LEVELS.info;

const hasSentry = Boolean(process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN);

function emit(level: Level, event: string, context: Context = {}) {
  if (LEVELS[level] < MIN) return;
  const line = JSON.stringify({
    level,
    event,
    time: new Date().toISOString(),
    ...context,
  });
  // eslint-disable-next-line no-console
  (level === "error" ? console.error : level === "warn" ? console.warn : console.log)(
    line
  );
}

export const logger = {
  debug: (event: string, context?: Context) => emit("debug", event, context),
  info: (event: string, context?: Context) => emit("info", event, context),
  warn: (event: string, context?: Context) => emit("warn", event, context),
  error: (event: string, context?: Context) => emit("error", event, context),
};

/**
 * Report an unexpected exception: logs it structurally and, when Sentry is
 * configured, captures it there too. Never throws.
 */
export async function captureError(
  err: unknown,
  context: Context = {}
): Promise<void> {
  const message = err instanceof Error ? err.message : String(err);
  logger.error("exception", { message, ...context });
  if (!hasSentry) return;
  try {
    const Sentry = await import("@sentry/nextjs");
    Sentry.captureException(err, { extra: context });
  } catch {
    /* Sentry not available — structural log above is the fallback. */
  }
}
