import { noStoreJson } from "@/lib/server/responses";
import { rateLimit, readLimitedJson } from "@/lib/server/rateLimit";
import { recordCommunityEvent, upsertCommunityProfile } from "@/lib/server/community";

const DISCORD_WEBHOOK_SECRET = process.env.DISCORD_WEBHOOK_SECRET;

export async function POST(request: Request) {
  const limited = rateLimit(request, "discord:webhook", 80, 60_000);
  if (!limited.allowed) return noStoreJson({ error: "Rate limit exceeded" }, { status: 429 });

  if (!DISCORD_WEBHOOK_SECRET) {
    console.error("Discord webhook is not configured");
    return noStoreJson({ error: "Service unavailable" }, { status: 503 });
  }
  if (DISCORD_WEBHOOK_SECRET && request.headers.get("x-instead-discord-secret") !== DISCORD_WEBHOOK_SECRET) {
    return noStoreJson({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await readLimitedJson<any>(request, 32 * 1024);
    const wallet = String(body.wallet || "");
    if (!/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
      return noStoreJson({ error: "Invalid wallet" }, { status: 400 });
    }

    const username = String(body.discordUsername || body.username || "").replace(/[^\w.-]/g, "").slice(0, 64);
    await upsertCommunityProfile({ wallet, discordUsername: username });
    await recordCommunityEvent({
      wallet,
      missionCode: "connect-discord",
      channelKind: "discord",
      eventType: "discord_verified",
      points: 150,
      metadata: {
        discordUserId: String(body.discordUserId || "").slice(0, 80),
        guildId: String(body.guildId || "").slice(0, 80),
        roles: Array.isArray(body.roles) ? body.roles.slice(0, 20) : [],
      },
    });

    return noStoreJson({
      ok: true,
      recommendedRoles: ["Instead Member", "Verified Wallet", "Community XP"],
    });
  } catch (error) {
    console.error("Discord community webhook failed", error);
    return noStoreJson({ error: "Discord webhook failed" }, { status: 500 });
  }
}
