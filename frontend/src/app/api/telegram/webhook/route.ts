import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { rateLimit } from "@/lib/server/rateLimit";

const TELEGRAM_API = "https://api.telegram.org";
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_ORIGIN || "https://instead.finance";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = SUPABASE_URL && SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  : null;

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
    console.warn(`Telegram sendMessage failed: ${body}`);
  }
}

function cleanText(text: string, maxLength: number): string {
  return (text || "").slice(0, maxLength).replace(/[<>{}]/g, "");
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

export async function POST(request: Request) {
  const limited = rateLimit(request, "telegram:webhook", 60, 60_000);
  if (!limited.allowed) return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });

  const secretToken = request.headers.get("x-telegram-bot-api-secret-token");
  if (WEBHOOK_SECRET && secretToken !== WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const update = await request.json();
    const message = update?.message;
    if (!message || !message.chat?.id) {
      return NextResponse.json({ ok: true });
    }

    const chatId = String(message.chat.id);
    const text = cleanText(message.text || "", 600);
    const telegramUserId = String(message.from?.id || message.chat.id);
    const username = cleanText(message.from?.username || "", 64);

    if (!text || text === "/start") {
      await sendMessage(
        chatId,
        [
          "*Instead Bot - Assistente Financeiro*",
          "",
          "Crie moedas digitais e prepare operações de liquidez com segurança total.",
          "",
          "Comandos:",
          "`/token NomeDoToken TICKER` - Criar intenção de lançamento",
          "`/lending` - Preparar fluxo de empréstimo inteligente",
          "`/status <id>` - Consultar status de uma solicitação pelo ID",
          "`/help` - Regras de segurança e garantia de custódia",
        ].join("\n")
      );
      return NextResponse.json({ ok: true });
    }

    if (text === "/help") {
      await sendMessage(
        chatId,
        [
          "*Garantias de Segurança*",
          "",
          "• O assistente **nunca** solicita chaves privadas ou senhas.",
          "• Operações terminam com assinatura na sua carteira Web3.",
          "• Todas as solicitações possuem log de auditoria no protocolo.",
        ].join("\n")
      );
      return NextResponse.json({ ok: true });
    }

    if (text.startsWith("/token")) {
      const draft = tokenDraftFromText(text);
      let intentId = `temp_${Date.now()}`;

      if (supabase) {
        const { data, error } = await supabase
          .from("telegram_bot_intents")
          .insert({
            telegram_user_id: telegramUserId,
            chat_id: chatId,
            username,
            flow: "token",
            status: "draft",
            payload: draft,
            rate_key: `telegram:${telegramUserId}`,
          })
          .select("id")
          .single();
        if (!error && data) intentId = String(data.id);
      }

      const link = `${APP_URL}/pt/factory?intent=${encodeURIComponent(intentId)}&source=telegram`;
      await sendMessage(
        chatId,
        [
          "*Rascunho de moeda preparado!*",
          "",
          `Nome: **${draft.name}**`,
          `Ticker: **$${draft.symbol}**`,
          `Rede sugerida: Arbitrum / Base`,
          "",
          "Acesse a plataforma para revisar a distribuição e finalizar com sua carteira:",
          link,
        ].join("\n")
      );
      return NextResponse.json({ ok: true });
    }

    if (text.startsWith("/lending")) {
      let intentId = `lending_${Date.now()}`;
      if (supabase) {
        const { data, error } = await supabase
          .from("telegram_bot_intents")
          .insert({
            telegram_user_id: telegramUserId,
            chat_id: chatId,
            username,
            flow: "lending",
            status: "draft",
            payload: { requestedAction: "open_lending" },
            rate_key: `telegram:${telegramUserId}`,
          })
          .select("id")
          .single();
        if (!error && data) intentId = String(data.id);
      }

      const link = `${APP_URL}/pt/lending?intent=${encodeURIComponent(intentId)}&source=telegram`;
      await sendMessage(
        chatId,
        [
          "*Empréstimo Inteligente*",
          "",
          "O assistente preparou a rota de liquidez. A operação é finalizada com segurança usando sua carteira:",
          link,
        ].join("\n")
      );
      return NextResponse.json({ ok: true });
    }

    if (text.startsWith("/status")) {
      const intentId = cleanText(text.replace(/^\/status\s*/i, "").trim(), 64);
      if (!intentId) {
        await sendMessage(chatId, "Informe o ID da solicitação. Ex: `/status <id>`");
        return NextResponse.json({ ok: true });
      }

      if (supabase) {
        const { data: intent } = await supabase
          .from("telegram_bot_intents")
          .select("id,flow,status,wallet_address,created_at")
          .eq("id", intentId)
          .single();

        if (intent) {
          const statusEmoji = intent.status === "confirmed" ? "✅ Concluído" : "⏳ Pendente";
          await sendMessage(
            chatId,
            [
              `*Status da Solicitação*`,
              "",
              `ID: \`${intent.id}\``,
              `Operação: ${intent.flow}`,
              `Status: ${statusEmoji}`,
            ].join("\n")
          );
          return NextResponse.json({ ok: true });
        }
      }

      await sendMessage(chatId, "Solicitação não encontrada. Verifique o ID informado.");
      return NextResponse.json({ ok: true });
    }

    await sendMessage(chatId, "Comando não reconhecido. Use `/token Nome TICKER`, `/lending` ou `/help`.");
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Telegram webhook error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
