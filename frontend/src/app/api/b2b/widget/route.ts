import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { REVENUE_SOURCE_COUNT } from "@/lib/revenueCatalog";
import { createSupabaseAdminClient } from "@/lib/server/supabaseAdmin";
import { rateLimit, readLimitedJson } from "@/lib/server/rateLimit";

function hashApiKey(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export async function GET(request: Request) {
  const limited = rateLimit(request, "b2b:widget-config", 60, 60_000);
  if (!limited.allowed) return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });

  const url = new URL(request.url);
  const domain = url.searchParams.get("domain")?.toLowerCase();
  const apiKey = request.headers.get("x-instead-widget-key");

  if (!domain || !apiKey) {
    return NextResponse.json({ error: "domain and x-instead-widget-key are required" }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("b2b_widget_clients")
    .select("id,name,domain,status,revenue_share_bps,monthly_fee_usd_cents")
    .eq("domain", domain)
    .eq("api_key_hash", hashApiKey(apiKey))
    .single();

  if (error || !data || data.status !== "active") {
    return NextResponse.json({ error: "Widget client not authorized" }, { status: 401 });
  }

  await supabase.from("b2b_widget_events").insert({
    client_id: data.id,
    domain,
    event_type: "config_view",
    metadata: { mode: "widget_config" },
  });

  return NextResponse.json({
    client: data,
    widget: {
      appUrl: process.env.APP_ORIGIN || process.env.NEXT_PUBLIC_APP_ORIGIN || "https://instead.volupai.com",
      lendingPath: "/lending",
      supportedProducts: REVENUE_SOURCE_COUNT,
      modes: ["lending", "risk_dashboard", "premium_checkout"],
    },
  });
}

export async function POST(request: Request) {
  const limited = rateLimit(request, "b2b:widget-lead", 30, 60_000);
  if (!limited.allowed) return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });

  const body = await readLimitedJson<Record<string, unknown>>(request, 4096).catch((): Record<string, unknown> => ({}));
  const domain = String(body.domain ?? "").toLowerCase();
  const apiKey = request.headers.get("x-instead-widget-key") ?? "";
  const walletAddress = String(body.walletAddress ?? "").toLowerCase();

  if (!domain || !apiKey || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
    return NextResponse.json({ error: "Invalid widget lead" }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { data: client } = await supabase
    .from("b2b_widget_clients")
    .select("id,status")
    .eq("domain", domain)
    .eq("api_key_hash", hashApiKey(apiKey))
    .single();

  if (!client || client.status !== "active") return NextResponse.json({ error: "Widget client not authorized" }, { status: 401 });

  await supabase.from("b2b_widget_events").insert({
    client_id: client.id,
    domain,
    event_type: "lead_created",
    wallet_address: walletAddress,
    source_code: "b2b_lending_widget_api",
    metadata: { requested_product: String(body.requestedProduct ?? "lending").slice(0, 80) },
  });

  const { data, error } = await supabase
    .from("lending_automation_intents")
    .insert({
      wallet_address: walletAddress,
      source_code: "b2b_lending_widget_api",
      chain_id: Number(body.chainId ?? 8453),
      status: "queued",
      payload: {
        b2b_client_id: client.id,
        domain,
        requested_product: String(body.requestedProduct ?? "lending").slice(0, 80),
      },
      recommendation: "Lead B2B recebido via widget Instead.",
    })
    .select("id,status")
    .single();

  if (error) throw error;
  return NextResponse.json({ lead: data });
}
