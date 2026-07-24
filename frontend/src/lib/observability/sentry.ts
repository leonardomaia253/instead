/**
 * Sentry & Observability Error Logger Module
 * Safe error handling and capture for client/server side Next.js execution.
 */

export interface ExtraContext {
  [key: string]: unknown;
}

export function captureException(error: unknown, context?: ExtraContext) {
  const isProduction = process.env.NODE_ENV === "production";
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN;

  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;

  const payload = {
    timestamp: new Date().toISOString(),
    message: errorMessage,
    stack: errorStack,
    context: context || {},
    environment: process.env.NEXT_PUBLIC_APP_ENV || process.env.NODE_ENV || "development",
  };

  if (dsn) {
    // If Sentry DSN is configured, log structure ready for Sentry SDK
    console.error("[SENTRY_CAPTURER]", JSON.stringify(payload));
  } else {
    // Fallback structured logging for observability
    if (isProduction) {
      console.error(`[OBSERVABILITY_ERROR] ${errorMessage}`, JSON.stringify(context || {}));
    } else {
      console.error("[DEV_ERROR]", error, context);
    }
  }
}

export function captureMessage(message: string, level: "info" | "warn" | "error" = "info", context?: ExtraContext) {
  console.log(`[OBSERVABILITY_${level.toUpperCase()}] ${message}`, JSON.stringify(context || {}));
}
