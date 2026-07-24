import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

// Tenta ler do .env.local se não estiver nas envs do sistema
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
const webhookUrl = getEnv("TELEGRAM_WEBHOOK_URL");

console.log("--- Diagnóstico do Bot Telegram ---");
console.log("Token Presente:", !!token);
console.log("Secret Presente:", !!secret, secret ? `(Tamanho: ${secret.length})` : "");
console.log("Webhook URL:", webhookUrl || "Não configurada");

if (!token) {
  console.error("\n❌ TELEGRAM_BOT_TOKEN não foi encontrado no ambiente ou em frontend/.env.local.");
  process.exit(1);
}

try {
  // 1. Testa getMe
  const meRes = await fetch(`https://api.telegram.org/bot${token}/getMe`);
  const meData = await meRes.json();
  if (!meRes.ok || !meData.ok) {
    console.error("\n❌ Falha ao comunicar com Telegram Bot API (Token Inválido?):", meData);
    process.exit(1);
  }
  console.log("\n✅ Bot Identificado no Telegram:");
  console.log(`   - ID: ${meData.result.id}`);
  console.log(`   - Nome: ${meData.result.first_name}`);
  console.log(`   - Username: @${meData.result.username}`);

  // 2. Consulta getWebhookInfo
  const whRes = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`);
  const whData = await whRes.json();
  console.log("\n📡 Status Atual do Webhook no Telegram:");
  if (whData.ok) {
    console.log(`   - URL Configurada: ${whData.result.url || "NENHUMA (Polling / Desativado)"}`);
    console.log(`   - Updates Pendentes: ${whData.result.pending_update_count}`);
    if (whData.result.last_error_message) {
      console.log(`   - ⚠️ Último Erro de Entrega: ${whData.result.last_error_message}`);
      if (whData.result.last_error_date) {
        console.log(`   - Data do Erro: ${new Date(whData.result.last_error_date * 1000).toLocaleString()}`);
      }
    } else {
      console.log(`   - Sem erros de entrega reportados pelo Telegram.`);
    }
  } else {
    console.error("❌ Erro ao buscar WebhookInfo:", whData);
  }
} catch (err) {
  console.error("\n❌ Erro durante o diagnóstico:", err);
}
