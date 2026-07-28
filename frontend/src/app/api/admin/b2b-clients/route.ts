import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/server/supabaseAdmin";
import { rateLimit } from "@/lib/server/rateLimit";

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

export async function POST(request: Request) {
  const limited = rateLimit(request, "admin:b2b-clients", 10, 60_000);
  if (!limited.allowed) return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });

  const body = await request.json().catch(() => ({}));
  const name = String(body.name ?? "").trim();
  const domain = normalizeDomain(body.domain);
  const contactEmail = String(body.contactEmail ?? "").trim() || null;

  if (name.length < 2 || !/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(domain)) {
    return NextResponse.json({ error: "Invalid B2B client" }, { status: 400 });
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
        revenue_share_bps: Number(body.revenueShareBps ?? 2000),
        monthly_fee_usd_cents: Number(body.monthlyFeeUsdCents ?? 49900),
        metadata: { provisioned_from: "admin_revenue_ui" },
        updated_at: new Date().toISOString(),
      },
      { onConflict: "domain" },
    )
    .select("id,name,domain,status,revenue_share_bps,monthly_fee_usd_cents")
    .single();

  if (error) throw error;
  return NextResponse.json({ client: data, apiKey });
}
