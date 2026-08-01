import { existsSync } from "node:fs";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { mergeEnv, parseEnvFile, supabaseEnvDiagnostics } from "./lib/supabase-env.mjs";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const frontendEnvPath = resolve(root, "frontend/.env.local");

const fileEnv = parseEnvFile(frontendEnvPath);
const env = mergeEnv(process.env, fileEnv);
const target = env.PRODUCTION_TARGET ?? "all";
const failures = [];
const warnings = [];
const supabaseDiagnostics = supabaseEnvDiagnostics({ fileEnv, processEnv: process.env, mergedEnv: env });
failures.push(...supabaseDiagnostics.failures);
warnings.push(...supabaseDiagnostics.warnings);

function requireEnv(name, options = {}) {
  const value = env[name];
  if (!value || value.includes("your_") || value.includes("TODO") || value === "changeme") {
    failures.push(`${name} is required`);
    return "";
  }
  if (options.address && !/^0x[a-fA-F0-9]{40}$/.test(value)) {
    failures.push(`${name} must be an EVM address`);
  }
  return value;
}

function warnIfMissing(name) {
  if (!env[name]) warnings.push(`${name} is not configured`);
}

function requireHttpsUrl(name) {
  const value = requireEnv(name);
  if (value && !/^https:\/\/[^\s]+$/i.test(value)) failures.push(`${name} must be an HTTPS URL`);
  return value;
}

function requireMinLength(name, minLength) {
  const value = requireEnv(name);
  if (value && value.length < minLength) failures.push(`${name} must be at least ${minLength} characters`);
  return value;
}

function rejectPattern(name, pattern, message) {
  const value = env[name];
  if (value && pattern.test(value)) failures.push(`${name} ${message}`);
}

function requireJsonObject(name) {
  const value = requireEnv(name);
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      failures.push(`${name} must be a JSON object`);
      return null;
    }
    return parsed;
  } catch {
    failures.push(`${name} must be valid JSON`);
    return null;
  }
}

function requireDistributedRateLimitEvidence(value) {
  if (!value) {
    failures.push("DISTRIBUTED_RATE_LIMIT_PROVIDER is required");
    return;
  }
  if (value === "vercel-waf:instead-prod-api-abuse-v1") {
    const policyPath = resolve(root, "config/vercel-waf-rate-limit-policy.json");
    if (!existsSync(policyPath)) {
      failures.push("config/vercel-waf-rate-limit-policy.json is required for Vercel WAF rate-limit evidence");
      return;
    }
    try {
      const policy = JSON.parse(readFileSync(policyPath, "utf8"));
      if (policy.gateValue !== value) failures.push("Vercel WAF policy gateValue must match DISTRIBUTED_RATE_LIMIT_PROVIDER");
      if (!Array.isArray(policy.rules) || policy.rules.length < 3) failures.push("Vercel WAF policy must define API, webhook and AI/function rules");
    } catch {
      failures.push("config/vercel-waf-rate-limit-policy.json must be valid JSON");
    }
  }
}

const requiredEdgeFunctions = ["siwe-auth", "token-ai", "lending-ai", "telegram-bot", "balance-monitor", "lending-automation"];
for (const functionName of requiredEdgeFunctions) {
  const indexPath = resolve(root, `supabase/functions/${functionName}/index.ts`);
  if (!existsSync(indexPath)) failures.push(`Supabase function ${functionName} is missing`);
}

