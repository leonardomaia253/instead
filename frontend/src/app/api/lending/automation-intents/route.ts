import { NextResponse } from "next/server";
import { LENDING_PREMIUM_CODES } from "@/lib/lendingPremium";
import { createSupabaseAdminClient } from "@/lib/server/supabaseAdmin";
import { requireSameOrigin } from "@/lib/server/csrf";
import { rateLimit, readLimitedJson } from "@/lib/server/rateLimit";
import { verifyWalletSession } from "@/lib/server/walletAuth";

const EVM_ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

async function hasActiveEntitlement(walletAddress: string, sourceCode: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("user_revenue_entitlements")
    .select("id,expires_at")
    .eq("wallet_address", walletAddress)
    .eq("source_code", sourceCode)
    .eq("status", "active")
    .maybeSingle();

  if (error) throw error;
  if (!data) return false;
  return !data.expires_at || new Date(data.expires_at).getTime() > Date.now();
}

export async function POST(request: Request) {
  try {
    const csrfError = requireSameOrigin(request);
    if (csrfError) return csrfError;

    const limited = rateLimit(request, "lending:automation-intents", 20, 60_000);
    if (!limited.allowed) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }

    const body = await readLimitedJson<Record<string, unknown>>(request, 4096);
    const walletAddress = String(body.walletAddress ?? "").toLowerCase();
    const sourceCode = String(body.sourceCode ?? "");
    const chainId = Number(body.chainId ?? 0);
    const session = verifyWalletSession(request);

    if (!EVM_ADDRESS_RE.test(walletAddress)) return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 });
    if (!session?.wallet_address || session.wallet_address.toLowerCase() !== walletAddress) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!(LENDING_PREMIUM_CODES as readonly string[]).includes(sourceCode)) return NextResponse.json({ error: "Unsupported lending product" }, { status: 400 });
    if (!Number.isInteger(chainId) || chainId <= 0) return NextResponse.json({ error: "Invalid chain id" }, { status: 400 });

    const premium = await hasActiveEntitlement(walletAddress, sourceCode);
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("lending_automation_intents")
      .insert({
        wallet_address: walletAddress,
        source_code: sourceCode,
        chain_id: chainId,
        status: premium ? "queued" : "awaiting_payment",
        risk_threshold: body.riskThreshold ?? null,
        payload: body.payload ?? {},
        recommendation: body.recommendation ?? null,
      })
      .select("id,status,source_code")
      .single();

    if (error) throw error;
    return NextResponse.json({ intent: data });
  } catch (error) {
    console.error("Could not create lending automation intent", error);
    return NextResponse.json({ error: "Could not create intent" }, { status: 500 });
  }
}
