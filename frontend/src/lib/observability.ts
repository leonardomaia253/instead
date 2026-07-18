import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type ObservabilitySeverity = "debug" | "info" | "warn" | "error" | "fatal";

type ObservabilityEvent = {
  event_type: "web_vital" | "client_error" | "app_event";
  severity?: ObservabilitySeverity;
  route?: string;
  metadata?: Record<string, unknown>;
};

const MAX_METADATA_CHARS = 4000;

function sanitizeMetadata(metadata: Record<string, unknown> = {}) {
  const serialized = JSON.stringify(metadata);
  if (serialized.length <= MAX_METADATA_CHARS) return metadata;
  return {
    truncated: true,
    preview: serialized.slice(0, MAX_METADATA_CHARS),
  };
}

export async function trackEvent(event: ObservabilityEvent) {
  if (!isSupabaseConfigured) return;

  try {
    await supabase.from("observability_events").insert({
      event_type: event.event_type,
      severity: event.severity ?? "info",
      route: event.route,
      metadata: sanitizeMetadata(event.metadata),
    });
  } catch {
    // Observability must never break the product experience.
  }
}

export function trackClientError(error: unknown, route?: string) {
  const normalized = error instanceof Error
    ? { name: error.name, message: error.message, stack: error.stack?.slice(0, 1600) }
    : { message: String(error) };

  void trackEvent({
    event_type: "client_error",
    severity: "error",
    route,
    metadata: normalized,
  });
}
