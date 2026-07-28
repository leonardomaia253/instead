import { NextResponse } from "next/server";
import { createPagarmeCheckout, createStripeCheckout, validateCheckoutRequest, type CheckoutRequest, type PaymentProvider, type PaymentVertical } from "@/lib/server/payments";
import { rateLimit } from "@/lib/server/rateLimit";

function isProvider(value: unknown): value is PaymentProvider {
  return value === "stripe" || value === "pagarme";
}

function isVertical(value: unknown): value is PaymentVertical {
  return value === "token_factory" || value === "lending" || value === "services";
}

export async function POST(request: Request) {
  try {
    const limited = rateLimit(request, "payments:checkout", 10, 60_000);
    if (!limited.allowed) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429, headers: { "Retry-After": String(limited.retryAfterSeconds) } });
    }

    const body = (await request.json()) as CheckoutRequest;
    if (!isProvider(body.provider)) {
      return NextResponse.json({ error: "Unsupported payment provider" }, { status: 400 });
    }
    if (!isVertical(body.vertical)) {
      return NextResponse.json({ error: "Unsupported payment vertical" }, { status: 400 });
    }
    if (!body.productCode) {
      return NextResponse.json({ error: "productCode is required" }, { status: 400 });
    }
    await validateCheckoutRequest(body);

    const checkout = body.provider === "stripe" ? await createStripeCheckout(body) : await createPagarmeCheckout(body);
    return NextResponse.json(checkout);
  } catch (error) {
    console.error("Payment checkout failed", error);
    return NextResponse.json({ error: "Could not create checkout" }, { status: error instanceof Error && error.message.startsWith("Invalid") ? 400 : 500 });
  }
}
