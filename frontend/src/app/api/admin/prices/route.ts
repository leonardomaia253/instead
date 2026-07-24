import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/server/supabaseAdmin";
import { verifyAdminWallet } from "@/lib/server/walletAuth";
import { invalidatePriceCache } from "@/lib/server/payments";

// GET /api/admin/prices — lista todos os preços configurados
export async function GET(req: NextRequest) {
  const authError = await verifyAdminWallet(req);
  if (authError) return authError;

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("platform_prices")
    .select("product_code, label, amount_usd_cents, amount_brl_cents, is_active, updated_at, updated_by")
    .order("product_code");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ prices: data });
}

// PATCH /api/admin/prices — atualiza preço de um produto
// Body: { product_code, amount_usd_cents?, amount_brl_cents?, is_active?, label? }
export async function PATCH(req: NextRequest) {
  const authError = await verifyAdminWallet(req);
  if (authError) return authError;

  let body: {
    product_code: string;
    amount_usd_cents?: number;
    amount_brl_cents?: number;
    is_active?: boolean;
    label?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.product_code || typeof body.product_code !== "string") {
    return NextResponse.json({ error: "product_code is required" }, { status: 400 });
  }

  // Validações de valores
  if (body.amount_usd_cents !== undefined) {
    if (!Number.isInteger(body.amount_usd_cents) || body.amount_usd_cents <= 0) {
      return NextResponse.json({ error: "amount_usd_cents must be a positive integer (cents)" }, { status: 400 });
    }
  }
  if (body.amount_brl_cents !== undefined) {
    if (!Number.isInteger(body.amount_brl_cents) || body.amount_brl_cents <= 0) {
      return NextResponse.json({ error: "amount_brl_cents must be a positive integer (centavos)" }, { status: 400 });
    }
  }

  // Lê wallet do header SIWE para registrar quem fez o update
  const wallet = req.headers.get("x-wallet-address") ?? "unknown";

  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
    updated_by: wallet.toLowerCase(),
  };
  if (body.amount_usd_cents !== undefined) patch.amount_usd_cents = body.amount_usd_cents;
  if (body.amount_brl_cents !== undefined) patch.amount_brl_cents = body.amount_brl_cents;
  if (body.is_active !== undefined) patch.is_active = body.is_active;
  if (body.label !== undefined) patch.label = body.label;

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("platform_prices")
    .update(patch)
    .eq("product_code", body.product_code)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Product not found" }, { status: 404 });

  // Invalida cache em memória para próximas requisições de checkout usarem preço novo
  invalidatePriceCache();

  return NextResponse.json({ price: data });
}
