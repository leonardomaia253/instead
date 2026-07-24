import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const frontendEnvPath = resolve(root, "frontend/.env.local");

function parseEnvFile(path) {
  if (!existsSync(path)) return {};
  return Object.fromEntries(
    readFileSync(path, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const index = line.indexOf("=");
        return [line.slice(0, index), line.slice(index + 1).replace(/^["']|["']$/g, "")];
      }),
  );
}

const fileEnv = parseEnvFile(frontendEnvPath);
const env = { ...fileEnv, ...process.env };
const failures = [];
const warnings = [];

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

const requiredEdgeFunctions = ["siwe-auth", "token-ai", "lending-ai", "telegram-bot"];
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
  "scripts/transfer-ownership.ts",
  "scripts/verify-ownership.mjs",
  "scripts/verify-deployment-manifest.mjs",
  "scripts/smoke-test.mjs",
  "scripts/local-smoke-test.mjs",
  "scripts/check-migrations.mjs",
  "scripts/check-supabase-contract.mjs",
  "scripts/seed-lending-protocol-routes.mjs",
  "scripts/check-secrets.mjs",
  "scripts/set-telegram-webhook.mjs",
]) {
  if (!existsSync(resolve(root, requiredFile))) failures.push(`${requiredFile} is missing`);
}

requireEnv("NEXT_PUBLIC_SUPABASE_URL");
requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
requireEnv("NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID");

warnIfMissing("TELEGRAM_BOT_TOKEN");
warnIfMissing("TELEGRAM_WEBHOOK_SECRET");
warnIfMissing("SUPABASE_SERVICE_ROLE_KEY");
warnIfMissing("SUPABASE_JWT_SECRET");
warnIfMissing("APP_ORIGIN");
warnIfMissing("STRIPE_SECRET_KEY");
warnIfMissing("STRIPE_WEBHOOK_SECRET");
warnIfMissing("PAGARME_SECRET_KEY");
warnIfMissing("PAGARME_WEBHOOK_SECRET");
warnIfMissing("SENTRY_DSN");
warnIfMissing("UPTIME_STATUS_URL");
warnIfMissing("ALERT_WEBHOOK_URL");

if (env.REQUIRE_MONITORING === "true") {
  requireEnv("SENTRY_DSN");
  requireEnv("UPTIME_STATUS_URL");
  requireEnv("ALERT_WEBHOOK_URL");
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
  requireEnv("STRIPE_SECRET_KEY");
  requireEnv("STRIPE_WEBHOOK_SECRET");
  requireEnv("PAGARME_SECRET_KEY");
  requireMinLength("PAGARME_WEBHOOK_SECRET", 32);
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
