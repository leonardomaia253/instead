import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { captureException } from "@/lib/observability/sentry";
import { sendSystemAlert } from "@/lib/observability/alerts";
import { rateLimit, readLimitedText } from "@/lib/server/rateLimit";
import { upsertDiditWebhookEvent, verifyDiditWebhook } from "@/lib/server/didit";

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
    if (payload.webhook_type === "status.updated" || payload.status) {
      await upsertDiditWebhookEvent(payload);
    }
    return NextResponse.json({ received: true });
  } catch (error) {
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
