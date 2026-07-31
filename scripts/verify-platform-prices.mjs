import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { mergeEnv } from "./lib/supabase-env.mjs";

const root = process.cwd();
const env = mergeEnv(process.env, readLocalEnv());

const expectedPrices = {
  token_deploy_basic: [1900, 9900],
  token_deploy_premium: [4900, 19900],
  token_fair_launch_assisted: [15900, 79900],
  lending_pro_subscription: [2900, 14900],
  liquidation_alerts_premium: [900, 4900],
  deleverage_assisted: [5900, 74900],
  leverage_strategy_execution: [9900, 49900],
  auto_rebalance_protection: [7900, 39900],
  wealth_dashboard_subscription: [2900, 14900],
  white_glove_lending: [29900, 149900],
  b2b_lending_widget_api: [19900, 99900],
  risk_shield_membership: [3900, 19900],
};

const expectedTakeRates = {
  lending_borrow_fee: 150,
  multi_protocol_routing_fee: 120,
};

function readLocalEnv() {
  const path = resolve(root, "frontend/.env.local");
  try {
    const parsed = {};
    for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
      if (!line || line.trim().startsWith("#") || !line.includes("=")) continue;
      const [key, ...value] = line.split("=");
      parsed[key.trim()] = value.join("=");
    }
    return parsed;
  } catch {
    return {};
  }
}

function projectRef(url) {
  return url?.match(/^https:\/\/([^.]+)\.supabase\.co/)?.[1] ?? null;
}

async function getRows(table, select) {
  const url = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase URL and service role key are required");
  const res = await fetch(`${url.replace(/\/$/, "")}/rest/v1/${table}?select=${select}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${table} returned ${res.status}: ${JSON.stringify(body)}`);
  return body;
}

const urlRef = projectRef(env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL);
if (env.SUPABASE_PROJECT_REF && urlRef && env.SUPABASE_PROJECT_REF !== urlRef) {
  throw new Error(`Supabase URL ref ${urlRef} does not match SUPABASE_PROJECT_REF ${env.SUPABASE_PROJECT_REF}`);
}

const priceRows = await getRows("platform_prices", "product_code,amount_usd_cents,amount_brl_cents,is_active");
const priceMap = new Map(priceRows.map((row) => [row.product_code, row]));
const failures = [];

for (const [code, [usd, brl]] of Object.entries(expectedPrices)) {
  const row = priceMap.get(code);
  if (!row) failures.push(`platform_prices missing ${code}`);
  else {
    if (row.amount_usd_cents !== usd) failures.push(`${code} USD expected ${usd}, got ${row.amount_usd_cents}`);
    if (row.amount_brl_cents !== brl) failures.push(`${code} BRL expected ${brl}, got ${row.amount_brl_cents}`);
    if (row.is_active !== true) failures.push(`${code} must be active`);
  }
}

const sourceRows = await getRows("revenue_sources", "source_code,amount_usd_cents,amount_brl_cents,take_rate_bps");
const sourceMap = new Map(sourceRows.map((row) => [row.source_code, row]));
if (sourceRows.length < 14) failures.push(`revenue_sources expected at least 14 rows, got ${sourceRows.length}`);

for (const [code, bps] of Object.entries(expectedTakeRates)) {
  const row = sourceMap.get(code);
  if (!row) failures.push(`revenue_sources missing ${code}`);
  else if (row.take_rate_bps !== bps) failures.push(`${code} take rate expected ${bps}, got ${row.take_rate_bps}`);
}

for (const [code, [usd, brl]] of Object.entries(expectedPrices)) {
  const row = sourceMap.get(code);
  if (!row) failures.push(`revenue_sources missing ${code}`);
  else {
    if (row.amount_usd_cents !== usd) failures.push(`revenue_sources ${code} USD expected ${usd}, got ${row.amount_usd_cents}`);
    if (row.amount_brl_cents !== brl) failures.push(`revenue_sources ${code} BRL expected ${brl}, got ${row.amount_brl_cents}`);
  }
}

if (failures.length > 0) {
  console.error("Platform price verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Platform price verification passed for ${urlRef}.`);