for (const requiredFile of [
  "RUNBOOK.md",
  ".env.production.example",
  "scripts/deploy-token-factory.ts",
  "scripts/deploy-lending.ts",
  "scripts/deploy-lending-router.ts",
  "scripts/configure-lending-assets.ts",
  "scripts/check-contract-security.mjs",
  "scripts/transfer-ownership.ts",
  "scripts/verify-ownership.mjs",
  "scripts/verify-deployment-manifest.mjs",
  "scripts/smoke-test.mjs",
  "scripts/local-smoke-test.mjs",
  "scripts/check-migrations.mjs",
  "scripts/check-supabase-contract.mjs",
  "scripts/seed-lending-protocol-routes.mjs",
  "scripts/check-secrets.mjs",
  "scripts/check-workspace-hygiene.mjs",
  "scripts/check-api-security.mjs",
  "scripts/check-edge-functions.mjs",
  "scripts/deploy-edge-functions.mjs",
  "scripts/diagnose-supabase-env.mjs",
  "scripts/lib/supabase-env.mjs",
  "scripts/check-performance-budget.mjs",
  "scripts/local-production-audit.mjs",
  "scripts/set-telegram-webhook.mjs",
  "scripts/monitor-balances.mjs",
  "frontend/src/lib/revenueCatalog.ts",
  "frontend/src/app/[locale]/admin/revenue/page.tsx",
  "supabase/migrations/019_revenue_sources.sql",
  "supabase/migrations/20260728203609_monetization_product_flows.sql",
  "frontend/src/app/api/lending/automation-intents/route.ts",
  "frontend/src/app/api/b2b/widget/route.ts",
  "frontend/src/app/api/admin/b2b-clients/route.ts",
  "frontend/src/app/api/revenue/me/route.ts",
  "frontend/src/app/api/compliance/verification/session/route.ts",
  "frontend/src/app/api/compliance/verification/status/route.ts",
  "frontend/src/app/api/compliance/verification/webhooks/didit/route.ts",
  "frontend/src/app/api/auth/wallet-profile/route.ts",
  "frontend/src/app/api/auth/session/route.ts",
  "frontend/src/lib/server/didit.ts",
  "frontend/src/lib/server/csrf.ts",
  "frontend/src/lib/server/responses.ts",
  "frontend/next.config.js",
  "supabase/functions/lending-automation/index.ts",
  "supabase/migrations/20260728214740_lending_automation_engine.sql",
]) {
  if (!existsSync(resolve(root, requiredFile))) failures.push(`${requiredFile} is missing`);
}

requireEnv("NEXT_PUBLIC_SUPABASE_URL");
requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
requireEnv("NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID");

warnIfMissing("SUPABASE_SERVICE_ROLE_KEY");
warnIfMissing("APP_ORIGIN");
warnIfMissing("UPTIME_STATUS_URL");
warnIfMissing("TELEGRAM_ALERT_CHAT_ID");
warnIfMissing("SOLANA_RPC_URL");
warnIfMissing("BALANCE_MONITOR_SECRET");

if (env.REQUIRE_TELEGRAM_BOT === "true") {
  warnIfMissing("TELEGRAM_BOT_TOKEN");
  warnIfMissing("TELEGRAM_WEBHOOK_SECRET");
}
if (env.REQUIRE_FIAT_PAYMENTS === "true") {
  warnIfMissing("STRIPE_SECRET_KEY");
  warnIfMissing("STRIPE_WEBHOOK_SECRET");
  warnIfMissing("PAGARME_SECRET_KEY");
  warnIfMissing("PAGARME_WEBHOOK_SECRET");
}
if (env.REQUIRE_KYC === "true" || env.REQUIRE_FIAT_PAYMENTS === "true") {
  warnIfMissing("DIDIT_API_KEY");
  warnIfMissing("DIDIT_WEBHOOK_SECRET");
  warnIfMissing("DIDIT_KYC_WORKFLOW_ID");
}
if (env.REQUIRE_MONITORING === "true") {
  warnIfMissing("SENTRY_DSN");
}

const exposesPublicAbuseSurface = [
  env.REQUIRE_FIAT_PAYMENTS === "true",
  env.REQUIRE_TELEGRAM_BOT === "true",
  env.REQUIRE_MONITORING === "true",
  Boolean(env.GEMINI_API_KEY),
].some(Boolean);

