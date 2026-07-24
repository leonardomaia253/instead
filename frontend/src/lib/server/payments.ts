import crypto from "node:crypto";
import Stripe from "stripe";
import { createSupabaseAdminClient } from "./supabaseAdmin";

export type PaymentProvider = "stripe" | "pagarme";
export type PaymentVertical = "token_factory" | "lending" | "staking" | "services";

export type CheckoutRequest = {
  provider: PaymentProvider;
  vertical: PaymentVertical;
  productCode: string;
  walletAddress?: string;
  email?: string;
  metadata?: Record<string, unknown>;
};

const EVM_ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const TOKEN_FACTORY_PRODUCTS: Record<string, { label: string; amountUsd: number; amountBrl: number }> = {
  token_deploy_basic: { label: "Instead Token Deploy Basic", amountUsd: 9900, amountBrl: 49900 },
  token_deploy_premium: { label: "Instead Token Deploy Premium", amountUsd: 29900, amountBrl: 149900 },
  token_fair_launch_assisted: { label: "Instead Fair Launch Assistido", amountUsd: 49900, amountBrl: 249900 },
};

function appOrigin() {
  return process.env.APP_ORIGIN || process.env.NEXT_PUBLIC_APP_ORIGIN || "http://localhost:3000";
}

export function validateCheckoutRequest(input: CheckoutRequest) {
  if (!input.walletAddress || !EVM_ADDRESS_RE.test(input.walletAddress)) throw new Error("Invalid wallet address");
  if (input.email && !EMAIL_RE.test(input.email)) throw new Error("Invalid email");
  if (JSON.stringify(input.metadata ?? {}).length > 2_000) throw new Error("Metadata is too large");
  getPaymentProduct(input.vertical, input.productCode, input.provider);
}

export function getPaymentProduct(vertical: PaymentVertical, productCode: string, provider: PaymentProvider) {
  if (vertical !== "token_factory") throw new Error("Unsupported payment vertical");
  const product = TOKEN_FACTORY_PRODUCTS[productCode];
  if (!product) throw new Error("Unsupported token factory product");
  return {
    label: product.label,
    amountCents: provider === "pagarme" ? product.amountBrl : product.amountUsd,
    currency: provider === "pagarme" ? "brl" : "usd",
  };
}

export async function createPaymentIntentRecord(input: {
  provider: PaymentProvider;
  vertical: PaymentVertical;
  productCode: string;
  walletAddress?: string;
  email?: string;
  amountCents: number;
  currency: string;
  metadata: Record<string, unknown>;
}) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("payment_intents")
    .insert({
      provider: input.provider,
      vertical: input.vertical,
      product_code: input.productCode,
      wallet_address: input.walletAddress?.toLowerCase() ?? null,
      email: input.email ?? null,
      amount_cents: input.amountCents,
      currency: input.currency,
      status: "created",
      metadata: input.metadata,
    })
    .select()
    .single();

  if (error) throw error;
  return data as { id: string };
}

export async function updatePaymentIntentById(id: string, patch: Record<string, unknown>) {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("payment_intents").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) throw error;
}

export async function getPaymentIntentById(id: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("payment_intents")
    .select("id,provider,provider_reference,amount_cents,currency,status,wallet_address")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data as {
    id: string;
    provider: PaymentProvider;
    provider_reference: string | null;
    amount_cents: number;
    currency: string;
    status: string;
    wallet_address: string | null;
  };
}

export async function markPaymentPaid(input: {
  id: string;
  provider: PaymentProvider;
  providerReference: string;
  amountCents: number;
  currency: string;
}) {
  if (!input.providerReference) throw new Error("Payment provider reference is required");
  if (!Number.isFinite(input.amountCents) || input.amountCents <= 0) throw new Error("Payment amount is invalid");
  if (!input.currency) throw new Error("Payment currency is required");
  const payment = await getPaymentIntentById(input.id);
  if (payment.provider !== input.provider) throw new Error("Payment provider mismatch");
  if (payment.amount_cents !== input.amountCents) throw new Error("Payment amount mismatch");
  if (payment.currency.toLowerCase() !== input.currency.toLowerCase()) throw new Error("Payment currency mismatch");
  await updatePaymentIntentById(input.id, {
    status: "paid",
    provider_reference: input.providerReference,
    paid_at: new Date().toISOString(),
  });
}

