import { NextRequest, NextResponse } from "next/server";
import { insertAdminAuditLog } from "@/lib/server/adminAudit";
import { requireSameOrigin } from "@/lib/server/csrf";
import { rateLimit, readLimitedJson } from "@/lib/server/rateLimit";
import { createSupabaseAdminClient } from "@/lib/server/supabaseAdmin";
import { getAdminWalletSession, verifyAdminWallet } from "@/lib/server/walletAuth";

const EVM_NETWORKS = [
  { id: "mainnet", label: "Ethereum", symbol: "ETH", rpcEnv: "MAINNET_RPC_URL", fallbackRpc: "https://ethereum-rpc.publicnode.com", thresholdEnv: "BALANCE_THRESHOLD_MAINNET_ETH", defaultThreshold: "0.02", decimals: 18 },
  { id: "base", label: "Base", symbol: "ETH", rpcEnv: "BASE_RPC_URL", fallbackRpc: "https://mainnet.base.org", thresholdEnv: "BALANCE_THRESHOLD_BASE_ETH", defaultThreshold: "0.002", decimals: 18 },
  { id: "arbitrum", label: "Arbitrum", symbol: "ETH", rpcEnv: "ARBITRUM_RPC_URL", fallbackRpc: "https://arb1.arbitrum.io/rpc", thresholdEnv: "BALANCE_THRESHOLD_ARBITRUM_ETH", defaultThreshold: "0.002", decimals: 18 },
  { id: "optimism", label: "Optimism", symbol: "ETH", rpcEnv: "OPTIMISM_RPC_URL", fallbackRpc: "https://mainnet.optimism.io", thresholdEnv: "BALANCE_THRESHOLD_OPTIMISM_ETH", defaultThreshold: "0.002", decimals: 18 },
  { id: "polygon", label: "Polygon", symbol: "POL", rpcEnv: "POLYGON_RPC_URL", fallbackRpc: "https://polygon-bor-rpc.publicnode.com", thresholdEnv: "BALANCE_THRESHOLD_POLYGON_POL", defaultThreshold: "5", decimals: 18 },
  { id: "avalanche", label: "Avalanche", symbol: "AVAX", rpcEnv: "AVALANCHE_RPC_URL", fallbackRpc: "https://api.avax.network/ext/bc/C/rpc", thresholdEnv: "BALANCE_THRESHOLD_AVALANCHE_AVAX", defaultThreshold: "0.05", decimals: 18 },
  { id: "bsc", label: "BNB Chain", symbol: "BNB", rpcEnv: "BSC_RPC_URL", fallbackRpc: "https://bsc-dataseed.binance.org", thresholdEnv: "BALANCE_THRESHOLD_BSC_BNB", defaultThreshold: "0.02", decimals: 18 },
];

const SCOPES = new Set(["global", "checkout", "token_factory", "assisted_deployments", "lending", "staking", "kyc", "webhooks"]);

function parseUnits(value: string, decimals: number) {
  const [wholeRaw, fractionRaw = ""] = value.trim().split(".");
  const fraction = fractionRaw.padEnd(decimals, "0").slice(0, decimals);
  return BigInt(wholeRaw || "0") * 10n ** BigInt(decimals) + BigInt(fraction || "0");
}

function formatUnits(value: bigint, decimals: number, maxDecimals = 6) {
  const base = 10n ** BigInt(decimals);
  const whole = value / base;
  const fraction = value % base;
  const fractionText = fraction.toString().padStart(decimals, "0").slice(0, maxDecimals).replace(/0+$/, "");
  return fractionText ? `${whole}.${fractionText}` : whole.toString();
}

async function rpc(url: string, method: string, params: unknown[]) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    cache: "no-store",
  });
  const payload = await response.json();
  if (!response.ok || payload.error) throw new Error(payload.error?.message || `HTTP ${response.status}`);
  return payload.result;
}

function resolveRpcUrl(network: (typeof EVM_NETWORKS)[number]) {
  const configured = process.env[network.rpcEnv];
  if (configured) return configured;
  if (process.env.ALLOW_PUBLIC_RPC_FALLBACK === "true") return network.fallbackRpc;
  throw new Error(`${network.rpcEnv} is required; set ALLOW_PUBLIC_RPC_FALLBACK=true only for local diagnostics`);
}

async function getBalanceChecks() {
  const address = process.env.BALANCE_MONITOR_EVM_ADDRESS || process.env.ASSISTED_DEPLOYER_ADDRESS || process.env.PRODUCTION_MULTISIG_ADDRESS;
  const checks = [];
  for (const network of EVM_NETWORKS) {
    if (!address) {
      checks.push({ ...network, status: "skipped", reason: "No EVM balance monitor address configured" });
      continue;
    }
    try {
      const rpcUrl = resolveRpcUrl(network);
      const balanceRaw = BigInt(await rpc(rpcUrl, "eth_getBalance", [address, "latest"]));
      const thresholdRaw = parseUnits(process.env[network.thresholdEnv] || network.defaultThreshold, network.decimals);
      checks.push({
        ...network,
        address,
        balance: formatUnits(balanceRaw, network.decimals),
        threshold: formatUnits(thresholdRaw, network.decimals),
        status: balanceRaw >= thresholdRaw ? "ok" : "low",
      });
    } catch (error) {
      checks.push({ ...network, address, status: "error", error: error instanceof Error ? error.message : String(error) });
    }
  }
  return checks;
}

