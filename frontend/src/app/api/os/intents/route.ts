import { NextResponse } from "next/server";
import { buildIntentPlan } from "@/lib/intentEngine";
import { createSupabaseAdminClient } from "@/lib/server/supabaseAdmin";
import { requireSameOrigin } from "@/lib/server/csrf";
import { rateLimit, readLimitedJson } from "@/lib/server/rateLimit";
import { verifyWalletSession } from "@/lib/server/walletAuth";

const EVM_ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

export async function POST(request: Request) {
  try {
    const csrfError = requireSameOrigin(request);
    if (csrfError) return csrfError;

    const limited = rateLimit(request, "os:intents", 30, 60_000);
    if (!limited.allowed) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }

    const body = await readLimitedJson<Record<string, unknown>>(request, 4096);
    const input = String(body.input ?? "").trim();
    const healthFactor = body.healthFactor == null ? undefined : Number(body.healthFactor);
    const walletAddress = typeof body.walletAddress === "string" ? body.walletAddress.toLowerCase() : null;

    if (input.length < 6 || input.length > 500) {
      return NextResponse.json({ error: "Intent must be between 6 and 500 characters" }, { status: 400 });
    }
    if (healthFactor !== undefined && (!Number.isFinite(healthFactor) || healthFactor < 0)) {
      return NextResponse.json({ error: "Invalid health factor" }, { status: 400 });
    }
    if (walletAddress && !EVM_ADDRESS_RE.test(walletAddress)) {
      return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 });
    }

    const session = verifyWalletSession(request);
    if (walletAddress && session?.wallet_address?.toLowerCase() !== walletAddress) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const plan = buildIntentPlan(input, healthFactor);
    let saved = null;

    try {
      const supabase = createSupabaseAdminClient();
      const { data, error } = await supabase
        .from("os_intent_plans")
        .insert({
          wallet_address: walletAddress,
          input,
          kind: plan.kind,
          risk: plan.risk,
          title: plan.title,
          summary: plan.summary,
          recommended_route: plan.recommendedRoute,
          next_actions: plan.nextActions,
          blocked_by: plan.blockedBy,
          metadata: {
            health_factor: healthFactor ?? null,
            source: "instead_os_console",
          },
        })
        .select("id,status,created_at")
        .single();
      if (error) throw error;
      saved = data;
    } catch (dbError) {
      console.error("Could not persist OS intent plan", dbError);
    }

    return NextResponse.json({ plan, saved });
  } catch (error) {
    console.error("Could not build OS intent", error);
    return NextResponse.json({ error: "Could not build OS intent" }, { status: 500 });
  }
}
