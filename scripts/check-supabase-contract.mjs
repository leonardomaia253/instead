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
  "revenue_sources",
  "user_revenue_entitlements",
  "lending_automation_intents",
  "b2b_widget_clients",
  "lending_alert_events",
  "lending_risk_preferences",
  "b2b_widget_events",
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
if (!read("frontend/src/lib/revenueCatalog.ts").includes("REVENUE_SOURCE_COUNT")) failures.push("Revenue catalog must expose canonical revenue source count");
if (!read("frontend/src/app/[locale]/admin/revenue/page.tsx").includes("revenue_sources")) failures.push("Admin revenue page must expose revenue_sources");
if (!read("frontend/src/lib/server/payments.ts").includes("FIAT_REVENUE_SOURCES")) failures.push("Payment helpers must support monetized revenue catalog products");
if (!read("frontend/src/lib/server/payments.ts").includes("user_revenue_entitlements")) failures.push("Paid premium products must create user entitlements");
if (!read("frontend/src/app/api/lending/automation-intents/route.ts").includes("lending_automation_intents")) failures.push("Lending premium automation intents API is missing");
if (!read("frontend/src/app/api/b2b/widget/route.ts").includes("b2b_widget_clients")) failures.push("B2B widget API is missing");
if (!read("frontend/src/app/api/admin/b2b-clients/route.ts").includes("apiKey")) failures.push("Admin B2B client provisioning API is missing");
if (!read("frontend/src/app/api/revenue/me/route.ts").includes("user_revenue_entitlements")) failures.push("User revenue status API is missing");
const loginPage = read("frontend/src/app/[locale]/login/page.tsx");
for (const expected of ['getSupabaseFunctionUrl("siwe-auth")', "signMessageAsync", "setWalletAccessToken"]) {
  if (!loginPage.includes(expected)) failures.push(`Wallet login must establish signed SIWE wallet session: ${expected}`);
}
if (!read("frontend/src/app/api/auth/session/route.ts").includes("httpOnly: true")) failures.push("Wallet session API must set an HttpOnly cookie");
if (!read("frontend/src/app/api/auth/session/route.ts").includes("requireSameOrigin")) failures.push("Wallet session API must enforce same-origin requests");
if (!read("frontend/src/lib/server/csrf.ts").includes("if (!origin) return NextResponse.json")) failures.push("Same-origin guard must reject missing Origin headers for cookie-auth mutations");
for (const route of [
  "frontend/src/app/api/admin/prices/route.ts",
  "frontend/src/app/api/admin/b2b-clients/route.ts",
  "frontend/src/app/api/lending/automation-intents/route.ts",
]) {
  if (!read(route).includes("requireSameOrigin")) failures.push(`${route} must enforce same-origin requests`);
  if (!read(route).includes("rateLimit")) failures.push(`${route} must rate-limit authenticated mutations`);
  if (!read(route).includes("readLimitedJson")) failures.push(`${route} must limit JSON request payloads`);
}
if (!read("frontend/src/app/api/auth/wallet-profile/route.ts").includes("supabase.auth.getUser")) failures.push("Wallet profile API must validate the Supabase session");
for (const route of [
  "frontend/src/app/api/admin/prices/route.ts",
  "frontend/src/app/api/admin/b2b-clients/route.ts",
]) {
  if (!read(route).includes("insertAdminAuditLog")) failures.push(`${route} must write admin audit logs for mutations`);
}
if (read("frontend/src/app/api/admin/prices/route.ts").includes("error.message")) {
  failures.push("Admin prices API must not expose raw Supabase error messages");
}
if (!read("supabase/functions/lending-automation/index.ts").includes("lending_alert_events")) failures.push("Lending automation function must create risk alerts");
if (!read("supabase/functions/lending-automation/index.ts").includes("required_user_signature")) failures.push("Lending automation must preserve user-signature execution boundary");
if (!read("frontend/src/app/[locale]/lending/page.tsx").includes("Lending Pro Stack")) failures.push("Lending page must expose premium revenue products");
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
