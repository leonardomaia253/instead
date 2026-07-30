import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { getStripe, markPaymentPaid, updateUnpaidPaymentIntentById } from "@/lib/server/payments";
import { rateLimit, readLimitedText } from "@/lib/server/rateLimit";
import { captureException } from "@/lib/observability/sentry";
import { sendSystemAlert } from "@/lib/observability/alerts";

export async function POST(request: Request) {
  const limited = rateLimit(request, "payments:webhook:stripe", 120, 60_000);
  if (!limited.allowed) return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });

  const rawBody = await readLimitedText(request, 64 * 1024).catch(() => "");
  if (!rawBody) return NextResponse.json({ error: "Invalid webhook" }, { status: 400 });
  const signature = (await headers()).get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 400 });
  }

  try {
    const stripe = getStripe();
    const event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const paymentIntentId = session.metadata?.payment_intent_id;
      if (paymentIntentId) {
        await markPaymentPaid({
          id: paymentIntentId,
          provider: "stripe",
          providerReference: session.id,
          amountCents: session.amount_total ?? 0,
          currency: session.currency ?? "",
        }).catch((err) => {
          captureException(err, { context: "markPaymentPaid", provider: "stripe", paymentIntentId });
          sendSystemAlert({
            title: "Stripe Webhook Payment Processing Failed",
            severity: "warning",
            source: "api/payments/webhooks/stripe",
            details: { paymentIntentId, error: String(err) },
          });
        });
      }
    }

    if (event.type === "checkout.session.expired") {
      const session = event.data.object;
      const paymentIntentId = session.metadata?.payment_intent_id;
      if (paymentIntentId) {
        await updateUnpaidPaymentIntentById(paymentIntentId, {
          status: "canceled",
          provider_reference: session.id,
        });
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    captureException(error, { context: "stripe_webhook_handler" });
    sendSystemAlert({
      title: "Invalid Stripe Webhook Request",
      severity: "warning",
      source: "api/payments/webhooks/stripe",
      details: { error: error instanceof Error ? error.message : String(error) },
    });
    return NextResponse.json({ error: "Invalid webhook" }, { status: 400 });
  }
}
