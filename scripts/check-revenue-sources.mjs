import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const failures = [];

function read(path) {
  return readFileSync(resolve(root, path), "utf8");
}

const catalog = read("frontend/src/lib/revenueCatalog.ts");
const migration = read("supabase/migrations/019_revenue_sources.sql");
const payments = read("frontend/src/lib/server/payments.ts");
const checkoutRoute = read("frontend/src/app/api/payments/checkout/route.ts");
const lendingAutomationRoute = read("frontend/src/app/api/lending/automation-intents/route.ts");
const adminPage = read("frontend/src/app/[locale]/admin/revenue/page.tsx");
const monetizationMigration = read("supabase/migrations/20260728203609_monetization_product_flows.sql");

const sourceMatches = [...catalog.matchAll(/sourceCode:\s*"([^"]+)"/g)].map((match) => match[1]);
const uniqueSources = new Set(sourceMatches);

if (sourceMatches.length !== uniqueSources.size) failures.push("Revenue catalog contains duplicated sourceCode values");
if (uniqueSources.size < 14) failures.push(`Revenue catalog must contain at least 14 sources; found ${uniqueSources.size}`);
if (!catalog.includes("lending_borrow_fee") || !catalog.includes("takeRateBps: 150")) failures.push("Lending borrow fee must be represented as a 150 bps revenue source");
if (!catalog.includes("multi_protocol_routing_fee")) failures.push("Multi-protocol routing fee must be represented");
if (!migration.includes("CREATE TABLE IF NOT EXISTS public.revenue_sources")) failures.push("revenue_sources migration is missing");
if (!migration.includes("INSERT INTO public.platform_prices")) failures.push("Fiat revenue products must be seeded into platform_prices");
if (!payments.includes("FIAT_REVENUE_SOURCES")) failures.push("Checkout fallback must come from revenue catalog");
if (payments.includes('vertical !== "token_factory"')) failures.push("Checkout must not be restricted to token factory only");
if (!checkoutRoute.includes("requireSameOrigin")) failures.push("Checkout must enforce same-origin requests");
if (!checkoutRoute.includes("verifyWalletSession")) failures.push("Checkout must bind walletAddress to the signed wallet session");
if (!payments.includes("updateUnpaidPaymentIntentById")) failures.push("Payment helpers must protect paid intents from cancel/fail webhook races");
if (!payments.includes('payment.status === "paid" && payment.provider_reference !== input.providerReference')) {
  failures.push("Payment paid webhook handling must be idempotent for repeated provider events");
}
if (!read("frontend/src/app/api/payments/webhooks/stripe/route.ts").includes("readLimitedText")) failures.push("Stripe webhook must cap raw request body size");
if (!read("frontend/src/app/api/payments/webhooks/pagarme/route.ts").includes("readLimitedText")) failures.push("Pagar.me webhook must cap raw request body size");
if (lendingAutomationRoute.includes("requiresPayment === false")) failures.push("Lending automation must not trust client-provided payment bypass flags");
if (!lendingAutomationRoute.includes("user_revenue_entitlements")) failures.push("Lending automation must verify active paid entitlement before queueing premium work");
if (!adminPage.includes("REVENUE_SOURCE_COUNT")) failures.push("Admin page must display canonical revenue count");
for (const table of ["user_revenue_entitlements", "lending_automation_intents", "b2b_widget_clients"]) {
  if (!monetizationMigration.includes(`public.${table}`)) failures.push(`Monetization migration must create ${table}`);
}

if (failures.length > 0) {
  console.error("Revenue source checks failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Revenue source checks passed. Sources counted: ${uniqueSources.size}.`);
