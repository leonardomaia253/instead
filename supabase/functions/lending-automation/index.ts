import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { json, preflight, rateLimit } from "../_shared/security.ts";

type LendingPosition = {
  id?: string;
  wallet_address: string;
  collateral_asset: string;
  borrow_asset: string;
  collateral_amount: number;
  borrowed_amount: number;
  health_factor: number;
  chain_id: number;
  is_liquidatable?: boolean;
};

type Entitlement = {
  wallet_address: string;
  source_code: string;
  status: string;
  expires_at: string | null;
};

const AUTOMATION_PRODUCTS = [
  "liquidation_alerts_premium",
  "deleverage_assisted",
  "leverage_strategy_execution",
  "auto_rebalance_protection",
  "multi_protocol_routing_fee",
  "risk_shield_membership",
] as const;

function supabaseAdmin() {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("Service unavailable");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function severityForHealthFactor(healthFactor: number) {
  if (healthFactor < 1.15) return "critical";
  if (healthFactor < 1.35) return "warning";
  return "info";
}

function recommendationFor(position: LendingPosition, premium: boolean) {
  const hf = Number(position.health_factor ?? 999);
  if (hf < 1.15) return "Repague parte da dívida ou adicione colateral imediatamente. Preparar deleverage assistido.";
  if (hf < 1.35) return premium
    ? "Ativar deleverage/rebalance com assinatura do usuário e revisar LTV alvo."
    : "Reduza LTV ou contrate alertas premium para acompanhamento antecipado.";
  if (hf < 1.5) return premium
    ? "Monitorar em modo antecipado e preparar rebalance preventivo."
    : "Posição em atenção; mantenha margem de segurança.";
  return "Posição saudável; manter monitoramento.";
}

function targetProduct(healthFactor: number, premium: boolean) {
  if (healthFactor < 1.15) return "deleverage_assisted";
  if (healthFactor < 1.35) return premium ? "auto_rebalance_protection" : "liquidation_alerts_premium";
  if (healthFactor < 1.5) return premium ? "risk_shield_membership" : "liquidation_alerts_premium";
  return "multi_protocol_routing_fee";
}

async function sendTelegram(message: string) {
  const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
  const chatId = Deno.env.get("TELEGRAM_ALERT_CHAT_ID");
  if (!botToken || !chatId) return false;
  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text: message, disable_web_page_preview: true }),
  });
  return response.ok;
}

serve(async (req) => {
  const early = preflight(req);
  if (early) return early;

  try {
    const secret = Deno.env.get("LENDING_AUTOMATION_SECRET") || Deno.env.get("BALANCE_MONITOR_SECRET");
    if (!secret) return json({ error: "Service unavailable" }, 503);
    if (req.headers.get("x-automation-secret") !== secret) return json({ error: "Unauthorized" }, 401);

    const limited = rateLimit(req, "lending-automation");
    if (limited) return limited;

    const supabase = supabaseAdmin();
    const [{ data: positions, error: posError }, { data: entitlements, error: entError }] = await Promise.all([
      supabase.from("lending_positions").select("*").gt("borrowed_amount", 0).order("updated_at", { ascending: false }).limit(500),
      supabase.from("user_revenue_entitlements").select("wallet_address,source_code,status,expires_at").eq("status", "active"),
    ]);
    if (posError) throw posError;
    if (entError) throw entError;

  const entitlementsByWallet = new Map<string, Set<string>>();
  for (const entitlement of (entitlements ?? []) as Entitlement[]) {
    if (entitlement.expires_at && new Date(entitlement.expires_at).getTime() < Date.now()) continue;
    const wallet = entitlement.wallet_address.toLowerCase();
    if (!entitlementsByWallet.has(wallet)) entitlementsByWallet.set(wallet, new Set());
    entitlementsByWallet.get(wallet)!.add(entitlement.source_code);
  }

  const createdAlerts = [];
  const createdIntents = [];

  for (const position of (positions ?? []) as LendingPosition[]) {
    const wallet = position.wallet_address.toLowerCase();
    const hf = Number(position.health_factor ?? 999);
    const products = entitlementsByWallet.get(wallet) ?? new Set<string>();
    const premium = AUTOMATION_PRODUCTS.some((product) => products.has(product));
    const threshold = premium ? 1.5 : 1.2;
    if (hf >= threshold) continue;

    const severity = severityForHealthFactor(hf);
    const recommendation = recommendationFor(position, premium);
    const sourceCode = targetProduct(hf, premium);
    const fingerprint = `${wallet}:${position.chain_id}:${position.borrow_asset}:${severity}:${Math.floor(Date.now() / 3_600_000)}`;

    const { data: alert } = await supabase
      .from("lending_alert_events")
      .insert({
        wallet_address: wallet,
        position_id: position.id ?? null,
        chain_id: position.chain_id,
        severity,
        channel: "telegram",
        status: "queued",
        health_factor: hf,
        message: `[Instead] ${severity.toUpperCase()} HF ${hf.toFixed(2)} — ${recommendation}`,
        metadata: { premium, source_code: sourceCode, fingerprint },
      })
      .select("id,message")
      .single();
    if (alert) createdAlerts.push(alert);

    const { data: intent } = await supabase
      .from("lending_automation_intents")
      .insert({
        wallet_address: wallet,
        source_code: sourceCode,
        chain_id: position.chain_id,
        status: premium ? "queued" : "awaiting_payment",
        risk_threshold: threshold,
        payload: {
          position,
          premium,
          required_user_signature: true,
          execution_mode: "prepare_transaction_only",
        },
        recommendation,
      })
      .select("id,source_code,status")
      .single();
    if (intent) createdIntents.push(intent);
  }

  if (createdAlerts.length > 0) {
    const message = [
      "🚨 Instead lending automation",
      `${createdAlerts.length} alertas de risco criados`,
      `${createdIntents.length} intenções operacionais preparadas`,
      "Execução on-chain exige assinatura/permissão do usuário.",
    ].join("\n");
    const sent = await sendTelegram(message);
    if (sent) {
      await supabase
        .from("lending_alert_events")
        .update({ status: "sent", sent_at: new Date().toISOString() })
        .in("id", createdAlerts.map((item) => item.id));
    }
  }

    return json({
      ok: true,
      scannedPositions: positions?.length ?? 0,
      alertsCreated: createdAlerts.length,
      intentsCreated: createdIntents.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    if (message === "Service unavailable") return json({ error: message }, 503);
    console.error("lending-automation failed", message);
    return json({ error: "Internal server error" }, 500);
  }
});
