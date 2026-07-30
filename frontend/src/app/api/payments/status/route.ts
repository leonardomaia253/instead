import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/server/supabaseAdmin";
import { rateLimit } from "@/lib/server/rateLimit";
import { noStoreJson } from "@/lib/server/responses";
import { verifyWalletSession } from "@/lib/server/walletAuth";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(request: Request) {
  const limited = rateLimit(request, "payments:status", 30, 60_000);
  if (!limited.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429, headers: { "Retry-After": String(limited.retryAfterSeconds) } });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const wallet = searchParams.get("wallet")?.toLowerCase();

  if (!id || !wallet) return noStoreJson({ error: "id and wallet are required" }, { status: 400 });
  if (!UUID_RE.test(id)) return noStoreJson({ error: "Invalid payment id" }, { status: 400 });
  const session = verifyWalletSession(request);
  if (!session?.wallet_address || session.wallet_address.toLowerCase() !== wallet) {
    return noStoreJson({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("payment_intents")
      .select("id,provider,vertical,product_code,status,amount_cents,currency,paid_at,created_at")
      .eq("id", id)
      .eq("wallet_address", wallet)
      .single();

    if (error) return noStoreJson({ error: "Payment not found" }, { status: 404 });
    return noStoreJson({ payment: data });
  } catch (error) {
    console.error("Payment status failed", error);
    return noStoreJson({ error: "Could not load payment status" }, { status: 500 });
  }
}
