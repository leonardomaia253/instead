import { noStoreJson } from "@/lib/server/responses";
import { requireSameOrigin } from "@/lib/server/csrf";
import { rateLimit, readLimitedJson } from "@/lib/server/rateLimit";
import { recordGovernanceVote } from "@/lib/server/community";

export async function POST(request: Request) {
  const csrfError = requireSameOrigin(request);
  if (csrfError) return csrfError;

  const limited = rateLimit(request, "community:vote", 20, 60_000);
  if (!limited.allowed) return noStoreJson({ error: "Rate limit exceeded" }, { status: 429 });

  try {
    const body = await readLimitedJson<any>(request, 12 * 1024);
    const wallet = String(body.wallet || "");
    const pollId = String(body.pollId || "");
    const optionText = String(body.optionText || "");
    if (!/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
      return noStoreJson({ error: "Invalid wallet" }, { status: 400 });
    }
    if (!/^[0-9a-fA-F-]{36}$/.test(pollId)) {
      return noStoreJson({ error: "Invalid poll" }, { status: 400 });
    }

    await recordGovernanceVote({ wallet, pollId, optionText });
    return noStoreJson({ ok: true });
  } catch (error) {
    console.error("Community vote failed", error);
    return noStoreJson({ error: "Could not record vote" }, { status: 500 });
  }
}
