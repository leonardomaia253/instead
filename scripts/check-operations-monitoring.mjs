import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const failures = [];

function read(path) {
  return readFileSync(resolve(root, path), "utf8");
}

for (const [path, forbidden] of [
  ["scripts/monitor-balances.mjs", "env[network.rpcEnv] || network.fallbackRpc"],
  ["scripts/monitor-balances.mjs", "env[SOLANA_NETWORK.rpcEnv] || SOLANA_NETWORK.fallbackRpc"],
  ["frontend/src/app/api/admin/operations/route.ts", "process.env[network.rpcEnv] || network.fallbackRpc"],
  ["supabase/functions/balance-monitor/index.ts", "Deno.env.get(network.rpcEnv) || network.fallbackRpc"],
]) {
  const source = read(path);
  if (source.includes(forbidden)) failures.push(`${path} must not silently fall back to public RPCs`);
}

for (const path of [
  "scripts/monitor-balances.mjs",
  "frontend/src/app/api/admin/operations/route.ts",
  "supabase/functions/balance-monitor/index.ts",
]) {
  const source = read(path);
  if (!source.includes("ALLOW_PUBLIC_RPC_FALLBACK")) {
    failures.push(`${path} must require ALLOW_PUBLIC_RPC_FALLBACK=true before using public RPC fallback`);
  }
}

if (failures.length > 0) {
  console.error("Operations monitoring checks failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Operations monitoring checks passed.");
