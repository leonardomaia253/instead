import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const failures = [];

const catalog = readFileSync(resolve(root, "frontend/src/lib/revenueCatalog.ts"), "utf8");
const migration = readFileSync(resolve(root, "supabase/migrations/019_revenue_sources.sql"), "utf8");
const payments = readFileSync(resolve(root, "frontend/src/lib/server/payments.ts"), "utf8");
const adminPage = readFileSync(resolve(root, "frontend/src/app/[locale]/admin/revenue/page.tsx"), "utf8");
const monetizationMigration = readFileSync(resolve(root, "supabase/migrations/20260728203609_monetization_product_flows.sql"), "utf8");

const sourceMatches = [...catalog.matchAll(/sourceCode:\s*"([^"]+)"/g)].map((match) => match[1]);
const uniqueSources = new Set(sourceMatches);

if (sourceMatches.length !== uniqueSources.size) failures.push("Revenue catalog contains duplicated sourceCode values");
if (uniqueSources.size < 14) failures.push(`Revenue catalog must contain at least 14 sources; found ${uniqueSources.size}`);
if (!catalog.includes("lending_borrow_fee") || !catalog.includes("takeRateBps: 50")) failures.push("Lending borrow fee must be represented as a 50 bps revenue source");
if (!catalog.includes("multi_protocol_routing_fee")) failures.push("Multi-protocol routing fee must be represented");
if (!migration.includes("CREATE TABLE IF NOT EXISTS public.revenue_sources")) failures.push("revenue_sources migration is missing");
if (!migration.includes("INSERT INTO public.platform_prices")) failures.push("Fiat revenue products must be seeded into platform_prices");
if (!payments.includes("FIAT_REVENUE_SOURCES")) failures.push("Checkout fallback must come from revenue catalog");
if (payments.includes('vertical !== "token_factory"')) failures.push("Checkout must not be restricted to token factory only");
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