export async function GET(req: NextRequest) {
  const authError = await verifyAdminWallet(req);
  if (authError) return authError;

  const supabase = createSupabaseAdminClient();
  const [
    balances,
    kyc,
    webhooks,
    incidents,
    audits,
    reconciliation,
    lendingIntents,
  ] = await Promise.all([
    getBalanceChecks(),
    supabase.from("compliance_verifications").select("id,provider,verification_kind,status,subject_type,subject_id,wallet_address,email,provider_session_id,provider_workflow_id,last_error,created_at,updated_at,expires_at").order("created_at", { ascending: false }).limit(50),
    supabase.from("webhook_event_logs").select("id,provider,event_type,provider_event_id,status,related_payment_intent_id,related_wallet_address,error_message,processed_at,created_at,updated_at").order("created_at", { ascending: false }).limit(50),
    supabase.from("operational_incidents").select("id,scope,status,severity,reason,created_by,resolved_by,created_at,resolved_at,metadata").order("created_at", { ascending: false }).limit(50),
    supabase.from("admin_audit_logs").select("id,admin_wallet,action,target_resource,details,ip_address,user_agent,created_at").order("created_at", { ascending: false }).limit(50),
    supabase.from("operation_reconciliation_queue").select("id,operation_id,user_wallet,vertical,action,tx_hash,chain_id,status,next_check_at,last_error,created_at,updated_at").order("created_at", { ascending: false }).limit(50),
    supabase.from("lending_automation_intents").select("id,wallet_address,source_code,chain_id,status,recommendation,tx_hash,created_at,updated_at").order("created_at", { ascending: false }).limit(50),
  ]);

  for (const result of [kyc, webhooks, incidents, audits, reconciliation, lendingIntents]) {
    if (result.error) {
      console.error("Admin operations load failed", result.error);
      return NextResponse.json({ error: "Could not load operations data" }, { status: 500 });
    }
  }

  return NextResponse.json({
    balances,
    kyc: kyc.data ?? [],
    webhooks: webhooks.data ?? [],
    incidents: incidents.data ?? [],
    audits: audits.data ?? [],
    queues: {
      reconciliation: reconciliation.data ?? [],
      lendingIntents: lendingIntents.data ?? [],
    },
  });
}

export async function PATCH(req: NextRequest) {
  const csrfError = requireSameOrigin(req);
  if (csrfError) return csrfError;

  const limited = rateLimit(req, "admin:operations", 20, 60_000);
  if (!limited.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429, headers: { "Retry-After": String(limited.retryAfterSeconds) } });
  }

  const authError = await verifyAdminWallet(req);
  if (authError) return authError;
  const adminSession = getAdminWalletSession(req);
  if (!adminSession) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { action?: string; id?: string; scope?: string; reason?: string; severity?: string };
  try {
    body = await readLimitedJson(req, 4096);
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const now = new Date().toISOString();

  if (body.action === "open_incident") {
    if (!body.scope || !SCOPES.has(body.scope)) return NextResponse.json({ error: "Invalid scope" }, { status: 400 });
    if (!body.reason || body.reason.length < 6) return NextResponse.json({ error: "Reason is required" }, { status: 400 });
    const { data, error } = await supabase.from("operational_incidents").insert({
      scope: body.scope,
      severity: body.severity === "critical" ? "critical" : body.severity === "info" ? "info" : "warning",
      reason: body.reason,
      created_by: adminSession.wallet_address.toLowerCase(),
    }).select().single();
    if (error) return NextResponse.json({ error: "Could not open incident" }, { status: 500 });
    await insertAdminAuditLog({ request: req, adminWallet: adminSession.wallet_address, action: "incident_open", targetResource: `operational_incidents:${data.id}`, details: data });
    return NextResponse.json({ incident: data });
  }

  if (body.action === "resolve_incident") {
    if (!body.id) return NextResponse.json({ error: "id is required" }, { status: 400 });
    const { data, error } = await supabase.from("operational_incidents").update({
      status: "resolved",
      resolved_by: adminSession.wallet_address.toLowerCase(),
      resolved_at: now,
    }).eq("id", body.id).neq("status", "resolved").select().single();
    if (error) return NextResponse.json({ error: "Could not resolve incident" }, { status: 500 });
    await insertAdminAuditLog({ request: req, adminWallet: adminSession.wallet_address, action: "incident_resolve", targetResource: `operational_incidents:${body.id}`, details: data });
    return NextResponse.json({ incident: data });
  }

  if (body.action === "reprocess_webhook") {
    if (!body.id) return NextResponse.json({ error: "id is required" }, { status: 400 });
    const { data, error } = await supabase.from("webhook_event_logs").update({
      status: "reprocess_requested",
      updated_at: now,
    }).eq("id", body.id).select().single();
    if (error) return NextResponse.json({ error: "Could not request webhook reprocess" }, { status: 500 });
    await insertAdminAuditLog({ request: req, adminWallet: adminSession.wallet_address, action: "webhook_reprocess_request", targetResource: `webhook_event_logs:${body.id}`, details: data });
    return NextResponse.json({ webhook: data });
  }

  if (body.action === "retry_reconciliation") {
    if (!body.id) return NextResponse.json({ error: "id is required" }, { status: 400 });
    const { data, error } = await supabase.from("operation_reconciliation_queue").update({
      status: "pending",
      next_check_at: now,
      last_error: null,
      updated_at: now,
    }).eq("id", body.id).select().single();
    if (error) return NextResponse.json({ error: "Could not retry reconciliation item" }, { status: 500 });
    await insertAdminAuditLog({ request: req, adminWallet: adminSession.wallet_address, action: "reconciliation_retry", targetResource: `operation_reconciliation_queue:${body.id}`, details: data });
    return NextResponse.json({ item: data });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
