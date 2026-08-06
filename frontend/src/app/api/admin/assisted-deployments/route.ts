import { NextRequest, NextResponse } from "next/server";
import { insertAdminAuditLog } from "@/lib/server/adminAudit";
import { requireSameOrigin } from "@/lib/server/csrf";
import { rateLimit, readLimitedJson } from "@/lib/server/rateLimit";
import { createSupabaseAdminClient } from "@/lib/server/supabaseAdmin";
import { getAdminWalletSession, verifyAdminWallet } from "@/lib/server/walletAuth";

const ALLOWED_STATUSES = new Set(["queued", "executing", "confirmed", "failed", "cancelled"]);
const ADMIN_ACTIONS = new Set(["retry", "cancel"]);

export async function GET(req: NextRequest) {
  const authError = await verifyAdminWallet(req);
  if (authError) return authError;

  const url = new URL(req.url);
  const status = url.searchParams.get("status") ?? "all";
  const chainId = url.searchParams.get("chainId") ?? "all";
  const wallet = url.searchParams.get("wallet")?.trim().toLowerCase() ?? "";

  if (status !== "all" && !ALLOWED_STATUSES.has(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }
  if (chainId !== "all" && !/^\d+$/.test(chainId)) {
    return NextResponse.json({ error: "Invalid chainId" }, { status: 400 });
  }
  if (wallet && !/^0x[a-f0-9]{40}$/.test(wallet)) {
    return NextResponse.json({ error: "Invalid wallet" }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  let query = supabase
    .from("assisted_token_deployments")
    .select("id,payment_intent_id,wallet_address,chain_id,factory_address,status,token_name,token_symbol,initial_supply,max_supply,mintable,taxable,tax_bps,has_blacklist,burn_tax,max_wallet_bps,relayer_wallet,tx_hash,token_address,error_message,attempts,next_attempt_at,metadata,created_at,updated_at")
    .order("created_at", { ascending: false })
    .limit(100);

  if (status !== "all") query = query.eq("status", status);
  if (chainId !== "all") query = query.eq("chain_id", Number(chainId));
  if (wallet) query = query.eq("wallet_address", wallet);

  const { data, error } = await query;
  if (error) {
    console.error("Admin assisted deployments list failed", error);
    return NextResponse.json({ error: "Could not load assisted deployments" }, { status: 500 });
  }

  return NextResponse.json({ deployments: data ?? [] });
}

export async function PATCH(req: NextRequest) {
  const csrfError = requireSameOrigin(req);
  if (csrfError) return csrfError;

  const limited = rateLimit(req, "admin:assisted-deployments", 20, 60_000);
  if (!limited.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429, headers: { "Retry-After": String(limited.retryAfterSeconds) } });
  }

  const authError = await verifyAdminWallet(req);
  if (authError) return authError;
  const adminSession = getAdminWalletSession(req);
  if (!adminSession) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { id?: string; action?: string };
  try {
    body = await readLimitedJson(req, 2048);
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.id || !/^[0-9a-f-]{36}$/i.test(body.id)) {
    return NextResponse.json({ error: "Invalid deployment id" }, { status: 400 });
  }
  if (!body.action || !ADMIN_ACTIONS.has(body.action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { data: existing, error: loadError } = await supabase
    .from("assisted_token_deployments")
    .select("id,status,wallet_address,chain_id,token_name,token_symbol,attempts")
    .eq("id", body.id)
    .single();

  if (loadError || !existing) return NextResponse.json({ error: "Deployment not found" }, { status: 404 });

  const now = new Date().toISOString();
  const patch = body.action === "retry"
    ? { status: "queued", error_message: null, next_attempt_at: now, updated_at: now }
    : { status: "cancelled", error_message: "Cancelled by admin", updated_at: now };

  if (body.action === "retry" && existing.status === "confirmed") {
    return NextResponse.json({ error: "Confirmed deployments cannot be retried" }, { status: 409 });
  }
  if (body.action === "cancel" && existing.status === "confirmed") {
    return NextResponse.json({ error: "Confirmed deployments cannot be cancelled" }, { status: 409 });
  }

  const { data, error } = await supabase
    .from("assisted_token_deployments")
    .update(patch)
    .eq("id", body.id)
    .select()
    .single();

  if (error) {
    console.error("Admin assisted deployment update failed", error);
    return NextResponse.json({ error: "Could not update assisted deployment" }, { status: 500 });
  }

  await insertAdminAuditLog({
    request: req,
    adminWallet: adminSession.wallet_address,
    action: `assisted_deployment_${body.action}`,
    targetResource: `assisted_token_deployments:${body.id}`,
    details: {
      previous_status: existing.status,
      next_status: data.status,
      wallet_address: existing.wallet_address,
      chain_id: existing.chain_id,
      token: `${existing.token_name} (${existing.token_symbol})`,
    },
  });

  return NextResponse.json({ deployment: data });
}
