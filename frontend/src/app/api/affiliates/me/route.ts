import { NextResponse } from "next/server";
import { requireSameOrigin } from "@/lib/server/csrf";
import { rateLimit, readLimitedJson } from "@/lib/server/rateLimit";
import { createSupabaseAdminClient } from "@/lib/server/supabaseAdmin";
import { getOrCreateAffiliateProfile } from "@/lib/server/affiliates";
import { verifyWalletSession } from "@/lib/server/walletAuth";

const EVM_ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

export async function GET(request: Request) {
  const limited = rateLimit(request, "affiliates:me", 60, 60_000);
  if (!limited.allowed) return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  const wallet = new URL(request.url).searchParams.get("wallet")?.toLowerCase() ?? "";
  if (!EVM_ADDRESS_RE.test(wallet)) return NextResponse.json({ error: "Invalid wallet" }, { status: 400 });
  const session = verifyWalletSession(request);
  if (!session?.wallet_address || session.wallet_address.toLowerCase() !== wallet) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createSupabaseAdminClient();
  const profile = await getOrCreateAffiliateProfile({ walletAddress: wallet });
  const [conversions, commissions, payouts, clicks] = await Promise.all([
    supabase.from("affiliate_conversions").select("*").eq("affiliate_id", profile.id).order("created_at", { ascending: false }).limit(50),
    supabase.from("affiliate_commissions").select("*").eq("affiliate_id", profile.id).order("created_at", { ascending: false }).limit(100),
    supabase.from("affiliate_payout_requests").select("*").eq("affiliate_id", profile.id).order("requested_at", { ascending: false }).limit(50),
    supabase.from("affiliate_clicks").select("id", { count: "exact", head: true }).eq("affiliate_id", profile.id),
  ]);
  for (const result of [conversions, commissions, payouts, clicks]) if (result.error) throw result.error;
  return NextResponse.json({
    profile,
    conversions: conversions.data ?? [],
    commissions: commissions.data ?? [],
    payouts: payouts.data ?? [],
    metrics: {
      clicks: clicks.count ?? 0,
      conversions: conversions.data?.length ?? 0,
      pendingCents: sumByStatus(commissions.data ?? [], ["pending", "approved"]),
      availableCents: sumByStatus(commissions.data ?? [], ["available"]),
      requestedCents: sumByStatus(commissions.data ?? [], ["requested"]),
      paidCents: sumByStatus(commissions.data ?? [], ["paid"]),
    },
  });
}

export async function PATCH(request: Request) {
  const csrfError = requireSameOrigin(request);
  if (csrfError) return csrfError;
  const limited = rateLimit(request, "affiliates:me:update", 20, 60_000);
  if (!limited.allowed) return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  const session = verifyWalletSession(request);
  if (!session?.wallet_address) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await readLimitedJson<{ displayName?: string; email?: string; payoutWallet?: string; referralCode?: string }>(request, 4096);
  const profile = await getOrCreateAffiliateProfile({
    walletAddress: session.wallet_address,
    displayName: body.displayName,
    email: body.email,
    referralCode: body.referralCode,
  });
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from("affiliate_profiles").update({
    display_name: body.displayName ?? profile.display_name,
    email: body.email ?? profile.email,
    payout_wallet: body.payoutWallet?.toLowerCase() ?? profile.payout_wallet,
    updated_at: new Date().toISOString(),
  }).eq("id", profile.id).select().single();
  if (error) return NextResponse.json({ error: "Could not update affiliate profile" }, { status: 500 });
  return NextResponse.json({ profile: data });
}

function sumByStatus(rows: Array<{ amount_cents: number; status: string }>, statuses: string[]) {
  return rows.filter((row) => statuses.includes(row.status)).reduce((sum, row) => sum + Number(row.amount_cents ?? 0), 0);
}
