/**
 * System Operational Alerting Utility
 * Dispatches high-priority alerts to the configured Telegram operations chat.
 */

export interface SystemAlertPayload {
  title: string;
  severity: "info" | "warning" | "critical";
  source: string;
  details: Record<string, unknown>;
}

export async function sendSystemAlert(alert: SystemAlertPayload): Promise<boolean> {
  // Always log alerts, even when Telegram delivery is not configured.
  console.warn(
    `[ALERT_${alert.severity.toUpperCase()}] [${alert.source}] ${alert.title}`,
    JSON.stringify(alert.details),
  );

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_ALERT_CHAT_ID;

  if (!botToken || !chatId) {
    return false;
  }

  try {
    const text = [
      `🚨 [${alert.severity.toUpperCase()}] ${alert.title}`,
      `Source: ${alert.source}`,
      "",
      JSON.stringify(alert.details, null, 2).slice(0, 3500),
    ].join("\n");

    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        disable_web_page_preview: true,
      }),
    });

    return response.ok;
  } catch (err) {
    console.error("[ALERT_DISPATCH_FAILED]", err);
    return false;
  }
}
