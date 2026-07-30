import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/server/supabaseAdmin";
import { insertAdminAuditLog } from "@/lib/server/adminAudit";
import { requireSameOrigin } from "@/lib/server/csrf";
import { rateLimit, readLimitedJson } from "@/lib/server/rateLimit";
import { getAdminWalletSession, verifyAdminWallet } from "@/lib/server/walletAuth";
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

  if (error) {
    console.error("Admin prices list failed", error);
    return NextResponse.json({ error: "Could not load prices" }, { status: 500 });
  }
  return NextResponse.json({ prices: data });
}

// PATCH /api/admin/prices — atualiza preço de um produto
// Body: { product_code, amount_usd_cents?, amount_brl_cents?, is_active?, label? }
export async function PATCH(req: NextRequest) {
  const csrfError = requireSameOrigin(req);
  if (csrfError) return csrfError;

  const limited = rateLimit(req, "admin:prices", 20, 60_000);
  if (!limited.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429, headers: { "Retry-After": String(limited.retryAfterSeconds) } });
  }

  const authError = await verifyAdminWallet(req);
  if (authError) return authError;
  const adminSession = getAdminWalletSession(req);
  if (!adminSession) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: {
    product_code: string;
    amount_usd_cents?: number;
    amount_brl_cents?: number;
    is_active?: boolean;
    label?: string;
  };

  try {
    body = await readLimitedJson(req, 4096);
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
  const wallet = adminSession.wallet_address;

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

  if (error) {
    console.error("Admin price update failed", error);
    return NextResponse.json({ error: "Could not update price" }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: "Product not found" }, { status: 404 });

  // Invalida cache em memória para próximas requisições de checkout usarem preço novo
  invalidatePriceCache();

  await insertAdminAuditLog({
    request: req,
    adminWallet: adminSession.wallet_address,
    action: "platform_price_update",
    targetResource: `platform_prices:${body.product_code}`,
    details: {
      product_code: body.product_code,
      fields: Object.keys(patch).filter((key) => !["updated_at", "updated_by"].includes(key)),
    },
  });

  return NextResponse.json({ price: data });
}