if (env.REQUIRE_DISTRIBUTED_RATE_LIMIT === "true") {
  requireDistributedRateLimitEvidence(env.DISTRIBUTED_RATE_LIMIT_PROVIDER);
} else if (exposesPublicAbuseSurface) {
  failures.push("REQUIRE_DISTRIBUTED_RATE_LIMIT must be true when paid, bot, monitoring or AI endpoints are enabled for production");
}

if (env.REQUIRE_MONITORING === "true") {
  requireEnv("SENTRY_DSN");
  requireEnv("UPTIME_STATUS_URL");
  requireEnv("TELEGRAM_BOT_TOKEN");
  requireEnv("TELEGRAM_ALERT_CHAT_ID");
}

if (env.REQUIRE_SOLANA_PRODUCTION === "true") {
  requireHttpsUrl("SOLANA_RPC_URL");
  requireEnv("NEXT_PUBLIC_SOLANA_FACTORY_PROGRAM_ID");
  if (env.NEXT_PUBLIC_SOLANA_FACTORY_PROGRAM_ID && !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(env.NEXT_PUBLIC_SOLANA_FACTORY_PROGRAM_ID)) {
    failures.push("NEXT_PUBLIC_SOLANA_FACTORY_PROGRAM_ID must be a Solana base58 public key");
  }
} else if (target === "all" || target === "solana") {
  warnings.push("Solana production gate is disabled; Solana launch remains blocked");
}

if (env.REQUIRE_EVM_PRODUCTION_GATE === "true") {
  requireEnv("DEPLOYMENT_NETWORK");
  requireHttpsUrl("DEPLOYMENT_RPC_URL");
  requireEnv("PRODUCTION_MULTISIG_ADDRESS", { address: true });
  if (env.REQUIRE_EXTERNAL_AUDIT !== "true") warnings.push("REQUIRE_EXTERNAL_AUDIT is not enabled");
}

if (env.REQUIRE_TELEGRAM_BOT === "true") {
  requireEnv("TELEGRAM_BOT_TOKEN");
  requireMinLength("TELEGRAM_WEBHOOK_SECRET", 32);
  requireHttpsUrl("TELEGRAM_WEBHOOK_URL");
  requireEnv("SUPABASE_URL");
  requireEnv("SUPABASE_SERVICE_ROLE_KEY");
}

