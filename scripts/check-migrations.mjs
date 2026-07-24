import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const migrationsDir = resolve(process.cwd(), "supabase/migrations");
const failures = [];

if (!existsSync(migrationsDir)) {
  console.error("supabase/migrations is missing");
  process.exit(1);
}

const files = readdirSync(migrationsDir).filter((file) => file.endsWith(".sql")).sort();
const corpus = files.map((file) => readFileSync(resolve(migrationsDir, file), "utf8")).join("\n");
const normalized = corpus.toLowerCase();

const requiredFiles = [
  "001_initial_schema.sql",
  "002_audits_and_staking.sql",
  "003_lending_positions.sql",
  "004_production_rls_hardening.sql",
  "005_siwe_auth_nonces.sql",
  "006_observability_events.sql",
  "007_telegram_bot_intents.sql",
  "008_admin_read_policies.sql",
  "009_token_factory_presets.sql",
  "010_fair_launch_liquidity.sql",
  "011_lending_protocol_registry.sql",
  "012_fiat_payment_intents.sql",
];

for (const file of requiredFiles) {
  if (!files.includes(file)) failures.push(`${file} is missing`);
}

if (normalized.includes("auth.role()")) {
  failures.push("migrations must not use deprecated auth.role(); use policy TO clauses instead");
}

const sensitiveTables = [
  "users",
  "generated_tokens",
  "audits",
  "lending_positions",
  "staking_pools",
  "siwe_nonces",
  "observability_events",
  "operation_reconciliation_queue",
  "telegram_bot_intents",
  "lending_protocol_routes",
  "payment_intents",
];

for (const table of sensitiveTables) {
  if (!normalized.includes(`create table if not exists public.${table}`) && !normalized.includes(`create table public.${table}`)) {
    failures.push(`public.${table} table is not created`);
  }
  if (!normalized.includes(`alter table public.${table} enable row level security`)) {
    failures.push(`public.${table} does not enable RLS`);
  }
}

const requiredPolicyFragments = [
  "usuarios leem suas proprias auditorias",
  "usuarios leem suas proprias posicoes",
  "usuarios inserem suas proprias auditorias",
  "usuarios atualizam suas proprias posicoes",
  "service role manages reconciliation operations",
  "service role manages telegram bot intents",
  "service role reads observability",
  "admins read lending positions",
  "admins read audits",
  "admins read reconciliation operations",
  "admins read observability events",
  "generated_tokens_token_template_check",
  "generated_tokens_max_wallet_bps_check",
  "generated_tokens_lp_lock_status_check",
  "admins read lending protocol routes",
  "service role manages lending protocol routes",
  "users read their own payment intents",
  "admins read payment intents",
  "service role manages payment intents",
];

for (const fragment of requiredPolicyFragments) {
  if (!normalized.includes(fragment)) failures.push(`policy fragment missing: ${fragment}`);
}

const requiredIndexes = [
  "idx_generated_tokens_tx_hash_chain_unique",
  "idx_audits_operation_id_unique",
  "idx_lending_positions_last_tx_hash_unique",
  "idx_operation_reconciliation_queue_status_next",
  "idx_telegram_bot_intents_user_created",
  "idx_generated_tokens_template_created",
  "idx_generated_tokens_lp_recipient",
  "idx_lending_protocol_routes_status",
  "idx_lending_protocol_routes_protocol_chain",
  "idx_payment_intents_provider_reference_unique",
  "idx_payment_intents_wallet_created",
  "idx_payment_intents_status_created",
];

for (const index of requiredIndexes) {
  if (!normalized.includes(index.toLowerCase())) failures.push(`index missing: ${index}`);
}

if (failures.length > 0) {
  console.error("Migration checks failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Migration checks passed.");
