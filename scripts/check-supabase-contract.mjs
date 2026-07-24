import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const failures = [];

function read(path) {
  return readFileSync(resolve(root, path), "utf8");
}

const migrations = readdirSync(resolve(root, "supabase/migrations"))
  .filter((file) => file.endsWith(".sql"))
  .sort()
  .map((file) => read(`supabase/migrations/${file}`))
  .join("\n");

const expectedTables = [
  "users",
  "generated_tokens",
  "lending_positions",
  "audits",
  "telegram_bot_intents",
  "operation_reconciliation_queue",
  "lending_protocol_routes",
  "payment_intents",
];

for (const table of expectedTables) {
  if (!new RegExp(`(?:CREATE TABLE IF NOT EXISTS|ALTER TABLE) public\\.${table}\\b`, "i").test(migrations)) {
    failures.push(`Supabase table ${table} is not defined in migrations`);
  }
}

for (const policy of [
  "Admins read lending positions",
  "Admins read audits",
  "Admins read reconciliation operations",
  "Admins read observability events",
]) {
  if (!migrations.includes(policy)) failures.push(`Missing RLS policy: ${policy}`);
}

if (!migrations.includes("auth.jwt() ->> 'is_admin'")) {
  failures.push("Admin RLS policies must use is_admin from SIWE JWT");
}

const adminTokens = read("frontend/src/app/[locale]/admin/tokens/page.tsx");
if (!adminTokens.includes('.from("generated_tokens")')) failures.push("Admin tokens page must query generated_tokens");
if (adminTokens.includes('.from("tokens")')) failures.push("Admin tokens page queries nonexistent tokens table");
if (adminTokens.includes("contract_address")) failures.push("Admin tokens page uses nonexistent contract_address column");

const adminPayments = read("frontend/src/app/[locale]/admin/payments/page.tsx");
if (!adminPayments.includes('.from("payment_intents")')) failures.push("Admin payments page must query payment_intents");
for (const column of ["provider", "product_code", "amount_cents", "currency", "status", "paid_at"]) {
  if (!adminPayments.includes(column)) failures.push(`Admin payments page does not select ${column}`);
}

const adminLending = read("frontend/src/app/[locale]/admin/lending/page.tsx");
if (adminLending.includes("asset_symbol")) failures.push("Admin lending page uses nonexistent asset_symbol column");
for (const column of ["collateral_asset", "borrow_asset", "collateral_amount", "borrowed_amount", "health_factor"]) {
  if (!adminLending.includes(column)) failures.push(`Admin lending page does not select ${column}`);
}

const supabaseLib = read("frontend/src/lib/supabase.ts");
if (!supabaseLib.includes('.from("generated_tokens")')) failures.push("Supabase token helpers must use generated_tokens");
if (!supabaseLib.includes('onConflict: "tx_hash,chain_id"')) failures.push("Token helper must upsert by tx_hash,chain_id");
if (!supabaseLib.includes('onConflict: "wallet_address,borrow_asset,chain_id"')) failures.push("Lending helper must upsert by wallet_address,borrow_asset,chain_id");
if (!read("frontend/src/lib/lendingProtocols.ts").includes("morpho_blue")) failures.push("Lending protocol registry must include Morpho");
if (!read("frontend/src/lib/lendingProtocols.ts").includes("solana_sdk")) failures.push("Lending protocol registry must classify Solana SDK protocols");
if (!read("config/lending-protocols.json").includes("compound_v3")) failures.push("Seed config must include Compound III");
if (!read("scripts/seed-lending-protocol-routes.mjs").includes("SUPABASE_SERVICE_ROLE_KEY")) failures.push("Lending protocol seed script must use service role server-side");
if (!read("frontend/src/lib/server/supabaseAdmin.ts").includes("SUPABASE_SERVICE_ROLE_KEY")) failures.push("Payment helpers must use service role server-side");
if (!read("frontend/src/app/api/payments/webhooks/stripe/route.ts").includes("constructEvent")) failures.push("Stripe webhook must verify signatures");
if (!read("frontend/src/app/api/payments/webhooks/pagarme/route.ts").includes("verifyPagarmeWebhook")) failures.push("Pagar.me webhook must verify signatures");

const factoryPage = read("frontend/src/app/[locale]/factory/page.tsx");
for (const expected of ["ultimate", "fair_launch", "deflationary", "superchain", "createTokenAdvanced", "createFairLaunchTokenETH", "max_wallet_bps", "liquidity_eth", "lp_recipient"]) {
  if (!factoryPage.includes(expected)) failures.push(`Factory page is missing competitive token preset support: ${expected}`);
}

if (failures.length > 0) {
  console.error("Supabase contract checks failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Supabase contract checks passed.");