if (env.REQUIRE_FIAT_PAYMENTS === "true") {
  requireHttpsUrl("APP_ORIGIN");
  requireEnv("SUPABASE_URL");
  requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  requireEnv("DIDIT_API_KEY");
  requireMinLength("DIDIT_WEBHOOK_SECRET", 32);
  requireEnv("DIDIT_KYC_WORKFLOW_ID");
  requireEnv("STRIPE_SECRET_KEY");
  requireEnv("STRIPE_WEBHOOK_SECRET");
  requireEnv("PAGARME_SECRET_KEY");
  requireMinLength("PAGARME_WEBHOOK_SECRET", 32);
  rejectPattern("APP_ORIGIN", /^https:\/\/localhost\b|^http:\/\//i, "must be a public HTTPS production origin");
  rejectPattern("STRIPE_SECRET_KEY", /^sk_test_|dummy|changeme/i, "must be a live production key when fiat payments are required");
  rejectPattern("PAGARME_SECRET_KEY", /dummy|changeme/i, "must be a real production key when fiat payments are required");
}

if (env.REQUIRE_KYC === "true") {
  requireHttpsUrl("APP_ORIGIN");
  requireEnv("SUPABASE_URL");
  requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  requireEnv("DIDIT_API_KEY");
  requireMinLength("DIDIT_WEBHOOK_SECRET", 32);
  requireEnv("DIDIT_KYC_WORKFLOW_ID");
  rejectPattern("DIDIT_API_KEY", /dummy|changeme/i, "must be a real Didit API key when KYC is required");
}

const factoryVars = [
  "NEXT_PUBLIC_FACTORY_ARBITRUM",
  "NEXT_PUBLIC_FACTORY_POLYGON",
  "NEXT_PUBLIC_FACTORY_BSC",
  "NEXT_PUBLIC_FACTORY_BASE",
  "NEXT_PUBLIC_FACTORY_OPTIMISM",
  "NEXT_PUBLIC_FACTORY_MAINNET",
  "NEXT_PUBLIC_FACTORY_AVALANCHE",
];

const configuredFactories = factoryVars.filter((name) => env[name]);
if (configuredFactories.length === 0) {
  failures.push("At least one NEXT_PUBLIC_FACTORY_* address is required for production");
}
for (const name of configuredFactories) {
  requireEnv(name, { address: true });
}
if (configuredFactories.length > 0) {
  requireEnv("DEX_ROUTER_ADDRESS", { address: true });
}

if (env.REQUIRE_DEPLOYMENT_MANIFEST === "true") {
  const networkName = requireEnv("DEPLOYMENT_NETWORK");
  requireEnv("DEX_ROUTER_ADDRESS", { address: true });
  const manifestPath = resolve(root, "deployments", `${networkName}.json`);
  if (!existsSync(manifestPath)) {
    failures.push(`deployments/${networkName}.json is required`);
  }
}

if (env.REQUIRE_OWNERSHIP_VERIFICATION === "true") {
  requireEnv("PRODUCTION_MULTISIG_ADDRESS", { address: true });
  requireEnv("DEPLOYMENT_NETWORK");
  requireEnv("DEPLOYMENT_RPC_URL");
}

if (env.NEXT_PUBLIC_ENABLE_PRODUCTION_LENDING === "true") {
  requireEnv("NEXT_PUBLIC_LENDING_POOL_ADDRESS", { address: true });
  if (env.REQUIRE_MULTI_PROTOCOL_LENDING === "true") {
    requireEnv("NEXT_PUBLIC_LENDING_ROUTER_ADDRESS", { address: true });
  } else {
    warnings.push("REQUIRE_MULTI_PROTOCOL_LENDING is not enabled; non-Aave adapters must remain disabled");
  }
  const requiredLendingConfig = [
    "PRODUCTION_MULTISIG_ADDRESS",
    "INCIDENT_PAUSE_RUNBOOK_URL",
  ];
  for (const name of requiredLendingConfig) requireEnv(name);
  for (const name of ["AAVE_SUPPORTED_ASSETS_JSON", "AAVE_ATOKENS_JSON", "AAVE_VARIABLE_DEBT_TOKENS_JSON"]) {
    const parsed = requireJsonObject(name);
    if (parsed) {
      for (const [symbol, address] of Object.entries(parsed)) {
        if (!/^0x[a-fA-F0-9]{40}$/.test(String(address))) failures.push(`${name}.${symbol} must be an EVM address`);
        if (String(address) === "0x0000000000000000000000000000000000000000") failures.push(`${name}.${symbol} cannot be zero address`);
      }
    }
  }
  if (env.REQUIRE_LENDING_FORK_TEST === "true") {
    requireEnv("HARDHAT_FORK_RPC_URL");
    requireEnv("AAVE_POOL_ADDRESSES_PROVIDER", { address: true });
  } else {
    warnings.push("REQUIRE_LENDING_FORK_TEST is not enabled; fork compatibility evidence is not enforced");
  }
} else {
  warnings.push("Production lending flag is disabled; lending UI will remain safely blocked");
}

if (failures.length > 0) {
  console.error("Production readiness failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  if (warnings.length > 0) {
    console.error("\nWarnings:");
    for (const warning of warnings) console.error(`- ${warning}`);
  }
  process.exit(1);
}

console.log("Production readiness checks passed.");
if (warnings.length > 0) {
  console.log("Warnings:");
  for (const warning of warnings) console.log(`- ${warning}`);
}
