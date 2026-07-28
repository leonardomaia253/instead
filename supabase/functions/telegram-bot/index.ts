import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.4";
import { cleanText, json, rateLimit, readJsonBody } from "../_shared/security.ts";

// ─────────────────────────────────────────
// Types
// ─────────────────────────────────────────
type TelegramMessage = {
  message_id: number;
  text?: string;
  chat: { id: number | string; type: string };
  from?: {
    id: number | string;
    username?: string;
    first_name?: string;
    language_code?: string;
  };
};
type TelegramUpdate = { update_id: number; message?: TelegramMessage };
type Session = {
  telegram_user_id: string;
  chat_id: string;
  flow: string | null;
  step: number;
  data: Record<string, string>;
  locale: string;
};

// ─────────────────────────────────────────
// Config
// ─────────────────────────────────────────
const TELEGRAM_API = "https://api.telegram.org";
const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")?.trim();
const WEBHOOK_SECRET = Deno.env.get("TELEGRAM_WEBHOOK_SECRET");
const APP_URL = Deno.env.get("APP_ORIGIN") ?? "https://instead.volupai.com";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const supabase = SUPABASE_URL && SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  : null;

// ─────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────
function missingConfiguration() {
  return !BOT_TOKEN || !WEBHOOK_SECRET || !supabase;
}
function validateTelegramSecret(req: Request) {
  const received = req.headers.get("x-telegram-bot-api-secret-token");
  if (!received || received !== WEBHOOK_SECRET) return json({ error: "Unauthorized" }, 401);
  return null;
}

