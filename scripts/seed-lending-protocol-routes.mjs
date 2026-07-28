import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const routesPath = resolve(process.cwd(), "config/lending-protocols.json");

if (!supabaseUrl || !/^https:\/\/.+\.supabase\.co$/i.test(supabaseUrl)) {
  console.error("SUPABASE_URL must be a Supabase HTTPS project URL.");
  process.exit(1);
}

if (!serviceRoleKey) {
  console.error("SUPABASE_SERVICE_ROLE_KEY is required.");
  process.exit(1);
}

const protocols = JSON.parse(readFileSync(routesPath, "utf8"));
const rows = protocols.map((protocol) => ({
  protocol_id: protocol.id,
  protocol_name: protocol.name,
  runtime: protocol.runtime,
  adapter_kind: protocol.adapterKind,
  chain_id: null,
  adapter_address: null,
  market_address: null,
  config: {},
  status: protocol.status,
  production_ready: protocol.productionReady,
  risk_tier: protocol.riskTier,
  notes: "Seeded from config/lending-protocols.json; configure per-chain adapter and market addresses before enabling production.",
  updated_at: new Date().toISOString(),
}));

if (
  process.env.DEPLOYMENT_NETWORK === "base" &&
  process.env.NEXT_PUBLIC_LENDING_POOL_ADDRESS &&
  process.env.NEXT_PUBLIC_LENDING_ROUTER_ADDRESS &&
  process.env.AAVE_POOL_ADDRESSES_PROVIDER
) {
  rows.push({
    protocol_id: "aave_v3",
    protocol_name: "Aave v3 Base",
    runtime: "evm",
    adapter_kind: "aave_v3",
    chain_id: 8453,
    adapter_address: process.env.NEXT_PUBLIC_LENDING_POOL_ADDRESS,
    market_address: process.env.AAVE_POOL_ADDRESSES_PROVIDER,
    config: {
      router_address: process.env.NEXT_PUBLIC_LENDING_ROUTER_ADDRESS,
      supported_assets: JSON.parse(process.env.AAVE_SUPPORTED_ASSETS_JSON ?? "{}"),
      a_tokens: JSON.parse(process.env.AAVE_ATOKENS_JSON ?? "{}"),
      variable_debt_tokens: JSON.parse(process.env.AAVE_VARIABLE_DEBT_TOKENS_JSON ?? "{}"),
    },
    status: "active",
    production_ready: true,
    risk_tier: "medium",
    notes: "Production Base route configured from deployed InsteadLendingPool/InsteadLendingRouter and Aave v3 Base address book.",
    updated_at: new Date().toISOString(),
  });
}

const response = await fetch(`${supabaseUrl.replace(/\/$/, "")}/rest/v1/lending_protocol_routes?on_conflict=protocol_id,chain_id,adapter_address,market_address`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    apikey: serviceRoleKey,
    authorization: `Bearer ${serviceRoleKey}`,
    Prefer: "resolution=merge-duplicates,return=minimal",
  },
  body: JSON.stringify(rows),
});

if (!response.ok) {
  console.error("Failed to seed lending protocol routes:");
  console.error(await response.text());
  process.exit(1);
}

console.log(`Seeded ${rows.length} lending protocol routes.`);
