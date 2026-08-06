import { NextRequest, NextResponse } from "next/server";
import { insertAdminAuditLog } from "@/lib/server/adminAudit";
import { requireSameOrigin } from "@/lib/server/csrf";
import { rateLimit, readLimitedJson } from "@/lib/server/rateLimit";
import { createSupabaseAdminClient } from "@/lib/server/supabaseAdmin";
import { getAdminWalletSession, verifyAdminWallet } from "@/lib/server/walletAuth";

export async function GET(req: NextRequest) {
  const authError = await verifyAdminWallet(req);
  if (authError) return authError;
  const supabase = createSupabaseAdminClient();
  const [profiles, conversions, commissions, payouts] = await Promise.all([
    supabase.from("affiliate_profiles").select("*").order("created_at", { ascending: false }).limit(100),
    supabase.from("affiliate_conversions").select("*").order("created_at", { ascending: false }).limit(100),
    supabase.from("affiliate_commissions").select("*").order("created_at", { ascending: false }).limit(100),
    supabase.from("affiliate_payout_requests").select("*").order("requested_at", { ascending: false }).limit(100),
  ]);
  for (const result of [profiles, conversions, commissions, payouts]) {
    if (result.error) return NextResponse.json({ error: "Could not load affiliates" }, { status: 500 });
  }
  return NextResponse.json({
    profiles: profiles.data ?? [],
    conversions: conversions.data ?? [],
    commissions: commissions.data ?? [],
    payouts: payouts.data ?? [],
  });
}

export async function PATCH(req: NextRequest) {
  const csrfError = requireSameOrigin(req);
  if (csrfError) return csrfError;
  const limited = rateLimit(req, "admin:affiliates", 20, 60_000);
  if (!limited.allowed) return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  const authError = await verifyAdminWallet(req);
  if (authError) return authError;
  const adminSession = getAdminWalletSession(req);
  if (!adminSession) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await readLimitedJson<{ type?: string; id?: string; status?: string; commissionBps?: number; txHash?: string; notes?: string }>(req, 4096);
  if (!body.id || !body.type) return NextResponse.json({ error: "id and type are required" }, { status: 400 });
  const supabase = createSupabaseAdminClient();
  const now = new Date().toISOString();

  if (body.type === "profile") {
    const patch: Record<string, unknown> = { updated_at: now };
    if (body.status && ["pending", "active", "suspended", "rejected"].includes(body.status)) patch.status = body.status;
    if (body.commissionBps !== undefined) {
      if (!Number.isInteger(body.commissionBps) || body.commissionBps < 0 || body.commissionBps > 5000) return NextResponse.json({ error: "Invalid commission" }, { status: 400 });
      patch.default_commission_bps = body.commissionBps;
    }
    const { data, error } = await supabase.from("affiliate_profiles").update(patch).eq("id", body.id).select().single();
    if (error) return NextResponse.json({ error: "Could not update affiliate" }, { status: 500 });
    await insertAdminAuditLog({ request: req, adminWallet: adminSession.wallet_address, action: "affiliate_profile_update", targetResource: `affiliate_profiles:${body.id}`, details: patch });
    return NextResponse.json({ profile: data });
  }

  if (body.type === "commission") {
    if (!body.status || !["approved", "available", "rejected", "reversed"].includes(body.status)) return NextResponse.json({ error: "Invalid commission status" }, { status: 400 });
    const { data, error } = await supabase.from("affiliate_commissions").update({ status: body.status, updated_at: now }).eq("id", body.id).select().single();
    if (error) return NextResponse.json({ error: "Could not update commission" }, { status: 500 });
    await insertAdminAuditLog({ request: req, adminWallet: adminSession.wallet_address, action: "affiliate_commission_update", targetResource: `affiliate_commissions:${body.id}`, details: { status: body.status } });
    return NextResponse.json({ commission: data });
  }

  if (body.type === "payout") {
    if (!body.status || !["approved", "paid", "rejected", "cancelled"].includes(body.status)) return NextResponse.json({ error: "Invalid payout status" }, { status: 400 });
    const patch: Record<string, unknown> = { status: body.status, reviewed_by: adminSession.wallet_address.toLowerCase(), reviewed_at: now, notes: body.notes ?? null };
    if (body.status === "paid") {
      patch.paid_at = now;
      patch.tx_hash = body.txHash ?? null;
    }
    const { data, error } = await supabase.from("affiliate_payout_requests").update(patch).eq("id", body.id).select().single();
    if (error) return NextResponse.json({ error: "Could not update payout" }, { status: 500 });
    if (body.status === "paid") {
      await supabase.from("affiliate_commissions").update({ status: "paid", paid_at: now, updated_at: now }).eq("payout_request_id", body.id);
    }
    await insertAdminAuditLog({ request: req, adminWallet: adminSession.wallet_address, action: "affiliate_payout_update", targetResource: `affiliate_payout_requests:${body.id}`, details: patch });
    return NextResponse.json({ payout: data });
  }

  return NextResponse.json({ error: "Invalid type" }, { status: 400 });
}
