import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const routesPath = resolve(process.cwd(), "config/lending-protocols.json");
const deploymentsDir = resolve(process.cwd(), "deployments");

const NETWORKS = {
  base: { chainId: 8453, label: "Base" },
  arbitrum: { chainId: 42161, label: "Arbitrum" },
  avalanche: { chainId: 43114, label: "Avalanche" },
  polygon: { chainId: 137, label: "Polygon" },
  optimism: { chainId: 10, label: "Optimism" },
  bsc: { chainId: 56, label: "BNB Chain" },
};

const EXTERNAL_PROTOCOLS = {
  spark: { name: "SparkLend", runtime: "evm", adapterKind: "aave_derived", riskTier: "medium" },
  compound_v3: { name: "Compound III", runtime: "evm", adapterKind: "compound_comet", riskTier: "medium" },
  morpho_blue: { name: "Morpho Blue", runtime: "evm", adapterKind: "morpho_blue", riskTier: "medium" },
};

if (!supabaseUrl || !/^https:\/\/.+\.supabase\.co$/i.test(supabaseUrl)) {
  console.error("SUPABASE_URL must be a Supabase HTTPS project URL.");
  process.exit(1);
}

if (!serviceRoleKey) {
  console.error("SUPABASE_SERVICE_ROLE_KEY is required.");
  process.exit(1);
}

const protocols = JSON.parse(readFileSync(routesPath, "utf8"));
const protocolNotes = {
  spark: "Adapter exists, but must be validated against current Spark Pool markets and non-custodial withdraw/borrow permissions before production.",
  radiant: "Research only. Aave-derived but requires protocol-specific market, oracle, risk, and security review before adapter enablement.",
  compound_v3: "Adapter exists, but Compound III Comet has isolated base-market semantics; production requires per-market mapping and fork tests.",
  morpho_blue: "Adapter exists, but Morpho Blue requires full market params per pair and position-flow tests before enabling production.",
  venus: "Planned. Requires cToken/VToken adapter implementation, BNB Chain market mapping, and fork tests.",
  benqi: "Planned. Requires cToken-style adapter implementation, Avalanche market mapping, and fork tests.",
  euler_v2: "Research only. EVK vault semantics require dedicated adapter and risk policy.",
  silo: "Research only. Isolated vault semantics require dedicated adapter and risk policy.",
  exactly: "Research only. Fixed-rate mechanics require dedicated adapter and risk policy.",
  gearbox: "Research only. Credit-account mechanics are high-complexity and require dedicated integration.",
  maker_sky: "Research only. Maker/Sky is not a standard lending pool adapter and requires custom CDP/Sky integration.",
  kamino: "Research only. Solana SDK integration requires a Solana-specific adapter/service, not EVM Solidity.",
  marginfi: "Research only. Solana SDK integration requires a Solana-specific adapter/service, not EVM Solidity.",
};
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
  notes: protocolNotes[protocol.id] ?? "Seeded from config/lending-protocols.json; configure per-chain adapter and market addresses before enabling production.",
  updated_at: new Date().toISOString(),
}));

for (const [network, details] of Object.entries(NETWORKS)) {
  let manifest = null;
  try {
    manifest = JSON.parse(readFileSync(resolve(deploymentsDir, `${network}.json`), "utf8"));
  } catch {
    continue;
  }

  if (!manifest?.lending?.proxy || !manifest?.lendingRouter?.proxy || !manifest?.lending?.provider) continue;

  const supportedAssets = Object.fromEntries(
    (manifest.lendingAssets ?? []).map((asset) => [asset.symbol, asset.asset]),
  );
  const aTokens = Object.fromEntries(
    (manifest.lendingAssets ?? []).map((asset) => [asset.symbol, asset.aToken]),
  );
  const variableDebtTokens = Object.fromEntries(
    (manifest.lendingAssets ?? []).map((asset) => [asset.symbol, asset.variableDebtToken]),
  );

  rows.push({
    protocol_id: "aave_v3",
    protocol_name: `Aave v3 ${details.label}`,
    runtime: "evm",
    adapter_kind: "aave_v3",
    chain_id: details.chainId,
    adapter_address: manifest.lending.proxy,
    market_address: manifest.lending.provider,
    config: {
      router_address: manifest.lendingRouter.proxy,
      supported_assets: supportedAssets,
      a_tokens: aTokens,
      variable_debt_tokens: variableDebtTokens,
    },
    status: "active",
    production_ready: true,
    risk_tier: "medium",
    notes: `Production ${details.label} route configured from deployed InsteadLendingPool/InsteadLendingRouter and Aave v3 address book.`,
    updated_at: new Date().toISOString(),
  });

  for (const [protocolId, protocol] of Object.entries(EXTERNAL_PROTOCOLS)) {
    const adapter = manifest.externalLendingAdapters?.[protocolId];
    const adapterConfig = manifest.externalLendingAdapterConfigs?.[protocolId];
    const markets = manifest.externalLendingMarkets?.[protocolId];
    if (!adapter?.address || !adapterConfig?.router || !markets) continue;
    const marketRows = Array.isArray(markets) ? markets : [markets];
    const supportedAssets = Object.fromEntries(
      marketRows.map((market) => [market.symbol, market.asset]).filter((entry) => entry[0] && entry[1]),
    );

    rows.push({
      protocol_id: protocolId,
      protocol_name: `${protocol.name} ${details.label}`,
      runtime: protocol.runtime,
      adapter_kind: protocol.adapterKind,
      chain_id: details.chainId,
      adapter_address: adapter.address,
      market_address: adapter.market ?? marketRows[0]?.comet ?? null,
      config: {
        router_address: adapterConfig.router,
        supported_assets: supportedAssets,
        markets,
      },
      status: "active",
      production_ready: true,
      risk_tier: protocol.riskTier,
      notes: `Production ${details.label} route configured from deployed ${protocol.name} adapter and protocol market mapping.`,
      updated_at: new Date().toISOString(),
    });
  }
}

const baseUrl = supabaseUrl.replace(/\/$/, "");
const headers = {
  "Content-Type": "application/json",
  apikey: serviceRoleKey,
  authorization: `Bearer ${serviceRoleKey}`,
};

const cleanupResponse = await fetch(
  `${baseUrl}/rest/v1/lending_protocol_routes?chain_id=is.null&adapter_address=is.null&market_address=is.null`,
  {
    method: "DELETE",
    headers,
  },
);

if (!cleanupResponse.ok) {
  console.error("Failed to clean placeholder lending protocol routes:");
  console.error(await cleanupResponse.text());
  process.exit(1);
}

const response = await fetch(`${baseUrl}/rest/v1/lending_protocol_routes?on_conflict=protocol_id,chain_id,adapter_address,market_address`, {
  method: "POST",
  headers: {
    ...headers,
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
