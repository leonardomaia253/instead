import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/server/supabaseAdmin";
import { insertAdminAuditLog } from "@/lib/server/adminAudit";
import { requireSameOrigin } from "@/lib/server/csrf";
import { rateLimit, readLimitedJson } from "@/lib/server/rateLimit";
import { getAdminWalletSession, verifyAdminWallet } from "@/lib/server/walletAuth";

function hashApiKey(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function normalizeDomain(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "");
}

export async function POST(request: NextRequest) {
  const csrfError = requireSameOrigin(request);
  if (csrfError) return csrfError;

  const limited = rateLimit(request, "admin:b2b-clients", 10, 60_000);
  if (!limited.allowed) return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  const authError = await verifyAdminWallet(request);
  if (authError) return authError;
  const adminSession = getAdminWalletSession(request);
  if (!adminSession) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const adminWallet = adminSession.wallet_address;

  const body = await readLimitedJson<Record<string, unknown>>(request, 4096).catch((): Record<string, unknown> => ({}));
  const name = String(body.name ?? "").trim();
  const domain = normalizeDomain(body.domain);
  const contactEmail = String(body.contactEmail ?? "").trim() || null;
  const revenueShareBps = Number(body.revenueShareBps ?? 2000);
  const monthlyFeeUsdCents = Number(body.monthlyFeeUsdCents ?? 19900);

  if (name.length < 2 || !/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(domain)) {
    return NextResponse.json({ error: "Invalid B2B client" }, { status: 400 });
  }
  if (!Number.isInteger(revenueShareBps) || revenueShareBps < 0 || revenueShareBps > 10000) {
    return NextResponse.json({ error: "Invalid revenue share" }, { status: 400 });
  }
  if (!Number.isInteger(monthlyFeeUsdCents) || monthlyFeeUsdCents < 0 || monthlyFeeUsdCents > 10_000_000) {
    return NextResponse.json({ error: "Invalid monthly fee" }, { status: 400 });
  }

  const apiKey = `inst_widget_${crypto.randomBytes(24).toString("hex")}`;
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("b2b_widget_clients")
    .upsert(
      {
        name,
        domain,
        contact_email: contactEmail,
        api_key_hash: hashApiKey(apiKey),
        status: "active",
        revenue_share_bps: revenueShareBps,
        monthly_fee_usd_cents: monthlyFeeUsdCents,
        metadata: { provisioned_from: "admin_revenue_ui" },
        updated_at: new Date().toISOString(),
      },
      { onConflict: "domain" },
    )
    .select("id,name,domain,status,revenue_share_bps,monthly_fee_usd_cents")
    .single();

  if (error) throw error;
  await insertAdminAuditLog({
    request,
    adminWallet,
    action: "b2b_widget_client_provision",
    targetResource: `b2b_widget_clients:${domain}`,
    details: {
      client_id: data.id,
      domain,
      revenue_share_bps: revenueShareBps,
      monthly_fee_usd_cents: monthlyFeeUsdCents,
    },
  });
  return NextResponse.json({ client: data, apiKey });
}
