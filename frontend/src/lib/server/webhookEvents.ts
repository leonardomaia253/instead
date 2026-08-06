import { createSupabaseAdminClient } from "@/lib/server/supabaseAdmin";

type WebhookLogInput = {
  provider: "stripe" | "pagarme" | "didit" | "telegram" | "internal";
  eventType: string;
  providerEventId?: string | null;
  status: "received" | "validated" | "processed" | "failed" | "ignored" | "reprocess_requested";
  relatedPaymentIntentId?: string | null;
  relatedWalletAddress?: string | null;
  errorMessage?: string | null;
  payload?: Record<string, unknown>;
};

function compactPayload(payload?: Record<string, unknown>) {
  if (!payload) return {};
  return JSON.parse(JSON.stringify(payload, (_key, value) => {
    if (typeof value === "string" && value.length > 500) return `${value.slice(0, 500)}...`;
    return value;
  }));
}

export async function logWebhookEvent(input: WebhookLogInput) {
  const supabase = createSupabaseAdminClient();
  const row = {
    provider: input.provider,
    event_type: input.eventType,
    provider_event_id: input.providerEventId ?? null,
    status: input.status,
    related_payment_intent_id: input.relatedPaymentIntentId ?? null,
    related_wallet_address: input.relatedWalletAddress?.toLowerCase() ?? null,
    error_message: input.errorMessage ?? null,
    payload: compactPayload(input.payload),
    processed_at: ["processed", "failed", "ignored"].includes(input.status) ? new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
  };
  const query = supabase.from("webhook_event_logs");
  const { error } = input.providerEventId
    ? await query.upsert(row, { onConflict: "provider,provider_event_id" })
    : await query.insert(row);
  if (error) console.error("Webhook event log failed", error);
}
