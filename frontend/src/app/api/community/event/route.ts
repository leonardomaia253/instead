import { noStoreJson } from "@/lib/server/responses";
import { requireSameOrigin } from "@/lib/server/csrf";
import { rateLimit, readLimitedJson } from "@/lib/server/rateLimit";
import { recordCommunityEvent } from "@/lib/server/community";

export async function POST(request: Request) {
  const csrfError = requireSameOrigin(request);
  if (csrfError) return csrfError;

  const limited = rateLimit(request, "community:event", 30, 60_000);
  if (!limited.allowed) return noStoreJson({ error: "Rate limit exceeded" }, { status: 429 });

  try {
    const body = await readLimitedJson<any>(request, 16 * 1024);
    const wallet = String(body.wallet || "");
    if (!/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
      return noStoreJson({ error: "Invalid wallet" }, { status: 400 });
    }

    await recordCommunityEvent({
      wallet,
      missionCode: cleanCode(body.missionCode),
      channelKind: cleanCode(body.channelKind) ?? "platform",
      eventType: cleanCode(body.eventType) ?? "manual_signal",
      points: Number(body.points || 0),
      status: body.status === "pending" ? "pending" : "approved",
      metadata: typeof body.metadata === "object" && body.metadata ? body.metadata : {},
    });

    return noStoreJson({ ok: true });
  } catch (error) {
    console.error("Community event failed", error);
    return noStoreJson({ error: "Could not record event" }, { status: 500 });
  }
}

function cleanCode(value: unknown) {
  return String(value || "").replace(/[^\w-]/g, "").slice(0, 64) || undefined;
}
