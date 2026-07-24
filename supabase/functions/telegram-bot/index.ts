import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.4";
import { cleanText, json, rateLimit, readJsonBody } from "../_shared/security.ts";

type TelegramMessage = {
  message_id: number;
  text?: string;
  chat: { id: number | string; type: string };
  from?: { id: number | string; username?: string; first_name?: string; language_code?: string };
};

type TelegramUpdate = {
  update_id: number;
  message?: TelegramMessage;
};

const TELEGRAM_API = "https://api.telegram.org";
const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")?.trim();
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
  if (!BOT_TOKEN) return;
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
    console.error(`Telegram sendMessage failed: ${body}`);
  }
}

function detectIsEnglish(message: TelegramMessage, text: string): boolean {
  if (text.startsWith("/en") || text.includes(" english")) return true;
  if (text.startsWith("/pt") || text.includes(" portugues") || text.includes(" português")) return false;
  const langCode = (message.from?.language_code || "").toLowerCase();
  if (langCode.startsWith("pt")) return false;
  if (langCode.startsWith("en")) return true;
  // If text contains common English words
  if (/\b(hello|hi|help|token|create|start|how|loan|lending|thanks|thank)\b/i.test(text)) return true;
  return false;
}

function tokenDraftFromText(text: string) {
  const normalized = text.replace(/^\/token/i, "").trim();
  const parts = normalized.split(/\s+/).filter(Boolean);
  const name = cleanText(parts.slice(0, -1).join(" ") || "Novo Token", 50);
  const symbol = cleanText(parts.at(-1) ?? "TOKEN", 8).toUpperCase().replace(/[^A-Z0-9]/g, "");

  return {
    name,
    symbol,
    chain: "base",
    initialSupply: "1000000",
    maxSupply: "10000000",
    mintable: false,
    taxable: false,
    taxBPS: 0,
  };
}

function buildFactoryLink(intentId: string, locale: "en" | "pt") {
  return `${APP_URL}/${locale}/factory?intent=${encodeURIComponent(intentId)}&source=telegram`;
}

