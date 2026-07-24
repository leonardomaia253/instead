import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

function getEnv(name) {
  if (process.env[name]) return process.env[name];
  const envPath = resolve(process.cwd(), "frontend/.env.local");
  if (existsSync(envPath)) {
    const lines = readFileSync(envPath, "utf8").split(/\r?\n/);
    for (const line of lines) {
      if (line.startsWith(`${name}=`)) {
        return line.slice(name.length + 1).trim().replace(/^["']|["']$/g, "");
      }
    }
  }
  return "";
}

const token = getEnv("TELEGRAM_BOT_TOKEN");
const secret = getEnv("TELEGRAM_WEBHOOK_SECRET");
const targetUrl = process.argv[2] || getEnv("TELEGRAM_WEBHOOK_URL");

console.log("--- Configuração de Webhook do Telegram ---");

if (!token) {
  console.error("❌ TELEGRAM_BOT_TOKEN é obrigatório.");
  process.exit(1);
}

if (!secret) {
  console.error("❌ TELEGRAM_WEBHOOK_SECRET é obrigatório.");
  process.exit(1);
}

if (!targetUrl || !/^https:\/\//i.test(targetUrl)) {
  console.error("❌ URL do Webhook inválida. Passe a URL HTTPS como parâmetro ou defina TELEGRAM_WEBHOOK_URL.");
  console.error("Exemplo: node scripts/set-telegram-webhook.mjs https://sua-url-publica.com/api/telegram/webhook");
  process.exit(1);
}

console.log(`Configurando Webhook para: ${targetUrl}`);

const response = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    url: targetUrl,
    secret_token: secret,
    allowed_updates: ["message"],
    drop_pending_updates: false,
  }),
});

const body = await response.json();
if (!response.ok || !body.ok) {
  console.error("❌ Falha ao configurar Webhook no Telegram:");
  console.error(JSON.stringify(body, null, 2));
  process.exit(1);
}

console.log("✅ Webhook do Telegram configurado com sucesso!");
console.log(JSON.stringify(body, null, 2));
