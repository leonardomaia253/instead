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

const adminLending = read("frontend/src/app/[locale]/admin/lending/page.tsx");
if (adminLending.includes("asset_symbol")) failures.push("Admin lending page uses nonexistent asset_symbol column");
for (const column of ["collateral_asset", "borrow_asset", "collateral_amount", "borrowed_amount", "health_factor"]) {
  if (!adminLending.includes(column)) failures.push(`Admin lending page does not select ${column}`);
}

const supabaseLib = read("frontend/src/lib/supabase.ts");
if (!supabaseLib.includes('.from("generated_tokens")')) failures.push("Supabase token helpers must use generated_tokens");
if (!supabaseLib.includes('onConflict: "tx_hash,chain_id"')) failures.push("Token helper must upsert by tx_hash,chain_id");
if (!supabaseLib.includes('onConflict: "wallet_address,borrow_asset,chain_id"')) failures.push("Lending helper must upsert by wallet_address,borrow_asset,chain_id");

if (failures.length > 0) {
  console.error("Supabase contract checks failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Supabase contract checks passed.");
