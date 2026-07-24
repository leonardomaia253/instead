const token = process.env.TELEGRAM_BOT_TOKEN;
const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
const webhookUrl = process.env.TELEGRAM_WEBHOOK_URL;

if (!token) {
  console.error("TELEGRAM_BOT_TOKEN is required.");
  process.exit(1);
}

if (!secret || secret.length < 32) {
  console.error("TELEGRAM_WEBHOOK_SECRET is required and must be at least 32 characters.");
  process.exit(1);
}

if (!webhookUrl || !/^https:\/\//.test(webhookUrl)) {
  console.error("TELEGRAM_WEBHOOK_URL must be an https URL.");
  process.exit(1);
}

const response = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    url: webhookUrl,
    secret_token: secret,
    allowed_updates: ["message"],
    drop_pending_updates: false,
  }),
});

const body = await response.json();
if (!response.ok || !body.ok) {
  console.error("Telegram setWebhook failed:");
  console.error(JSON.stringify(body, null, 2));
  process.exit(1);
}

console.log("Telegram webhook configured.");
