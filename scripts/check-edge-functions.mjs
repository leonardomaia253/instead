import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const functionsDir = resolve(root, "supabase/functions");
const requiredFunctions = ["siwe-auth", "token-ai", "lending-ai", "telegram-bot", "balance-monitor", "lending-automation"];
const failures = [];

const deployScript = readFileSync(resolve(root, "scripts/deploy-edge-functions.mjs"), "utf8");
const smokeScript = readFileSync(resolve(root, "scripts/smoke-test.mjs"), "utf8");
for (const [path, source] of [
  ["scripts/deploy-edge-functions.mjs", deployScript],
  ["scripts/smoke-test.mjs", smokeScript],
]) {
  if (!source.includes("./lib/supabase-env.mjs")) failures.push(`${path} must use the shared Supabase env diagnostics helper`);
  if (!source.includes("supabaseEnvDiagnostics")) failures.push(`${path} must reject conflicting local/process Supabase refs`);
}
if (!readFileSync(resolve(root, "scripts/production-readiness.mjs"), "utf8").includes("supabaseEnvDiagnostics")) {
  failures.push("production-readiness must use the shared Supabase env diagnostics helper");
}
const supabaseEnvHelper = readFileSync(resolve(root, "scripts/lib/supabase-env.mjs"), "utf8");
if (!supabaseEnvHelper.includes("supabaseJwtInfo")) {
  failures.push("Supabase env diagnostics must validate Supabase JWT project refs");
}
if (!supabaseEnvHelper.includes("serviceRoleRef")) {
  failures.push("Supabase env diagnostics must validate service role key project refs");
}
if (!supabaseEnvHelper.includes('role !== "anon"') || !supabaseEnvHelper.includes('role !== "service_role"')) {
  failures.push("Supabase env diagnostics must validate anon and service_role JWT roles");
}

for (const name of requiredFunctions) {
  const indexPath = resolve(functionsDir, name, "index.ts");
  if (!existsSync(indexPath)) {
    failures.push(`${name}/index.ts is missing`);
    continue;
  }
  const source = readFileSync(indexPath, "utf8");
  if (!source.includes("serve(")) failures.push(`${name} does not start an Edge Function server`);
  if (name !== "telegram-bot" && !source.includes("rateLimit(")) failures.push(`${name} does not call rateLimit`);
  if (["token-ai", "lending-ai"].includes(name) && !source.includes("requireBearer(")) {
    failures.push(`${name} does not require bearer auth`);
  }
  if (["token-ai", "lending-ai"].includes(name)) {
    const bearerIndex = source.indexOf("requireBearer(");
    const geminiIndex = source.indexOf("requireConfiguredGemini()", source.indexOf("serve("));
    if (bearerIndex === -1 || geminiIndex === -1 || bearerIndex > geminiIndex) {
      failures.push(`${name} must reject unauthenticated requests before checking provider configuration`);
    }
    if (source.includes("GEMINI_API_KEY is not configured")) {
      failures.push(`${name} must not expose provider secret names in responses`);
    }
    if (!source.includes('message === "AI provider unavailable" ? 503')) {
      failures.push(`${name} must return 503 for missing AI provider configuration`);
    }
  }
  if (name === "telegram-bot" && !source.includes("x-telegram-bot-api-secret-token")) {
    failures.push("telegram-bot does not validate Telegram webhook secret header");
  }
  if (name === "telegram-bot" && !source.includes('json({ error: "Service unavailable" }, 503)')) {
    failures.push("telegram-bot must return 503 without exposing missing secret names");
  }
  if (name === "telegram-bot" && source.includes("TELEGRAM_BOT_TOKEN is not configured")) {
    failures.push("telegram-bot exposes secret configuration names in responses");
  }
  if (name === "siwe-auth") {
    if (source.includes("is not configured")) failures.push("siwe-auth must not expose missing secret names in responses");
    if (!source.includes('message === "Service unavailable"') || !source.includes('json({ error: message }, 503)')) {
      failures.push("siwe-auth must return a generic 503 when required secrets are missing");
    }
    if (!source.includes('return json({ error: "Internal server error" }, 500)')) {
      failures.push("siwe-auth must return a generic 500 for unexpected errors");
    }
  }
  if (name === "lending-automation") {
    if (!source.includes('if (!secret) return json({ error: "Service unavailable" }, 503)')) {
      failures.push("lending-automation must fail closed when automation secret is missing");
    }
    if (!source.includes('return json({ error: "Internal server error" }, 500)')) {
      failures.push("lending-automation must return a generic 500 for unexpected errors");
    }
  }
  if (name === "balance-monitor") {
    if (!source.includes('if (!cronSecret) return json({ error: "Service unavailable" }, 503)')) {
      failures.push("balance-monitor must fail closed when monitor secret is missing");
    }
  }
}

const migrationsDir = resolve(root, "supabase/migrations");
const migrations = readdirSync(migrationsDir).filter((file) => file.endsWith(".sql"));
if (!migrations.some((file) => file.includes("telegram_bot_intents"))) {
  failures.push("telegram_bot_intents migration is missing");
}

if (failures.length > 0) {
  console.error("Edge Function checks failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Edge Function checks passed.");
