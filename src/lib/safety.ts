import { logger } from "./logger";

/**
 * Escalation hook for suspected child-sexual-abuse/exploitation (CSAE) content.
 *
 * Operators in the US have a legal obligation (18 U.S.C. §2258A) to report
 * apparent CSAM to NCMEC. This function is the single integration point: it
 * always logs at error level, and — when CSAM_REPORT_WEBHOOK is configured —
 * POSTs a structured event to the operator's compliance endpoint, which can
 * forward to NCMEC's CyberTipline. It never throws and never blocks the caller
 * for long.
 */
export async function escalateCsae(ctx: {
  surface: string;
  userId: string;
  reason?: string;
}): Promise<void> {
  logger.error("safety.csae_detected", {
    surface: ctx.surface,
    userId: ctx.userId,
    reason: ctx.reason,
  });

  const url = process.env.CSAM_REPORT_WEBHOOK;
  if (!url) return;
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "csae_detected",
        surface: ctx.surface,
        userId: ctx.userId,
        reason: ctx.reason,
        at: new Date().toISOString(),
      }),
      // Don't let a slow endpoint hang the request path.
      signal: AbortSignal.timeout(3000),
    });
  } catch (err) {
    logger.error("safety.escalation_failed", {
      message: (err as Error)?.message,
    });
  }
}
