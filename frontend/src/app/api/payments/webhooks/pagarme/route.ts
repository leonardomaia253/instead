import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { markPaymentPaid, updateUnpaidPaymentIntentById, verifyPagarmeWebhook } from "@/lib/server/payments";
import { rateLimit, readLimitedText } from "@/lib/server/rateLimit";
import { captureException } from "@/lib/observability/sentry";
import { sendSystemAlert } from "@/lib/observability/alerts";

function getPaymentIntentId(payload: any) {
  return (
    payload?.data?.metadata?.payment_intent_id ||
    payload?.data?.order?.metadata?.payment_intent_id ||
    payload?.data?.checkout?.metadata?.payment_intent_id ||
    payload?.data?.charges?.[0]?.metadata?.payment_intent_id
  );
}

export async function POST(request: Request) {
  const limited = rateLimit(request, "payments:webhook:pagarme", 120, 60_000);
  if (!limited.allowed) return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });

  const rawBody = await readLimitedText(request, 64 * 1024).catch(() => "");
  if (!rawBody) return NextResponse.json({ error: "Invalid webhook" }, { status: 400 });
  const headerBag = await headers();
  const signature =
    headerBag.get("x-hub-signature-256") ||
    headerBag.get("x-pagarme-signature") ||
    headerBag.get("pagarme-signature");

  try {
    if (!verifyPagarmeWebhook(rawBody, signature)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const payload = JSON.parse(rawBody);
    const eventType = payload?.type || payload?.event;
    const paymentIntentId = getPaymentIntentId(payload);
    if (!paymentIntentId) return NextResponse.json({ received: true, ignored: true });

    if (eventType === "order.paid" || eventType === "charge.paid") {
      const providerReference = payload?.data?.id || payload?.data?.order?.id || payload?.data?.charge?.id;
      const amountCents = payload?.data?.amount || payload?.data?.order?.amount || payload?.data?.charge?.amount;
      await markPaymentPaid({
        id: paymentIntentId,
        provider: "pagarme",
        providerReference,
        amountCents: Number(amountCents),
        currency: "brl",
      }).catch((err) => {
        captureException(err, { context: "markPaymentPaid", provider: "pagarme", paymentIntentId });
        sendSystemAlert({
          title: "Pagar.me Webhook Payment Processing Failed",
          severity: "warning",
          source: "api/payments/webhooks/pagarme",
          details: { paymentIntentId, error: String(err) },
        });
      });
    }

    if (
      eventType === "order.payment_failed" ||
      eventType === "charge.payment_failed" ||
      eventType === "order.canceled" ||
      eventType === "checkout.canceled"
    ) {
      await updateUnpaidPaymentIntentById(paymentIntentId, {
        status: eventType.includes("canceled") ? "canceled" : "failed",
        provider_reference: payload?.data?.id || payload?.data?.order?.id || payload?.data?.charge?.id,
      });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    captureException(error, { context: "pagarme_webhook_handler" });
    sendSystemAlert({
      title: "Invalid Pagar.me Webhook Request",
      severity: "warning",
      source: "api/payments/webhooks/pagarme",
      details: { error: error instanceof Error ? error.message : String(error) },
    });
    return NextResponse.json({ error: "Invalid webhook" }, { status: 400 });
  }
}
