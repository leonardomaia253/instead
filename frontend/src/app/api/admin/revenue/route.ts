import { NextResponse } from "next/server";
import { REVENUE_SOURCES } from "@/lib/revenueCatalog";
import { createSupabaseAdminClient } from "@/lib/server/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("revenue_sources")
      .select("*")
      .order("vertical", { ascending: true })
      .order("source_code", { ascending: true });

    if (error) throw error;

    const [{ count: entitlementCount }, { count: intentCount }, { count: b2bCount }, { count: alertCount }, { count: b2bEventCount }] = await Promise.all([
      supabase.from("user_revenue_entitlements").select("id", { count: "exact", head: true }),
      supabase.from("lending_automation_intents").select("id", { count: "exact", head: true }),
      supabase.from("b2b_widget_clients").select("id", { count: "exact", head: true }),
      supabase.from("lending_alert_events").select("id", { count: "exact", head: true }),
      supabase.from("b2b_widget_events").select("id", { count: "exact", head: true }),
    ]);

    return NextResponse.json({
      sources: data ?? [],
      count: data?.length ?? 0,
      operations: {
        entitlements: entitlementCount ?? 0,
        automationIntents: intentCount ?? 0,
        b2bClients: b2bCount ?? 0,
        alerts: alertCount ?? 0,
        b2bEvents: b2bEventCount ?? 0,
      },
      source: "supabase",
    });
  } catch {
    return NextResponse.json({
      sources: REVENUE_SOURCES.map((source) => ({
        source_code: source.sourceCode,
        label: source.label,
        vertical: source.vertical,
        category: source.category,
        revenue_model: source.revenueModel,
        billing_interval: source.billingInterval,
        status: source.status,
        production_ready: source.productionReady,
        amount_usd_cents: source.amountUsdCents ?? null,
        amount_brl_cents: source.amountBrlCents ?? null,
        take_rate_bps: source.takeRateBps ?? null,
        notes: source.notes,
      })),
      count: REVENUE_SOURCES.length,
      operations: {
        entitlements: 0,
        automationIntents: 0,
        b2bClients: 0,
        alerts: 0,
        b2bEvents: 0,
      },
      source: "fallback",
    });
  }
}
