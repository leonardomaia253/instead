import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { rateLimit, readLimitedJson } from "@/lib/server/rateLimit";

const TELEGRAM_API = "https://api.telegram.org";
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN?.trim();
const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_ORIGIN || "https://instead.volupai.com";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = SUPABASE_URL && SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  : null;

type Locale = "en" | "pt";

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
  if (!response.ok) console.warn(`Telegram sendMessage failed: ${await response.text()}`);
}

function cleanText(text: string, maxLength: number): string {
  return (text || "").slice(0, maxLength).replace(/[<>{}]/g, "").trim();
}

function normalize(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function detectLocale(message: any, text: string): Locale {
  const normalized = normalize(text);
  if (normalized.startsWith("/en") || normalized.includes("english")) return "en";
  if (normalized.startsWith("/pt") || normalized.includes("portugues")) return "pt";
  const langCode = String(message.from?.language_code || "").toLowerCase();
  if (langCode.startsWith("pt")) return "pt";
  return "en";
}

function commandFromText(text: string) {
  const normalized = normalize(text);
  if (normalized === "1" || normalized.startsWith("/token") || normalized.includes("token") || normalized.includes("moeda")) return "token";
  if (normalized === "2" || normalized.startsWith("/lending") || normalized.includes("emprest") || normalized.includes("loan")) return "lending";
  if (normalized === "3" || normalized.startsWith("/status")) return "status";
  if (normalized === "4" || normalized.startsWith("/help") || normalized.includes("ajuda") || normalized.includes("help")) return "help";
  if (normalized === "/start" || normalized === "start" || normalized === "menu" || normalized === "oi" || normalized === "ola" || normalized === "hi") return "start";
  return "fallback";
}

function tokenDraftFromText(text: string) {
  const normalized = text.replace(/^\/token/i, "").trim();
  const parts = normalized.split(/\s+/).filter(Boolean);
  const name = cleanText(parts.slice(0, -1).join(" ") || "Novo Token", 50);
  const symbol = cleanText(parts.at(-1) ?? "TOKEN", 8).toUpperCase().replace(/[^A-Z0-9]/g, "") || "TOKEN";

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

function welcome(firstName: string, locale: Locale) {
  return locale === "pt"
    ? [
        `Bem-vindo a Instead Finance${firstName ? `, ${firstName}` : ""}.`,
        "",
        "Eu vou te guiar passo a passo. Voce nao precisa entender de cripto para comecar.",
        "",
        "Escolha uma opcao respondendo com o numero:",
        "1 - Criar uma moeda digital",
        "2 - Ver emprestimos com garantia",
        "3 - Consultar uma solicitacao",
        "4 - Ajuda e seguranca",
        "",
        "Dica: voce tambem pode digitar /token, /lending, /status ou /help.",
      ].join("\n")
    : [
        `Welcome to Instead Finance${firstName ? `, ${firstName}` : ""}.`,
        "",
        "I will guide you step by step. You do not need crypto experience to start.",
        "",
        "Choose an option by replying with the number:",
        "1 - Create a digital asset",
        "2 - View collateralized lending",
        "3 - Check a request",
        "4 - Help and safety",
        "",
        "Tip: you can also type /token, /lending, /status or /help.",
      ].join("\n");
}

function help(locale: Locale) {
  return locale === "pt"
    ? [
        "*Ajuda e seguranca*",
        "",
        "- Eu nunca peco chave privada, senha ou frase de recuperacao.",
        "- Nenhuma transacao acontece sem voce revisar e assinar na sua carteira.",
        "- Se algo parecer confuso, pare e chame suporte antes de assinar.",
        "",
        "Para criar uma moeda, responda 1.",
        "Para ver emprestimos, responda 2.",
      ].join("\n")
    : [
        "*Help and safety*",
        "",
        "- I never ask for your private key, password, or recovery phrase.",
        "- No transaction happens until you review and sign in your wallet.",
        "- If anything feels confusing, stop and contact support before signing.",
        "",
        "To create a digital asset, reply 1.",
        "To view lending, reply 2.",
      ].join("\n");
}

async function storeTelegramIntent(input: {
  telegramUserId: string;
  chatId: string;
  username: string;
  flow: "token" | "lending";
  payload: Record<string, unknown>;
}) {
  if (!supabase) return `${input.flow}_${Date.now()}`;
  const { data, error } = await supabase
    .from("telegram_bot_intents")
    .insert({
      telegram_user_id: input.telegramUserId,
      chat_id: input.chatId,
      username: input.username,
      flow: input.flow,
      status: "draft",
      payload: input.payload,
      rate_key: `telegram:${input.telegramUserId}`,
    })
    .select("id")
    .single();
  if (error || !data) {
    console.warn("Telegram intent insert failed", error);
    return `${input.flow}_${Date.now()}`;
  }
  return String(data.id);
}

export async function POST(request: Request) {
  const limited = rateLimit(request, "telegram:webhook", 60, 60_000);
  if (!limited.allowed) return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });

  const secretToken = request.headers.get("x-telegram-bot-api-secret-token");
  if (WEBHOOK_SECRET && secretToken !== WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const update = await readLimitedJson<any>(request, 64 * 1024);
    const message = update?.message;
    if (!message || !message.chat?.id) return NextResponse.json({ ok: true });

    const chatId = String(message.chat.id);
    const rawText = cleanText(message.text || "", 600);
    const text = rawText || "/start";
    const telegramUserId = String(message.from?.id || message.chat.id);
    const username = cleanText(message.from?.username || "", 64);
    const firstName = cleanText(message.from?.first_name || "", 30);
    const locale = detectLocale(message, text);
    const command = commandFromText(text);

    if (text === "/en") {
      await sendMessage(chatId, "Language set to English. Reply 1, 2, 3 or 4 to continue.");
      return NextResponse.json({ ok: true });
    }
    if (text === "/pt") {
      await sendMessage(chatId, "Idioma definido para Portugues. Responda 1, 2, 3 ou 4 para continuar.");
      return NextResponse.json({ ok: true });
    }

    if (command === "start") {
      await sendMessage(chatId, welcome(firstName, locale));
      return NextResponse.json({ ok: true });
    }

    if (command === "help") {
      await sendMessage(chatId, help(locale));
      return NextResponse.json({ ok: true });
    }

    if (command === "token") {
      const draft = tokenDraftFromText(text);
      const intentId = await storeTelegramIntent({
        telegramUserId,
        chatId,
        username,
        flow: "token",
        payload: draft,
      });
      const link = `${APP_URL}/${locale}/factory?intent=${encodeURIComponent(intentId)}&source=telegram`;
      const tokenMsg = locale === "pt"
        ? [
            "*Rascunho da moeda criado.*",
            "",
            `Nome: ${draft.name}`,
            `Simbolo: ${draft.symbol}`,
            "Rede sugerida: Base",
            "",
            "Proximo passo: abra o app, revise tudo com calma e assine somente se estiver correto.",
            `[Abrir criador de moeda](${link})`,
          ].join("\n")
        : [
            "*Digital asset draft created.*",
            "",
            `Name: ${draft.name}`,
            `Symbol: ${draft.symbol}`,
            "Suggested network: Base",
            "",
            "Next step: open the app, review everything calmly, and sign only if it is correct.",
            `[Open asset creator](${link})`,
          ].join("\n");
      await sendMessage(chatId, tokenMsg);
      return NextResponse.json({ ok: true });
    }

    if (command === "lending") {
      const intentId = await storeTelegramIntent({
        telegramUserId,
        chatId,
        username,
        flow: "lending",
        payload: { requestedAction: "open_lending" },
      });
      const link = `${APP_URL}/${locale}/lending?intent=${encodeURIComponent(intentId)}&source=telegram`;
      const lendingMsg = locale === "pt"
        ? [
            "*Emprestimos com garantia.*",
            "",
            "O app vai mostrar riscos, taxas e limites antes de qualquer assinatura.",
            "Seu dinheiro continua protegido pela sua carteira ate voce confirmar uma transacao.",
            "",
            `[Abrir area de emprestimos](${link})`,
          ].join("\n")
        : [
            "*Collateralized lending.*",
            "",
            "The app will show risks, rates, and limits before any signature.",
            "Your funds stay protected by your wallet until you confirm a transaction.",
            "",
            `[Open lending area](${link})`,
          ].join("\n");
      await sendMessage(chatId, lendingMsg);
      return NextResponse.json({ ok: true });
    }

    if (command === "status") {
      const intentId = cleanText(text.replace(/^\/status\s*/i, "").replace(/^3\s*/, "").trim(), 64);
      if (!intentId) {
        await sendMessage(
          chatId,
          locale === "pt"
            ? "Envie o ID da solicitacao. Exemplo: /status 550e8400-e29b-41d4-a716-446655440000"
            : "Send the request ID. Example: /status 550e8400-e29b-41d4-a716-446655440000",
        );
        return NextResponse.json({ ok: true });
      }

      if (supabase) {
        const { data: intent } = await supabase
          .from("telegram_bot_intents")
          .select("id,flow,status,created_at")
          .eq("id", intentId)
          .maybeSingle();

        if (intent) {
          const createdAt = new Date(intent.created_at).toISOString().slice(0, 19).replace("T", " ");
          await sendMessage(
            chatId,
            locale === "pt"
              ? [`*Status da solicitacao*`, "", `ID: ${intent.id}`, `Operacao: ${intent.flow}`, `Status: ${intent.status}`, `Criado em: ${createdAt} UTC`].join("\n")
              : [`*Request status*`, "", `ID: ${intent.id}`, `Operation: ${intent.flow}`, `Status: ${intent.status}`, `Created: ${createdAt} UTC`].join("\n"),
          );
          return NextResponse.json({ ok: true });
        }
      }

      await sendMessage(chatId, locale === "pt" ? "Solicitacao nao encontrada. Verifique o ID e tente novamente." : "Request not found. Check the ID and try again.");
      return NextResponse.json({ ok: true });
    }

    await sendMessage(chatId, welcome(firstName, locale));
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Telegram webhook error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