async function sendMessage(chatId: string, text: string) {
  if (!BOT_TOKEN) return;
  const res = await fetch(`${TELEGRAM_API}/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown", disable_web_page_preview: true }),
  });
  if (!res.ok) console.error(`sendMessage failed: ${await res.text()}`);
}

// ─────────────────────────────────────────
// Language detection
// ─────────────────────────────────────────
function detectLocale(msg: TelegramMessage, text: string): "en" | "pt" {
  if (/^\/en\b/i.test(text)) return "en";
  if (/^\/pt\b/i.test(text)) return "pt";
  const lang = (msg.from?.language_code ?? "").toLowerCase();
  if (lang.startsWith("pt")) return "pt";
  return "en";
}

// ─────────────────────────────────────────
// Session management
// ─────────────────────────────────────────
async function getSession(telegramUserId: string): Promise<Session | null> {
  const { data } = await supabase!
    .from("telegram_sessions")
    .select("*")
    .eq("telegram_user_id", telegramUserId)
    .maybeSingle();
  return data ?? null;
}

async function setSession(session: Partial<Session> & { telegram_user_id: string; chat_id: string }) {
  await supabase!
    .from("telegram_sessions")
    .upsert({ ...session, updated_at: new Date().toISOString() }, { onConflict: "telegram_user_id" });
}

async function clearSession(telegramUserId: string) {
  await supabase!
    .from("telegram_sessions")
    .delete()
    .eq("telegram_user_id", telegramUserId);
}

// ─────────────────────────────────────────
// Wallet link helpers
// ─────────────────────────────────────────
function isValidEVMAddress(address: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(address);
}

async function getWalletLink(telegramUserId: string): Promise<string | null> {
  const { data } = await supabase!
    .from("telegram_wallet_links")
    .select("wallet_address")
    .eq("telegram_user_id", telegramUserId)
    .maybeSingle();
  return data?.wallet_address ?? null;
}

async function setWalletLink(telegramUserId: string, username: string, walletAddress: string) {
  await supabase!
    .from("telegram_wallet_links")
    .upsert(
      { telegram_user_id: telegramUserId, username, wallet_address: walletAddress, updated_at: new Date().toISOString() },
      { onConflict: "telegram_user_id" },
    );
}

async function clearWalletLink(telegramUserId: string) {
  await supabase!
    .from("telegram_wallet_links")
    .delete()
    .eq("telegram_user_id", telegramUserId);
}

// ─────────────────────────────────────────
// Intent storage
// ─────────────────────────────────────────
async function storeIntent(
  telegramUserId: string,
  chatId: string,
  username: string,
  flow: "token" | "lending",
  payload: Record<string, unknown>,
) {
  // Automatically attach linked wallet address to the intent if available
  const walletAddress = await getWalletLink(telegramUserId);

  const { data, error } = await supabase!
    .from("telegram_bot_intents")
    .insert({
      telegram_user_id: telegramUserId,
      chat_id: chatId,
      username,
      flow,
      status: "draft",
      payload: walletAddress ? { ...payload, linked_wallet: walletAddress } : payload,
      wallet_address: walletAddress ?? undefined,
      rate_key: `telegram:${telegramUserId}`,
    })
    .select("id")
    .single();
  if (error) throw error;
  return String(data.id);
}

// ─────────────────────────────────────────
// Copy — bilingual
// ─────────────────────────────────────────
const T = {
  welcome: {
    en: (name: string) => [
      `👋 *Welcome to Instead Finance${name ? `, ${name}` : ""}!*`,
      "",
      "I will guide you step by step — no experience needed. 😊",
      "",
      "What would you like to do today?",
      "",
      "1️⃣  *Create a token* — type `/token`",
      "2️⃣  *Get a loan* — type `/lending`",
      "3️⃣  *Check a request* — type `/status`",
      "4️⃣  *Help & security* — type `/help`",
      "",
      "_Type `/pt` for Portuguese · `/en` for English_",
    ].join("\n"),
    pt: (name: string) => [
      `👋 *Bem-vindo à Instead Finance${name ? `, ${name}` : ""}!*`,
      "",
      "Vou te guiar passo a passo — sem precisar de experiência. 😊",
      "",
      "O que você gostaria de fazer hoje?",
      "",
      "1️⃣  *Criar uma moeda* — digite `/token`",
      "2️⃣  *Obter um empréstimo* — digite `/lending`",
      "3️⃣  *Verificar uma solicitação* — digite `/status`",
      "4️⃣  *Ajuda e segurança* — digite `/help`",
      "",
      "_Digite `/en` para Inglês · `/pt` para Português_",
    ].join("\n"),
  },

  help: {
    en: [
      "🛡️ *Security Guarantees*",
      "",
      "• I will *never* ask for your private key, password, or recovery phrase.",
      "• Every transaction is reviewed and signed *only in your wallet*.",
      "• All actions are logged for transparency.",
      "",
      "💡 Ready to start? Type `/token` or `/lending`.",
    ].join("\n"),
    pt: [
      "🛡️ *Garantias de Segurança*",
      "",
      "• Eu *nunca* solicito chave privada, senha ou frase de recuperação.",
      "• Toda transação é revisada e assinada *somente na sua carteira*.",
      "• Todas as ações são registradas para transparência.",
      "",
      "💡 Pronto para começar? Digite `/token` ou `/lending`.",
    ].join("\n"),
  },

  tokenStep0: {
    en: [
      "🚀 *Let's create your token!*",
      "",
      "Step 1 of 3 — *Token Name*",
      "",
      "What is the full name of your token?",
      "_Example: My DeFi Token_",
      "",
      "_(Type `/cancel` at any time to start over)_",
    ].join("\n"),
    pt: [
      "🚀 *Vamos criar o seu token!*",
      "",
      "Etapa 1 de 3 — *Nome do Token*",
      "",
      "Qual é o nome completo do seu token?",
      "_Exemplo: Minha Moeda DeFi_",
      "",
      "_(Digite `/cancel` a qualquer momento para recomeçar)_",
    ].join("\n"),
  },

  tokenStep1: (name: string, locale: "en" | "pt") =>
    locale === "en"
      ? [
          `✅ *Name saved:* ${name}`,
          "",
          "Step 2 of 3 — *Ticker Symbol*",
          "",
          "Choose a short ticker for your token.",
          "_Between 2 and 8 capital letters — Example: MDFT_",
        ].join("\n")
      : [
          `✅ *Nome salvo:* ${name}`,
          "",
          "Etapa 2 de 3 — *Símbolo (Ticker)*",
          "",
          "Escolha um símbolo curto para o seu token.",
          "_Entre 2 e 8 letras maiúsculas — Exemplo: MDFT_",
        ].join("\n"),

  tokenSymbolInvalid: {
    en: "⚠️ The symbol must be between 2 and 8 capital letters (A–Z) with no spaces or special characters.\n\n_Example: MDFT_\n\nPlease try again:",
    pt: "⚠️ O símbolo deve ter entre 2 e 8 letras maiúsculas (A–Z), sem espaços ou caracteres especiais.\n\n_Exemplo: MDFT_\n\nPor favor, tente novamente:",
  },

  tokenStep2: (name: string, symbol: string, locale: "en" | "pt") =>
    locale === "en"
      ? [
          "Step 3 of 3 — *Confirm your token*",
          "",
          `• *Name:* ${name}`,
          `• *Symbol:* $${symbol}`,
          `• *Network:* Base / Arbitrum`,
          `• *Supply:* 1,000,000 (adjustable in the app)`,
          "",
          "Does everything look correct?",
          "",
          "✅ Type *yes* to continue",
          "✏️ Type *name* to change the name",
          "✏️ Type *symbol* to change the symbol",
          "❌ Type `/cancel` to start over",
        ].join("\n")
      : [
          "Etapa 3 de 3 — *Confirmar seu token*",
          "",
          `• *Nome:* ${name}`,
          `• *Símbolo:* $${symbol}`,
          `• *Rede:* Base / Arbitrum`,
          `• *Supply:* 1.000.000 (ajustável no app)`,
          "",
          "Está tudo correto?",
          "",
          "✅ Digite *sim* para continuar",
          "✏️ Digite *nome* para alterar o nome",
          "✏️ Digite *simbolo* para alterar o símbolo",
          "❌ Digite `/cancel` para recomeçar",
        ].join("\n"),

  tokenDone: (name: string, symbol: string, link: string, locale: "en" | "pt") =>
    locale === "en"
      ? [
          "🎉 *Your token draft is ready!*",
          "",
          `• *Name:* ${name}`,
          `• *Symbol:* $${symbol}`,
          "",
          "👇 Click the link below to review and launch with your wallet:",
          `🔗 [Open Token Launch in App](${link})`,
          "",
          "_You can adjust supply, fees, and features before signing._",
        ].join("\n")
      : [
          "🎉 *Rascunho do seu token está pronto!*",
          "",
          `• *Nome:* ${name}`,
          `• *Símbolo:* $${symbol}`,
          "",
          "👇 Clique no link abaixo para revisar e lançar com sua carteira:",
          `🔗 [Abrir Lançamento no App](${link})`,
          "",
          "_Você pode ajustar supply, taxas e funções antes de assinar._",
        ].join("\n"),

  lendingStep0: {
    en: [
      "🏦 *Smart Lending Assistant*",
      "",
      "Step 1 of 2 — *What would you like to do?*",
      "",
      "1️⃣  *Borrow* — get a loan using your crypto as collateral",
      "2️⃣  *Supply* — deposit crypto to earn interest",
      "",
      "Type *1* or *borrow*, or *2* or *supply*:",
      "",
      "_(Type `/cancel` to go back)_",
    ].join("\n"),
    pt: [
      "🏦 *Assistente de Empréstimos Inteligentes*",
      "",
      "Etapa 1 de 2 — *O que você gostaria de fazer?*",
      "",
      "1️⃣  *Pegar emprestado* — obtenha um empréstimo usando sua cripto como garantia",
      "2️⃣  *Depositar* — deposite cripto para ganhar juros",
      "",
      "Digite *1* ou *emprestimo*, ou *2* ou *deposito*:",
      "",
      "_(Digite `/cancel` para voltar)_",
    ].join("\n"),
  },

  lendingStep1: (type: string, locale: "en" | "pt") => {
    const isBorrow = type === "borrow";
    return locale === "en"
      ? [
          `Step 2 of 2 — *${isBorrow ? "Borrowing" : "Supplying"}*`,
          "",
          isBorrow
            ? "To borrow you will need to deposit collateral first. The app will show you available assets and current rates."
            : "When supplying, your assets earn interest automatically. Withdraw at any time.",
          "",
          "Your lending session has been prepared. Ready to continue?",
          "",
          "✅ Type *yes* to open the app",
          "❌ Type `/cancel` to start over",
        ].join("\n")
      : [
          `Etapa 2 de 2 — *${isBorrow ? "Empréstimo" : "Depósito"}*`,
          "",
          isBorrow
            ? "Para pegar emprestado, você precisará depositar garantia primeiro. O app mostrará os ativos disponíveis e as taxas atuais."
            : "Ao depositar, seus ativos rendem juros automaticamente. Você pode sacar a qualquer momento.",
          "",
          "Sua sessão de empréstimo foi preparada. Pronto para continuar?",
          "",
          "✅ Digite *sim* para abrir o app",
          "❌ Digite `/cancel` para recomeçar",
        ].join("\n");
  },

  lendingDone: (link: string, locale: "en" | "pt") =>
    locale === "en"
      ? [
          "🎉 *Lending route ready!*",
          "",
          "Your collateral stays under your wallet's protection at all times.",
          "",
          "👇 Click to open the platform and execute securely:",
          `🔗 [Open Lending Hub](${link})`,
        ].join("\n")
      : [
          "🎉 *Rota de empréstimo pronta!*",
          "",
          "Seu patrimônio permanece protegido pela sua carteira o tempo todo.",
          "",
          "👇 Clique para abrir a plataforma e operar com segurança:",
          `🔗 [Abrir Hub de Empréstimos](${link})`,
        ].join("\n"),

  cancelled: {
    en: "❌ *Cancelled.* Type `/token`, `/lending`, or `/help` whenever you are ready.",
    pt: "❌ *Cancelado.* Digite `/token`, `/lending` ou `/help` quando quiser recomeçar.",
  },

  statusPrompt: {
    en: "Please send the request ID you received earlier.\n\n_Example:_ `550e8400-e29b-41d4-a716-446655440000`",
    pt: "Por favor, envie o ID da solicitação que você recebeu anteriormente.\n\n_Exemplo:_ `550e8400-e29b-41d4-a716-446655440000`",
  },

  statusNotFound: {
    en: "🔍 Request not found. Please check the ID and try again.",
    pt: "🔍 Solicitação não encontrada. Verifique o ID e tente novamente.",
  },

  fallback: {
    en: (name: string) => [
      `😊 *Hi${name ? ` ${name}` : ""}! I did not quite understand that.*`,
      "",
      "Here is what you can do:",
      "• `/token` — Create a custom cryptocurrency",
      "• `/lending` — Get a collateralized loan",
      "• `/status` — Check a request",
      "• `/help` — Security info",
      "",
      "💡 Just type one of the commands above to begin!",
    ].join("\n"),
    pt: (name: string) => [
      `😊 *Olá${name ? ` ${name}` : ""}! Não entendi bem o que você quis dizer.*`,
      "",
      "Veja o que você pode fazer:",
      "• `/token` — Criar uma moeda digital",
      "• `/lending` — Obter um empréstimo com garantia",
      "• `/status` — Verificar uma solicitação",
      "• `/help` — Informações de segurança",
      "",
      "💡 Basta digitar um dos comandos acima para começar!",
    ].join("\n"),
  },

  langSet: {
    en: "🇺🇸 Language set to *English*. Type `/token` or `/lending` to begin!",
    pt: "🇧🇷 Idioma definido para *Português*. Digite `/token` ou `/lending` para começar!",
  },
};

// ─────────────────────────────────────────
// Link builders
// ─────────────────────────────────────────
function factoryLink(intentId: string, locale: "en" | "pt") {
  return `${APP_URL}/${locale}/factory?intent=${encodeURIComponent(intentId)}&source=telegram`;
}
function lendingLink(intentId: string, locale: "en" | "pt") {
  return `${APP_URL}/${locale}/lending?intent=${encodeURIComponent(intentId)}&source=telegram`;
}

// ─────────────────────────────────────────
// Main message handler
// ─────────────────────────────────────────
async function handleMessage(message: TelegramMessage) {
  const chatId = String(message.chat.id);
  const telegramUserId = String(message.from?.id ?? message.chat.id);
  const username = cleanText(message.from?.username ?? "", 64);
  const firstName = cleanText(message.from?.first_name ?? "", 30);
  const rawText = cleanText(message.text ?? "", 600).trim();
  const textLower = rawText.toLowerCase();

  // ── Load existing session ──────────────
  const session = await getSession(telegramUserId);
  const locale: "en" | "pt" = session?.locale === "pt" ? "pt" : detectLocale(message, rawText);

  // ── /cancel — always available ─────────
  if (textLower === "/cancel") {
    await clearSession(telegramUserId);
    await sendMessage(chatId, T.cancelled[locale]);
    return;
  }

  // ── Language switch ────────────────────
  if (textLower === "/en") {
    if (session) await setSession({ ...session, locale: "en" });
    await sendMessage(chatId, T.langSet.en);
    return;
  }
  if (textLower === "/pt") {
    if (session) await setSession({ ...session, locale: "pt" });
    await sendMessage(chatId, T.langSet.pt);
    return;
  }

  // ── /start or /help ────────────────────
  if (!rawText || textLower === "/start") {
    await clearSession(telegramUserId);
    await sendMessage(chatId, T.welcome[locale](firstName));
    return;
  }
  if (textLower === "/help") {
    await sendMessage(chatId, T.help[locale]);
    return;
  }

  // ── /status wizard ─────────────────────
  if (textLower === "/status") {
    await setSession({ telegram_user_id: telegramUserId, chat_id: chatId, flow: "status", step: 1, data: {}, locale });
    await sendMessage(chatId, T.statusPrompt[locale]);
    return;
  }

  // ── If in STATUS flow — handle ID reply ─
  if (session?.flow === "status" && session.step === 1) {
    const intentId = cleanText(rawText, 64);
    const { data: intent } = await supabase!
      .from("telegram_bot_intents")
      .select("id,flow,status,created_at")
      .eq("id", intentId)
      .single();

    await clearSession(telegramUserId);

    if (!intent) {
      await sendMessage(chatId, T.statusNotFound[locale]);
      return;
    }

    const statusText = intent.status === "confirmed"
      ? (locale === "en" ? "✅ Completed" : "✅ Concluído")
      : (locale === "en" ? "⏳ Pending confirmation in wallet" : "⏳ Aguardando confirmação na carteira");

    const msg = locale === "en"
      ? [`📊 *Request Status*`, "", `• *ID:* \`${intent.id}\``, `• *Type:* ${intent.flow}`, `• *Status:* ${statusText}`, `• *Created:* ${new Date(intent.created_at).toISOString().slice(0, 19).replace("T", " ")} UTC`].join("\n")
      : [`📊 *Status da Solicitação*`, "", `• *ID:* \`${intent.id}\``, `• *Tipo:* ${intent.flow}`, `• *Status:* ${statusText}`, `• *Criado em:* ${new Date(intent.created_at).toISOString().slice(0, 19).replace("T", " ")} UTC`].join("\n");

    await sendMessage(chatId, msg);
    return;
  }

  // ── /token — start wizard ──────────────
  if (textLower.startsWith("/token")) {
    await setSession({ telegram_user_id: telegramUserId, chat_id: chatId, flow: "token", step: 1, data: {}, locale });
    await sendMessage(chatId, T.tokenStep0[locale]);
    return;
  }

  // ── TOKEN WIZARD ──────────────────────
  if (session?.flow === "token") {
    const { step, data } = session;

    // Step 1: Received token name
    if (step === 1) {
      const name = cleanText(rawText, 50);
      if (name.length < 2) {
        const prompt = locale === "en" ? "⚠️ The name must be at least 2 characters. Please try again:" : "⚠️ O nome deve ter pelo menos 2 caracteres. Por favor, tente novamente:";
        await sendMessage(chatId, prompt);
        return;
      }
      await setSession({ telegram_user_id: telegramUserId, chat_id: chatId, flow: "token", step: 2, data: { name }, locale });
      await sendMessage(chatId, T.tokenStep1(name, locale));
      return;
    }

    // Step 2: Received symbol
    if (step === 2) {
      const symbol = rawText.toUpperCase().replace(/[^A-Z0-9]/g, "");
      if (symbol.length < 2 || symbol.length > 8) {
        await sendMessage(chatId, T.tokenSymbolInvalid[locale]);
        return;
      }
      const name = data.name ?? "Token";
      await setSession({ telegram_user_id: telegramUserId, chat_id: chatId, flow: "token", step: 3, data: { name, symbol }, locale });
      await sendMessage(chatId, T.tokenStep2(name, symbol, locale));
      return;
    }

    // Step 3: Confirmation
    if (step === 3) {
      const name = data.name ?? "Token";
      const symbol = data.symbol ?? "TKN";

      // Wants to change name
      if (["name", "nome"].includes(textLower)) {
        await setSession({ telegram_user_id: telegramUserId, chat_id: chatId, flow: "token", step: 1, data: {}, locale });
        await sendMessage(chatId, T.tokenStep0[locale]);
        return;
      }
      // Wants to change symbol
      if (["symbol", "simbolo", "símbolo", "ticker"].includes(textLower)) {
        await setSession({ telegram_user_id: telegramUserId, chat_id: chatId, flow: "token", step: 2, data: { name }, locale });
        await sendMessage(chatId, T.tokenStep1(name, locale));
        return;
      }
      // Confirmed
      if (["yes", "sim", "s", "y", "ok", "confirm", "confirmar"].includes(textLower)) {
        await clearSession(telegramUserId);
        const intentId = await storeIntent(telegramUserId, chatId, username, "token", {
          name, symbol, chain: "base", initialSupply: "1000000", maxSupply: "10000000", mintable: false, taxable: false, taxBPS: 0,
        });
        await sendMessage(chatId, T.tokenDone(name, symbol, factoryLink(intentId, locale), locale));
        return;
      }
      // Didn't understand
      const retry = locale === "en"
        ? "I did not understand. Type *yes* to confirm, *name* to change the name, *symbol* to change the symbol, or `/cancel` to start over."
        : "Não entendi. Digite *sim* para confirmar, *nome* para alterar o nome, *simbolo* para alterar o símbolo, ou `/cancel` para recomeçar.";
      await sendMessage(chatId, retry);
      return;
    }
  }

  // ── /lending — start wizard ────────────
  if (textLower.startsWith("/lending")) {
    await setSession({ telegram_user_id: telegramUserId, chat_id: chatId, flow: "lending", step: 1, data: {}, locale });
    await sendMessage(chatId, T.lendingStep0[locale]);
    return;
  }

  // ── LENDING WIZARD ────────────────────
  if (session?.flow === "lending") {
    const { step } = session;

    // Step 1: Choose borrow or supply
    if (step === 1) {
      let lendingType = "";
      if (["1", "borrow", "emprestimo", "empréstimo", "pegar"].includes(textLower)) lendingType = "borrow";
      else if (["2", "supply", "deposito", "depósito", "depositar"].includes(textLower)) lendingType = "supply";

      if (!lendingType) {
        const retry = locale === "en"
          ? "Please type *1* (Borrow) or *2* (Supply):"
          : "Por favor, digite *1* (Pegar emprestado) ou *2* (Depositar):";
        await sendMessage(chatId, retry);
        return;
      }
      await setSession({ telegram_user_id: telegramUserId, chat_id: chatId, flow: "lending", step: 2, data: { type: lendingType }, locale });
      await sendMessage(chatId, T.lendingStep1(lendingType, locale));
      return;
    }

    // Step 2: Confirmation to open app
    if (step === 2) {
      if (["yes", "sim", "s", "y", "ok", "confirm", "confirmar"].includes(textLower)) {
        const lendingType = session.data.type ?? "borrow";
        await clearSession(telegramUserId);
        const intentId = await storeIntent(telegramUserId, chatId, username, "lending", {
          requestedAction: lendingType === "borrow" ? "borrow" : "supply",
          safety: "wallet_required",
        });
        await sendMessage(chatId, T.lendingDone(lendingLink(intentId, locale), locale));
        return;
      }
      const retry = locale === "en"
        ? "Type *yes* to open the app, or `/cancel` to start over."
        : "Digite *sim* para abrir o app, ou `/cancel` para recomeçar.";
      await sendMessage(chatId, retry);
      return;
    }
  }

  // ── Fallback ───────────────────────────
  await sendMessage(chatId, T.fallback[locale](firstName));
}

// ─────────────────────────────────────────
// Server
// ─────────────────────────────────────────
serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    if (missingConfiguration()) return json({ error: "Service unavailable" }, 503);
    const unauthorized = validateTelegramSecret(req);
    if (unauthorized) return unauthorized;
    const limited = rateLimit(req, "telegram-bot");
    if (limited) return limited;

    const update = await readJsonBody<TelegramUpdate>(req, 8192);
    if (update.message) await handleMessage(update.message);

    return json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    if (message === "Payload too large") return json({ error: message }, 413);
    console.error("telegram-bot failed", message);
    return json({ error: "Internal server error" }, 500);
  }
});