function buildLendingLink(intentId: string, locale: "en" | "pt") {
  return `${APP_URL}/${locale}/lending?intent=${encodeURIComponent(intentId)}&source=telegram`;
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
  const firstName = cleanText(message.from?.first_name ?? "", 30);
  const isEnglish = detectIsEnglish(message, text);
  const locale: "en" | "pt" = isEnglish ? "en" : "pt";

  // DB-backed rate limit check
  const oneMinuteAgo = new Date(Date.now() - 60_000).toISOString();
  const { count: recentCount } = await supabase!
    .from("telegram_bot_intents")
    .select("id", { count: "exact", head: true })
    .eq("telegram_user_id", telegramUserId)
    .gte("created_at", oneMinuteAgo);

  if ((recentCount ?? 0) >= 5) {
    const rateMsg = isEnglish
      ? "⏳ Multiple requests received. Please wait 1 minute before trying again."
      : "⏳ Múltiplas solicitações recebidas. Por favor, aguarde 1 minuto antes de tentar novamente.";
    await sendMessage(chatId, rateMsg);
    return;
  }

  // Handle explicit language switch
  if (text === "/en") {
    await sendMessage(chatId, "🇺🇸 Language set to English. Type `/help` or `/token` to begin!");
    return;
  }
  if (text === "/pt") {
    await sendMessage(chatId, "🇧🇷 Idioma definido para Português. Digite `/help` ou `/token` para começar!");
    return;
  }

  // Welcome / Start command
  if (!text || text === "/start") {
    const greeting = isEnglish
      ? [
          `👋 *Welcome to Instead Finance, ${firstName || "friend"}!*`,
          "",
          "I am your personal, guided assistant for Web3 finance.",
          "Creating digital assets and accessing liquidity is simple and safe.",
          "",
          "✨ *Here is how to get started:*",
          "1️⃣ `/token MyToken TKR` — Create a new custom digital asset",
          "2️⃣ `/lending` — Explore smart collateralized credit",
          "3️⃣ `/status <id>` — Check the status of your request",
          "4️⃣ `/help` — Learn about security & safety rules",
          "",
          "🌐 _Type `/pt` for Portuguese or `/en` for English at any time._",
        ].join("\n")
      : [
          `👋 *Seja muito bem-vindo à Instead Finance, ${firstName || "amigo(a)"}!*`,
          "",
          "Eu sou o seu assistente guiado para finanças descentralizadas.",
          "Criar ativos digitais e acessar liquidez é muito simples e seguro.",
          "",
          "✨ *Como você gostaria de começar?*",
          "1️⃣ `/token MeuToken TKR` — Criar uma nova moeda digital",
          "2️⃣ `/lending` — Explorar empréstimos com garantia",
          "3️⃣ `/status <id>` — Verificar o estado de uma solicitação",
          "4️⃣ `/help` — Ver garantias e regras de segurança",
          "",
          "🌐 _Digite `/en` para Inglês ou `/pt` para Português a qualquer momento._",
        ].join("\n");

    await sendMessage(chatId, greeting);
    return;
  }

  // Help command
  if (text === "/help") {
    const helpMsg = isEnglish
      ? [
          "🛡️ *Security & Safety Guarantees*",
          "",
          "• *Zero Custody:* This assistant *never* asks for private keys, passwords, or recovery phrases.",
          "• *You in Control:* Every transaction is reviewed and signed directly in your connected wallet.",
          "• *Verifiable Audit:* All intents generate an automated audit log on the protocol.",
          "",
          "💡 *Need assistance?* Type `/token` or `/lending` to start a step-by-step wizard.",
        ].join("\n")
      : [
          "🛡️ *Garantias de Segurança & Proteção*",
          "",
          "• *Custódia Própria:* Este assistente *nunca* solicita chaves privadas, senhas ou frases de recuperação.",
          "• *Você no Controle:* Todas as transações são revisadas e assinadas diretamente na sua carteira Web3.",
          "• *Auditoria Verificável:* Todas as solicitações geram registro automático de auditoria no protocolo.",
          "",
          "💡 *Precisa de ajuda?* Digite `/token` ou `/lending` para iniciar o assistente guiado.",
        ].join("\n");

    await sendMessage(chatId, helpMsg);
    return;
  }

  // Token creation wizard
  if (text.startsWith("/token")) {
    const draft = tokenDraftFromText(text);
    const intentId = await storeIntent(message, "token", draft);
    const link = buildFactoryLink(intentId, locale);

    const tokenMsg = isEnglish
      ? [
          "🚀 *Digital Asset Draft Created!*",
          "",
          `• *Name:* ${draft.name}`,
          `• *Symbol:* $${draft.symbol}`,
          `• *Suggested Network:* Base / Arbitrum`,
          "",
          "👇 *Next Step:* Click the button below to review your supply, custom fees, and launch safely with your wallet:",
          `🔗 [Launch Asset in App](${link})`,
        ].join("\n")
      : [
          "🚀 *Rascunho de Ativo Digital Criado!*",
          "",
          `• *Nome:* ${draft.name}`,
          `• *Símbolo:* $${draft.symbol}`,
          `• *Rede Sugerida:* Base / Arbitrum`,
          "",
          "👇 *Próximo Passo:* Clique no link abaixo para revisar o supply, funções e concluir o lançamento com sua carteira:",
          `🔗 [Finalizar Lançamento no App](${link})`,
        ].join("\n");

    await sendMessage(chatId, tokenMsg);
    return;
  }

  // Lending wizard
  if (text.startsWith("/lending")) {
    const intentId = await storeIntent(message, "lending", {
      requestedAction: "open_lending",
      safety: "wallet_required",
    });
    const link = buildLendingLink(intentId, locale);

    const lendingMsg = isEnglish
      ? [
          "🏦 *Smart Liquidity Assistant*",
          "",
          "I have prepared your collateralized lending route.",
          "Your collateral remains under your wallet's protection at all times.",
          "",
          "👇 *Next Step:* Tap the link below to view current rates and execute securely:",
          `🔗 [Access Lending Hub](${link})`,
        ].join("\n")
      : [
          "🏦 *Assistente de Empréstimos Inteligentes*",
          "",
          "Preparei a sua rota de liquidez com garantia.",
          "O seu patrimônio permanece sob proteção da sua própria carteira o tempo todo.",
          "",
          "👇 *Próximo Passo:* Clique no link abaixo para conferir as taxas e operar com segurança:",
          `🔗 [Acessar Hub de Empréstimos](${link})`,
        ].join("\n");

    await sendMessage(chatId, lendingMsg);
    return;
  }

  // Status check
  if (text.startsWith("/status")) {
    const intentId = cleanText(text.replace(/^\/status\s*/i, "").trim(), 64);
    if (!intentId) {
      const promptId = isEnglish
        ? "Please provide the request ID. Example: `/status <uuid>`"
        : "Por favor, informe o ID da solicitação. Exemplo: `/status <uuid>`";
      await sendMessage(chatId, promptId);
      return;
    }

    const { data: intent, error: intentError } = await supabase!
      .from("telegram_bot_intents")
      .select("id,flow,status,payload,wallet_address,created_at")
      .eq("id", intentId)
      .single();

    if (intentError || !intent) {
      const notFound = isEnglish
        ? "🔍 Request not found. Please verify the ID and try again."
        : "🔍 Solicitação não encontrada. Por favor, verifique o ID e tente novamente.";
      await sendMessage(chatId, notFound);
      return;
    }

    const statusText = intent.status === "confirmed"
      ? (isEnglish ? "✅ Completed" : "✅ Concluído")
      : (isEnglish ? "⏳ Pending Wallet Confirmation" : "⏳ Pendente de Confirmação");

    const statusMsg = isEnglish
      ? [
          "📊 *Request Status*",
          "",
          `• *ID:* \`${intent.id}\``,
          `• *Operation:* ${intent.flow}`,
          `• *Status:* ${statusText}`,
          `• *Created:* ${new Date(intent.created_at).toISOString().slice(0, 19).replace("T", " ")} UTC`,
        ].join("\n")
      : [
          "📊 *Status da Solicitação*",
          "",
          `• *ID:* \`${intent.id}\``,
          `• *Operação:* ${intent.flow}`,
          `• *Status:* ${statusText}`,
          `• *Criado em:* ${new Date(intent.created_at).toISOString().slice(0, 19).replace("T", " ")} UTC`,
        ].join("\n");

    await sendMessage(chatId, statusMsg);
    return;
  }

  // Fallback for plain messages — friendly guided response
  const fallback = isEnglish
    ? [
        `😊 *Hello ${firstName || "there"}! How can I help you today?*`,
        "",
        "Here are the most popular actions:",
        "• `/token` — Launch a custom cryptocurrency",
        "• `/lending` — Get liquidity using digital collateral",
        "• `/help` — Read about security and wallet protection",
        "",
        "💡 *Tip:* Type `/token MyToken TKR` to quickly draft a new asset!",
      ].join("\n")
    : [
        `😊 *Olá ${firstName || "amigo(a)"}! Como posso ajudar você hoje?*`,
        "",
        "Aqui estão as opções mais utilizadas:",
        "• `/token` — Lançar uma nova moeda digital",
        "• `/lending` — Obter empréstimo com garantia",
        "• `/help` — Ler sobre segurança e proteção da carteira",
        "",
        "💡 *Dica:* Digite `/token MeuToken TKR` para preparar um lançamento rápido!",
      ].join("\n");

  await sendMessage(chatId, fallback);
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
