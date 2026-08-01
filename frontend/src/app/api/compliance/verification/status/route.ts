import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/server/supabaseAdmin";
import { rateLimit } from "@/lib/server/rateLimit";
import { noStoreJson } from "@/lib/server/responses";
import { verifyWalletSession } from "@/lib/server/walletAuth";

const EVM_ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

export async function GET(request: Request) {
  const limited = rateLimit(request, "compliance:didit:status", 30, 60_000);
  if (!limited.allowed) return noStoreJson({ error: "Rate limit exceeded" }, { status: 429 });

  const wallet = new URL(request.url).searchParams.get("wallet")?.toLowerCase() ?? "";
  if (!EVM_ADDRESS_RE.test(wallet)) return noStoreJson({ error: "Invalid wallet" }, { status: 400 });

  const session = verifyWalletSession(request);
  if (!session?.wallet_address || session.wallet_address.toLowerCase() !== wallet) {
    return noStoreJson({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("compliance_verifications")
    .select("id,provider,verification_kind,status,provider_session_id,provider_url,approved_at,declined_at,created_at,updated_at")
    .eq("wallet_address", wallet)
    .eq("provider", "didit")
    .order("created_at", { ascending: false })
    .limit(5);
  if (error) return noStoreJson({ error: "Could not load verification status" }, { status: 500 });
  return noStoreJson({ verifications: data ?? [] });
}
