import { NextResponse } from "next/server";
import { requireSameOrigin } from "@/lib/server/csrf";
import { rateLimit, readLimitedJson } from "@/lib/server/rateLimit";
import { verifyWalletSession } from "@/lib/server/walletAuth";
import { createDiditSession, type DiditVerificationKind } from "@/lib/server/didit";

type Body = {
  walletAddress?: string;
  email?: string;
  kind?: DiditVerificationKind;
  consent?: boolean;
  metadata?: Record<string, unknown>;
};

export async function POST(request: Request) {
  try {
    const csrfError = requireSameOrigin(request);
    if (csrfError) return csrfError;

    const limited = rateLimit(request, "compliance:didit:session", 8, 60_000);
    if (!limited.allowed) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429, headers: { "Retry-After": String(limited.retryAfterSeconds) } });
    }

    const body = await readLimitedJson<Body>(request, 4096);
    const session = verifyWalletSession(request);
    if (!session?.wallet_address || session.wallet_address.toLowerCase() !== String(body.walletAddress ?? "").toLowerCase()) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (body.kind && body.kind !== "kyc" && body.kind !== "kyb") {
      return NextResponse.json({ error: "Unsupported verification kind" }, { status: 400 });
    }
    if (!body.consent) {
      return NextResponse.json({ error: "Compliance consent is required" }, { status: 400 });
    }

    const verification = await createDiditSession({
      walletAddress: session.wallet_address,
      email: body.email,
      kind: body.kind ?? "kyc",
      consentedAt: new Date().toISOString(),
      metadata: body.metadata,
    });
    return NextResponse.json({ verification });
  } catch (error) {
    console.error("Didit session creation failed", error);
    return NextResponse.json({ error: "Could not create verification session" }, { status: 500 });
  }
}
