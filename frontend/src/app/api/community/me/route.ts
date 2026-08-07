import { noStoreJson } from "@/lib/server/responses";
import { requireSameOrigin } from "@/lib/server/csrf";
import { rateLimit, readLimitedJson } from "@/lib/server/rateLimit";
import { getCommunityOverview, normalizeWallet, upsertCommunityProfile } from "@/lib/server/community";

export async function GET(request: Request) {
  const limited = rateLimit(request, "community:me:get", 90, 60_000);
  if (!limited.allowed) return noStoreJson({ error: "Rate limit exceeded" }, { status: 429 });

  const { searchParams } = new URL(request.url);
  const wallet = searchParams.get("wallet") || "";
  if (wallet && !/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
    return noStoreJson({ error: "Invalid wallet" }, { status: 400 });
  }

  try {
    return noStoreJson(await getCommunityOverview(wallet ? normalizeWallet(wallet) : undefined));
  } catch (error) {
    console.error("Community overview failed", error);
    return noStoreJson({ error: "Community service unavailable" }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const csrfError = requireSameOrigin(request);
  if (csrfError) return csrfError;

  const limited = rateLimit(request, "community:me:post", 20, 60_000);
  if (!limited.allowed) return noStoreJson({ error: "Rate limit exceeded" }, { status: 429 });

  try {
    const body = await readLimitedJson<any>(request, 24 * 1024);
    const wallet = String(body.wallet || "");
    if (!/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
      return noStoreJson({ error: "Invalid wallet" }, { status: 400 });
    }

    const member = await upsertCommunityProfile({
      wallet,
      discordUsername: cleanHandle(body.discordUsername),
      telegramUsername: cleanHandle(body.telegramUsername),
      xUsername: cleanHandle(body.xUsername),
      farcasterUsername: cleanHandle(body.farcasterUsername),
      redditUsername: cleanHandle(body.redditUsername),
      youtubeUsername: cleanHandle(body.youtubeUsername),
      tiktokUsername: cleanHandle(body.tiktokUsername),
      newsletterEmail: cleanEmail(body.newsletterEmail),
      referredBy: cleanReferral(body.referredBy),
    });

    return noStoreJson({ member });
  } catch (error) {
    console.error("Community profile upsert failed", error);
    return noStoreJson({ error: "Could not save profile" }, { status: 500 });
  }
}

function cleanHandle(value: unknown) {
  return String(value || "").replace(/^@/, "").replace(/[^\w.-]/g, "").slice(0, 64) || undefined;
}

function cleanReferral(value: unknown) {
  return String(value || "").replace(/[^\w-]/g, "").slice(0, 32) || undefined;
}

function cleanEmail(value: unknown) {
  const email = String(value || "").trim().toLowerCase().slice(0, 120);
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : undefined;
}
