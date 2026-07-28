import { NextResponse } from "next/server";
import { LENDING_PREMIUM_CODES } from "@/lib/lendingPremium";
import { createSupabaseAdminClient } from "@/lib/server/supabaseAdmin";
import { rateLimit } from "@/lib/server/rateLimit";

const EVM_ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

export async function POST(request: Request) {
  try {
    const limited = rateLimit(request, "lending:automation-intents", 20, 60_000);
    if (!limited.allowed) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }

    const body = await request.json();
    const walletAddress = String(body.walletAddress ?? "").toLowerCase();
    const sourceCode = String(body.sourceCode ?? "");
    const chainId = Number(body.chainId ?? 0);

    if (!EVM_ADDRESS_RE.test(walletAddress)) return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 });
    if (!(LENDING_PREMIUM_CODES as readonly string[]).includes(sourceCode)) return NextResponse.json({ error: "Unsupported lending product" }, { status: 400 });
    if (!Number.isInteger(chainId) || chainId <= 0) return NextResponse.json({ error: "Invalid chain id" }, { status: 400 });

    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("lending_automation_intents")
      .insert({
        wallet_address: walletAddress,
        source_code: sourceCode,
        chain_id: chainId,
        status: body.requiresPayment === false ? "queued" : "awaiting_payment",
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
