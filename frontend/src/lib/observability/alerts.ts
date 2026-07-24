/**
 * System Operational Alerting Utility
 * Dispatches high-priority alerts to configured alert webhooks (Discord / Slack / Telegram).
 */

export interface SystemAlertPayload {
  title: string;
  severity: "info" | "warning" | "critical";
  source: string;
  details: Record<string, unknown>;
}

export async function sendSystemAlert(alert: SystemAlertPayload): Promise<boolean> {
  const webhookUrl = process.env.ALERT_WEBHOOK_URL;
  
  // Format console log regardless of webhook status for internal log monitoring
  console.warn(
    `[ALERT_${alert.severity.toUpperCase()}] [${alert.source}] ${alert.title}`,
    JSON.stringify(alert.details)
  );

  if (!webhookUrl) {
    return false;
  }

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: `🚨 **[${alert.severity.toUpperCase()}] ${alert.title}**\n**Source:** ${alert.source}\n\`\`\`json\n${JSON.stringify(alert.details, null, 2)}\n\`\`\``,
      }),
    });
    return response.ok;
  } catch (err) {
    console.error("[ALERT_DISPATCH_FAILED]", err);
    return false;
  }
}
