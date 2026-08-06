import { NextResponse } from "next/server";
import { rateLimit, readLimitedJson } from "@/lib/server/rateLimit";
import { recordAffiliateClick } from "@/lib/server/affiliates";

export async function POST(request: Request) {
  const limited = rateLimit(request, "affiliates:click", 120, 60_000);
  if (!limited.allowed) return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  try {
    const body = await readLimitedJson<{ referralCode?: string; landingPath?: string }>(request, 2048);
    if (!body.referralCode) return NextResponse.json({ error: "referralCode is required" }, { status: 400 });
    const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
    await recordAffiliateClick({
      referralCode: body.referralCode,
      landingPath: body.landingPath ?? null,
      ip: forwardedFor,
      userAgent: request.headers.get("user-agent"),
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Could not record affiliate click" }, { status: 500 });
  }
}
