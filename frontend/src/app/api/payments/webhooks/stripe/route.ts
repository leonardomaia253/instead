import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { getStripe, markPaymentPaid, updatePaymentIntentById } from "@/lib/server/payments";
import { rateLimit } from "@/lib/server/rateLimit";

export async function POST(request: Request) {
  const limited = rateLimit(request, "payments:webhook:stripe", 120, 60_000);
  if (!limited.allowed) return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });

  const rawBody = await request.text();
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
        });
      }
    }

    if (event.type === "checkout.session.expired") {
      const session = event.data.object;
      const paymentIntentId = session.metadata?.payment_intent_id;
      if (paymentIntentId) {
        await updatePaymentIntentById(paymentIntentId, {
          status: "canceled",
          provider_reference: session.id,
        });
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Stripe webhook failed", error);
    return NextResponse.json({ error: "Invalid webhook" }, { status: 400 });
  }
}
