import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.4";
import { cleanText, json, rateLimit, readJsonBody } from "../_shared/security.ts";

type TelegramMessage = {
  message_id: number;
  text?: string;
  chat: { id: number | string; type: string };
  from?: { id: number | string; username?: string; first_name?: string };
};

type TelegramUpdate = {
  update_id: number;
  message?: TelegramMessage;
};

const TELEGRAM_API = "https://api.telegram.org";
const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
const WEBHOOK_SECRET = Deno.env.get("TELEGRAM_WEBHOOK_SECRET");
const APP_URL = Deno.env.get("APP_ORIGIN") ?? "https://instead.finance";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const supabase = SUPABASE_URL && SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  : null;

function missingConfiguration() {
  return !BOT_TOKEN || !WEBHOOK_SECRET || !supabase;
}

function validateTelegramSecret(req: Request) {
  const received = req.headers.get("x-telegram-bot-api-secret-token");
  if (!received || received !== WEBHOOK_SECRET) {
    return json({ error: "Unauthorized" }, 401);
  }
  return null;
}

async function sendMessage(chatId: string, text: string) {
  const response = await fetch(`${TELEGRAM_API}/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "Markdown",
      disable_web_page_preview: true,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Telegram sendMessage failed: ${body}`);
  }
}

function tokenDraftFromText(text: string) {
  const normalized = text.replace(/^\/token/i, "").trim();
  const parts = normalized.split(/\s+/).filter(Boolean);
  const name = cleanText(parts.slice(0, -1).join(" "), 50);
  const symbol = cleanText(parts.at(-1) ?? "", 8).toUpperCase().replace(/[^A-Z0-9]/g, "");

  return {
    name,
    symbol,
    chain: "base",
    initialSupply: 1_000_000,
    maxSupply: 10_000_000,
    mintable: false,
    taxable: false,
    taxBPS: 0,
  };
}

function buildFactoryLink(intentId: string) {
  return `${APP_URL}/pt/factory?intent=${encodeURIComponent(intentId)}&source=telegram`;
}

function buildLendingLink(intentId: string) {
  return `${APP_URL}/pt/lending?intent=${encodeURIComponent(intentId)}&source=telegram`;
}

async function storeIntent(message: TelegramMessage, flow: "token" | "lending", payload: Record<string, unknown>) {
  const chatId = String(message.chat.id);
  const telegramUserId = String(message.from?.id ?? message.chat.id);
  const username = cleanText(message.from?.username ?? "", 64);

  const { data, error } = await supabase!
    .from("telegram_bot_intents")
    .insert({
      telegram_user_id: telegramUserId,
      chat_id: chatId,
      username,
      flow,
      status: "draft",
      payload,
      rate_key: `telegram:${telegramUserId}`,
    })
    .select("id")
    .single();

  if (error) throw error;
  return String(data.id);
}

async function handleMessage(message: TelegramMessage) {
  const chatId = String(message.chat.id);
  const text = cleanText(message.text ?? "", 600);
  const telegramUserId = String(message.from?.id ?? message.chat.id);

  // DB-backed per-user rate limit: max 5 intents per minute per user
  // This persists across Edge Function cold starts unlike in-memory maps
  const oneMinuteAgo = new Date(Date.now() - 60_000).toISOString();
  const { count: recentCount } = await supabase!
    .from("telegram_bot_intents")
    .select("id", { count: "exact", head: true })
    .eq("telegram_user_id", telegramUserId)
    .gte("created_at", oneMinuteAgo);
  if ((recentCount ?? 0) >= 5) {
    await sendMessage(chatId, "Muitas solicitacoes. Aguarde 1 minuto e tente novamente.");
    return;
  }

  if (!text || text === "/start") {
    await sendMessage(
      chatId,
      [
        "*Instead Bot*",
        "",
        "Crie moedas e prepare operacoes DeFi com seguranca.",
        "",
        "Comandos:",
        "`/token NomeDoToken TICKER` - preparar uma moeda",
        "`/lending` - abrir fluxo de emprestimo com carteira",
        "`/status <id>` - consultar status de um intento pelo UUID",
        "`/help` - ver regras de seguranca",
      ].join("\n"),
    );
    return;
  }

  if (text === "/help") {
    await sendMessage(
      chatId,
      [
        "*Regras de seguranca*",
        "",
        "Eu nunca peco seed phrase, private key ou custodia.",
        "Criacao de moeda e lending terminam no app com sua carteira.",
        "Operacoes tem rate limit, logs de auditoria e validacao on-chain.",
      ].join("\n"),
    );
    return;
  }

  if (text.startsWith("/token")) {
    const draft = tokenDraftFromText(text);
    const intentId = await storeIntent(message, "token", draft);
    await sendMessage(
      chatId,
      [
        "*Rascunho de moeda criado*",
        "",
        `Nome: ${draft.name || "definir no app"}`,
        `Ticker: ${draft.symbol || "definir no app"}`,
        `Rede sugerida: ${draft.chain}`,
        "",
        "Finalize no app para revisar supply, funcoes, taxas e assinar com sua carteira:",
        buildFactoryLink(intentId),
      ].join("\n"),
    );
    return;
  }

  if (text.startsWith("/lending")) {
    const intentId = await storeIntent(message, "lending", {
      requestedAction: "open_lending",
      safety: "wallet_required",
    });
    await sendMessage(
      chatId,
      [
        "*Lending assistido*",
        "",
        "O bot prepara o fluxo, mas a transacao sempre acontece no app com sua carteira.",
        "Borrow na Aave exige colateral e debt delegation validos.",
        "",
        buildLendingLink(intentId),
      ].join("\n"),
    );
    return;
  }

  if (text.startsWith("/status")) {
    const intentId = cleanText(text.replace(/^\/status\s*/i, "").trim(), 64);
    if (!intentId) {
      await sendMessage(chatId, "Informe o ID do intento. Ex: `/status <uuid>`");
      return;
    }
    const { data: intent, error: intentError } = await supabase!
      .from("telegram_bot_intents")
      .select("id,flow,status,payload,wallet_address,created_at,updated_at")
      .eq("id", intentId)
      .single();
    if (intentError || !intent) {
      await sendMessage(chatId, "Intento nao encontrado. Verifique o ID e tente novamente.");
      return;
    }
    const statusEmoji = intent.status === "confirmed" ? "✅" : intent.status === "draft" ? "⏳" : "❓";
    const walletLine = intent.wallet_address ? `\nCarteira: \`${intent.wallet_address.slice(0, 8)}...\`` : "";
    await sendMessage(
      chatId,
      [
        `*Status do intento*`,
        "",
        `ID: \`${intent.id}\``,
        `Fluxo: ${intent.flow}`,
        `Status: ${statusEmoji} ${intent.status}${walletLine}`,
        `Criado: ${new Date(intent.created_at).toISOString().slice(0, 19).replace("T", " ")} UTC`,
      ].join("\n"),
    );
    return;
  }

  await sendMessage(chatId, "Nao entendi. Use `/token Nome TICKER`, `/lending`, `/status <id>` ou `/help`.");
}

serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    if (missingConfiguration()) return json({ error: "Service unavailable" }, 503);
    const unauthorized = validateTelegramSecret(req);
    if (unauthorized) return unauthorized;
    const limited = rateLimit(req, "telegram-bot");
    if (limited) return limited;

    const update = await readJsonBody<TelegramUpdate>(req, 8192);
    if (update.message) {
      await handleMessage(update.message);
    }

    return json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    if (message === "Payload too large") return json({ error: message }, 413);
    console.error("telegram-bot failed", message);
    return json({ error: "Internal server error" }, 500);
  }
});
