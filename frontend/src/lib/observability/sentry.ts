/**
 * Sentry & Observability Error Logger Module
 * Safe error handling and capture for client/server side Next.js execution.
 */
import * as Sentry from "@sentry/nextjs";

export interface ExtraContext {
  [key: string]: unknown;
}

let sentryInitialized = false;

function ensureSentryInitialized() {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN;
  if (!dsn) return false;
  if (sentryInitialized) return true;

  Sentry.init({
    dsn,
    environment: process.env.NEXT_PUBLIC_APP_ENV || process.env.NODE_ENV || "development",
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  });
  sentryInitialized = true;
  return true;
}

export function captureException(error: unknown, context?: ExtraContext) {
  const isProduction = process.env.NODE_ENV === "production";

  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;

  const payload = {
    timestamp: new Date().toISOString(),
    message: errorMessage,
    stack: errorStack,
    context: context || {},
    environment: process.env.NEXT_PUBLIC_APP_ENV || process.env.NODE_ENV || "development",
  };

  if (ensureSentryInitialized()) {
    Sentry.withScope((scope) => {
      for (const [key, value] of Object.entries(context || {})) {
        scope.setExtra(key, value);
      }
      Sentry.captureException(error);
    });
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
  if (ensureSentryInitialized()) {
    Sentry.withScope((scope) => {
      for (const [key, value] of Object.entries(context || {})) {
        scope.setExtra(key, value);
      }
      Sentry.captureMessage(message, level === "warn" ? "warning" : level);
    });
    return;
  }

  console.log(`[OBSERVABILITY_${level.toUpperCase()}] ${message}`, JSON.stringify(context || {}));
}