export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not configured");
  return new Stripe(key);
}

export async function createStripeCheckout(input: CheckoutRequest) {
  const product = getPaymentProduct(input.vertical, input.productCode, "stripe");
  const payment = await createPaymentIntentRecord({
    provider: "stripe",
    vertical: input.vertical,
    productCode: input.productCode,
    walletAddress: input.walletAddress,
    email: input.email,
    amountCents: product.amountCents,
    currency: product.currency,
    metadata: input.metadata ?? {},
  });

  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: input.email || undefined,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: product.currency,
          unit_amount: product.amountCents,
          product_data: { name: product.label },
        },
      },
    ],
    success_url: `${appOrigin()}/factory?payment=success&payment_id=${payment.id}`,
    cancel_url: `${appOrigin()}/factory?payment=cancel&payment_id=${payment.id}`,
    metadata: {
      payment_intent_id: payment.id,
      vertical: input.vertical,
      product_code: input.productCode,
      wallet_address: input.walletAddress?.toLowerCase() ?? "",
    },
  });

  await updatePaymentIntentById(payment.id, {
    provider_reference: session.id,
    provider_checkout_url: session.url,
    status: "pending",
  });

  if (!session.url) throw new Error("Stripe did not return a checkout URL");
  return { url: session.url, paymentIntentId: payment.id };
}

function pagarmeAuthHeader() {
  const apiKey = process.env.PAGARME_SECRET_KEY;
  if (!apiKey) throw new Error("PAGARME_SECRET_KEY is not configured");
  return `Basic ${Buffer.from(`${apiKey}:`).toString("base64")}`;
}

export async function createPagarmeCheckout(input: CheckoutRequest) {
  const product = getPaymentProduct(input.vertical, input.productCode, "pagarme");
  const payment = await createPaymentIntentRecord({
    provider: "pagarme",
    vertical: input.vertical,
    productCode: input.productCode,
    walletAddress: input.walletAddress,
    email: input.email,
    amountCents: product.amountCents,
    currency: product.currency,
    metadata: input.metadata ?? {},
  });

  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString();
  const response = await fetch("https://api.pagar.me/core/v5/paymentlinks", {
    method: "POST",
    headers: {
      Authorization: pagarmeAuthHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      type: "order",
      name: product.label,
      expires_at: expiresAt,
      metadata: {
        payment_intent_id: payment.id,
        vertical: input.vertical,
        product_code: input.productCode,
        wallet_address: input.walletAddress?.toLowerCase() ?? "",
      },
      payment_settings: {
        accepted_payment_methods: ["credit_card", "pix"],
        credit_card_settings: { operation_type: "auth_and_capture" },
        pix_settings: { expires_in: 86400 },
      },
      cart_settings: {
        items: [
          {
            name: product.label,
            amount: product.amountCents,
            default_quantity: 1,
          },
        ],
      },
    }),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.message || "Pagar.me checkout creation failed");

  const checkoutUrl = body.url || body.checkout_url || body.payment_url;
  if (!checkoutUrl) throw new Error("Pagar.me did not return a checkout URL");

  await updatePaymentIntentById(payment.id, {
    provider_reference: body.id,
    provider_checkout_url: checkoutUrl,
    status: "pending",
  });

  return { url: checkoutUrl as string, paymentIntentId: payment.id };
}

export function verifyPagarmeWebhook(rawBody: string, signature: string | null) {
  const secret = process.env.PAGARME_WEBHOOK_SECRET;
  if (!secret) throw new Error("PAGARME_WEBHOOK_SECRET is not configured");
  if (!signature) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const received = signature.replace(/^sha256=/, "");
  if (expected.length !== received.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(received));
}
