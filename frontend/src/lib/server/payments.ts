import crypto from "node:crypto";
import Stripe from "stripe";
import { FIAT_REVENUE_SOURCES } from "@/lib/revenueCatalog";
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

// ─── Fallback hardcoded (usado se Supabase inacessível) ─────────────────────
const FALLBACK_PRICES: Record<string, { label: string; amountUsd: number; amountBrl: number }> = {
  ...Object.fromEntries(
    FIAT_REVENUE_SOURCES.map((source) => [
      source.sourceCode,
      {
        label: `Instead ${source.label}`,
        amountUsd: source.amountUsdCents!,
        amountBrl: source.amountBrlCents!,
      },
    ]),
  ),
} as Record<string, { label: string; amountUsd: number; amountBrl: number }>;

// ─── Cache em memória com TTL 60s ────────────────────────────────────────────
type PriceRow = { label: string; amountUsd: number; amountBrl: number };
let _priceCache: Record<string, PriceRow> | null = null;
let _priceCacheAt = 0;
const PRICE_CACHE_TTL_MS = 60_000; // 60 segundos

export function invalidatePriceCache() {
  _priceCache = null;
  _priceCacheAt = 0;
}

async function getPricesFromDb(): Promise<Record<string, PriceRow>> {
  const now = Date.now();
  if (_priceCache && now - _priceCacheAt < PRICE_CACHE_TTL_MS) return _priceCache;

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("platform_prices")
      .select("product_code, label, amount_usd_cents, amount_brl_cents")
      .eq("is_active", true);

    if (error || !data?.length) throw new Error(error?.message ?? "No prices returned");

    const map: Record<string, PriceRow> = {};
    for (const row of data) {
      map[row.product_code] = {
        label:      row.label,
        amountUsd:  row.amount_usd_cents,
        amountBrl:  row.amount_brl_cents,
      };
    }
    _priceCache = map;
    _priceCacheAt = now;
    return map;
  } catch {
    // Fallback silencioso — não derruba o checkout se o DB falhar
    return FALLBACK_PRICES;
  }
}

function appOrigin() {
  const origin = process.env.APP_ORIGIN || process.env.NEXT_PUBLIC_APP_ORIGIN;
  if (origin) return origin.replace(/\/$/, "");
  if (process.env.NODE_ENV !== "production") return "http://localhost:3000";
  throw new Error("APP_ORIGIN is required for production checkout URLs");
}

function checkoutReturnPath(vertical: PaymentVertical) {
  if (vertical === "lending") return "/lending";
  if (vertical === "services") return "/dashboard";
  return "/factory";
}

export async function validateCheckoutRequest(input: CheckoutRequest) {
  if (!input.walletAddress || !EVM_ADDRESS_RE.test(input.walletAddress)) throw new Error("Invalid wallet address");
  if (input.email && !EMAIL_RE.test(input.email)) throw new Error("Invalid email");
  if (JSON.stringify(input.metadata ?? {}).length > 2_000) throw new Error("Metadata is too large");
  await getPaymentProduct(input.vertical, input.productCode, input.provider);
}

export async function getPaymentProduct(vertical: PaymentVertical, productCode: string, provider: PaymentProvider) {
  const prices = await getPricesFromDb();
  const product = prices[productCode] ?? FALLBACK_PRICES[productCode];
  const catalogItem = FIAT_REVENUE_SOURCES.find((source) => source.sourceCode === productCode);
  if (!product || !catalogItem || catalogItem.vertical !== vertical) throw new Error("Unsupported payment product");
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

export async function updateUnpaidPaymentIntentById(id: string, patch: Record<string, unknown>) {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("payment_intents")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id)
    .neq("status", "paid");
  if (error) throw error;
}

export async function getPaymentIntentById(id: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("payment_intents")
    .select("id,provider,provider_reference,amount_cents,currency,status,wallet_address,vertical,product_code")
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
    vertical: PaymentVertical;
    product_code: string;
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
  if (payment.status === "paid" && payment.provider_reference !== input.providerReference) {
    throw new Error("Payment is already paid with a different provider reference");
  }
  if (payment.amount_cents !== input.amountCents) throw new Error("Payment amount mismatch");
  if (payment.currency.toLowerCase() !== input.currency.toLowerCase()) throw new Error("Payment currency mismatch");
  if (payment.provider_reference && payment.provider_reference !== input.providerReference) {
    throw new Error("Payment provider reference mismatch");
  }
  if (payment.status !== "paid") {
    await updatePaymentIntentById(input.id, {
      status: "paid",
      provider_reference: input.providerReference,
      paid_at: new Date().toISOString(),
    });
  }

  const catalogItem = FIAT_REVENUE_SOURCES.find((source) => source.sourceCode === payment.product_code);
  if (catalogItem && payment.wallet_address) {
    const supabase = createSupabaseAdminClient();
    const expiresAt = catalogItem.billingInterval === "monthly"
      ? new Date(Date.now() + 1000 * 60 * 60 * 24 * 31).toISOString()
      : null;
    await supabase
      .from("user_revenue_entitlements")
      .upsert(
        {
          wallet_address: payment.wallet_address.toLowerCase(),
          source_code: payment.product_code,
          status: "active",
          starts_at: new Date().toISOString(),
          expires_at: expiresAt,
          payment_intent_id: payment.id,
          metadata: { provider: payment.provider, vertical: payment.vertical },
          updated_at: new Date().toISOString(),
        },
        { onConflict: "wallet_address,source_code" },
      );
  }
}

export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not configured");
  return new Stripe(key);
}

export async function createStripeCheckout(input: CheckoutRequest) {
  const product = await getPaymentProduct(input.vertical, input.productCode, "stripe");
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
    success_url: `${appOrigin()}${checkoutReturnPath(input.vertical)}?payment=success&payment_id=${payment.id}`,
    cancel_url: `${appOrigin()}${checkoutReturnPath(input.vertical)}?payment=cancel&payment_id=${payment.id}`,
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
  const product = await getPaymentProduct(input.vertical, input.productCode, "pagarme");
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
