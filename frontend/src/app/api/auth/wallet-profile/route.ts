import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/server/supabaseAdmin";
import { rateLimit, readLimitedJson } from "@/lib/server/rateLimit";

const EVM_ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

export async function POST(request: Request) {
  const limited = rateLimit(request, "auth:wallet-profile", 20, 60_000);
  if (!limited.allowed) return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });

  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await readLimitedJson<Record<string, unknown>>(request, 4096).catch((): Record<string, unknown> => ({}));
  const walletAddress = String(body.walletAddress ?? "").toLowerCase();
  if (!EVM_ADDRESS_RE.test(walletAddress)) return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 });

  const supabase = createSupabaseAdminClient();
  const token = authorization.replace(/^Bearer\s+/i, "");
  const { data: userResult, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userResult.user) return NextResponse.json({ error: "Invalid session" }, { status: 401 });

  const identityMatchesWallet = userResult.user.identities?.some((identity) => {
    const data = identity.identity_data ?? {};
    return Object.values(data).some((value) => String(value).toLowerCase() === walletAddress);
  });

  const metadataMatchesWallet = Object.values(userResult.user.user_metadata ?? {}).some(
    (value) => String(value).toLowerCase() === walletAddress,
  );

  if (!identityMatchesWallet && !metadataMatchesWallet) {
    return NextResponse.json({ error: "Wallet does not match authenticated user" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("users")
    .upsert({ wallet_address: walletAddress }, { onConflict: "wallet_address" })
    .select("id,wallet_address,is_admin")
    .single();

  if (error) throw error;
  return NextResponse.json({ profile: data });
}
