import { NextResponse } from "next/server";
import { requireSameOrigin } from "@/lib/server/csrf";
import { rateLimit, readLimitedJson } from "@/lib/server/rateLimit";
import { createSupabaseAdminClient } from "@/lib/server/supabaseAdmin";
import { getOrCreateAffiliateProfile } from "@/lib/server/affiliates";
import { verifyWalletSession } from "@/lib/server/walletAuth";

export async function POST(request: Request) {
  const csrfError = requireSameOrigin(request);
  if (csrfError) return csrfError;
  const limited = rateLimit(request, "affiliates:payouts", 5, 60_000);
  if (!limited.allowed) return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  const session = verifyWalletSession(request);
  if (!session?.wallet_address) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await readLimitedJson<{ currency?: "usd" | "brl" }>(request, 1024);
  const currency = body.currency === "brl" ? "brl" : "usd";
  const supabase = createSupabaseAdminClient();
  const profile = await getOrCreateAffiliateProfile({ walletAddress: session.wallet_address });
  const { data: commissions, error } = await supabase
    .from("affiliate_commissions")
    .select("id,amount_cents")
    .eq("affiliate_id", profile.id)
    .eq("currency", currency)
    .eq("status", "available");
  if (error) return NextResponse.json({ error: "Could not load commissions" }, { status: 500 });
  const amountCents = (commissions ?? []).reduce((sum, row) => sum + Number(row.amount_cents ?? 0), 0);
  if (amountCents <= 0) return NextResponse.json({ error: "No available balance" }, { status: 400 });
  const { data: payout, error: payoutError } = await supabase.from("affiliate_payout_requests").insert({
    affiliate_id: profile.id,
    amount_cents: amountCents,
    currency,
    payout_wallet: profile.payout_wallet,
    status: "requested",
  }).select().single();
  if (payoutError) return NextResponse.json({ error: "Could not request payout" }, { status: 500 });
  await supabase.from("affiliate_commissions").update({ status: "requested", payout_request_id: payout.id, updated_at: new Date().toISOString() }).in("id", (commissions ?? []).map((row) => row.id));
  return NextResponse.json({ payout });
}
