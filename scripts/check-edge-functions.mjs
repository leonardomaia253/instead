import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const functionsDir = resolve(root, "supabase/functions");
const requiredFunctions = ["siwe-auth", "token-ai", "lending-ai", "telegram-bot"];
const failures = [];

for (const name of requiredFunctions) {
  const indexPath = resolve(functionsDir, name, "index.ts");
  if (!existsSync(indexPath)) {
    failures.push(`${name}/index.ts is missing`);
    continue;
  }
  const source = readFileSync(indexPath, "utf8");
  if (!source.includes("serve(")) failures.push(`${name} does not start an Edge Function server`);
  if (name !== "telegram-bot" && !source.includes("rateLimit(")) failures.push(`${name} does not call rateLimit`);
  if (!["telegram-bot", "siwe-auth"].includes(name) && !source.includes("requireBearer(")) {
    failures.push(`${name} does not require bearer auth`);
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
