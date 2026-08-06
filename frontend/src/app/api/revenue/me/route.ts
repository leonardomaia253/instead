import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/server/supabaseAdmin";
import { rateLimit } from "@/lib/server/rateLimit";
import { noStoreJson } from "@/lib/server/responses";
import { verifyWalletSession } from "@/lib/server/walletAuth";

const EVM_ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

export async function GET(request: Request) {
  const limited = rateLimit(request, "revenue:me", 60, 60_000);
  if (!limited.allowed) return noStoreJson({ error: "Rate limit exceeded" }, { status: 429 });

  const wallet = new URL(request.url).searchParams.get("wallet")?.toLowerCase() ?? "";
  if (!EVM_ADDRESS_RE.test(wallet)) return noStoreJson({ error: "Invalid wallet" }, { status: 400 });
  const session = verifyWalletSession(request);
  if (!session?.wallet_address || session.wallet_address.toLowerCase() !== wallet) {
    return noStoreJson({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createSupabaseAdminClient();
  const [entitlements, assistedDeployments, intents, alerts] = await Promise.all([
    supabase
      .from("user_revenue_entitlements")
      .select("id,source_code,status,starts_at,expires_at,metadata,revenue_sources(label,category,billing_interval)")
      .eq("wallet_address", wallet)
      .order("created_at", { ascending: false }),
    supabase
      .from("assisted_token_deployments")
      .select("id,payment_intent_id,wallet_address,chain_id,factory_address,status,token_name,token_symbol,initial_supply,max_supply,mintable,taxable,tax_bps,has_blacklist,burn_tax,max_wallet_bps,relayer_wallet,tx_hash,token_address,error_message,attempts,next_attempt_at,metadata,created_at,updated_at")
      .eq("wallet_address", wallet)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("lending_automation_intents")
      .select("id,source_code,chain_id,status,risk_threshold,recommendation,tx_hash,created_at,updated_at,payload,revenue_sources(label,category)")
      .eq("wallet_address", wallet)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("lending_alert_events")
      .select("id,severity,status,health_factor,message,metadata,sent_at,created_at")
      .eq("wallet_address", wallet)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  if (entitlements.error) throw entitlements.error;
  if (assistedDeployments.error) throw assistedDeployments.error;
  if (intents.error) throw intents.error;
  if (alerts.error) throw alerts.error;

  return noStoreJson({
    entitlements: entitlements.data ?? [],
    assistedDeployments: assistedDeployments.data ?? [],
    intents: intents.data ?? [],
    alerts: alerts.data ?? [],
  });
}
