import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { captureException } from "@/lib/observability/sentry";
import { sendSystemAlert } from "@/lib/observability/alerts";
import { rateLimit, readLimitedText } from "@/lib/server/rateLimit";
import { upsertDiditWebhookEvent, verifyDiditWebhook } from "@/lib/server/didit";
import { logWebhookEvent } from "@/lib/server/webhookEvents";

export async function POST(request: Request) {
  const limited = rateLimit(request, "compliance:webhook:didit", 120, 60_000);
  if (!limited.allowed) return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });

  const rawBody = await readLimitedText(request, 128 * 1024).catch(() => "");
  if (!rawBody) return NextResponse.json({ error: "Invalid webhook" }, { status: 400 });
  const headerBag = await headers();
  const signature =
    headerBag.get("x-signature-v2") ||
    headerBag.get("x-signature") ||
    headerBag.get("x-didit-signature");

  try {
    const payload = JSON.parse(rawBody);
    if (!verifyDiditWebhook(rawBody, signature, payload)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }
    await logWebhookEvent({
      provider: "didit",
      eventType: payload.webhook_type ?? payload.status ?? "unknown",
      providerEventId: payload.id ?? payload.session_id ?? payload.verification_id ?? null,
      status: "validated",
      relatedWalletAddress: payload.vendor_data ?? payload.wallet_address ?? null,
      payload: { webhook_type: payload.webhook_type, status: payload.status },
    });
    if (payload.webhook_type === "status.updated" || payload.status) {
      await upsertDiditWebhookEvent(payload);
      await logWebhookEvent({
        provider: "didit",
        eventType: payload.webhook_type ?? payload.status ?? "unknown",
        providerEventId: payload.id ?? payload.session_id ?? payload.verification_id ?? null,
        status: "processed",
        relatedWalletAddress: payload.vendor_data ?? payload.wallet_address ?? null,
      });
    }
    return NextResponse.json({ received: true });
  } catch (error) {
    await logWebhookEvent({ provider: "didit", eventType: "unknown", status: "failed", errorMessage: error instanceof Error ? error.message : String(error) });
    captureException(error, { context: "didit_webhook_handler" });
    sendSystemAlert({
      title: "Invalid Didit Webhook Request",
      severity: "warning",
      source: "api/compliance/verification/webhooks/didit",
      details: { error: error instanceof Error ? error.message : String(error) },
    });
    return NextResponse.json({ error: "Invalid webhook" }, { status: 400 });
  }
}
