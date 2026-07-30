import { NextResponse } from "next/server";
import { requireSameOrigin } from "@/lib/server/csrf";
import { rateLimit, readLimitedJson } from "@/lib/server/rateLimit";
import { verifyWalletToken } from "@/lib/server/walletAuth";

const WALLET_SESSION_COOKIE = "instead_wallet_session";

export async function POST(request: Request) {
  const csrfError = requireSameOrigin(request);
  if (csrfError) return csrfError;

  const limited = rateLimit(request, "auth:session", 20, 60_000);
  if (!limited.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const body = await readLimitedJson<{ token?: string }>(request, 4096).catch((): { token?: string } => ({}));
  const token = String(body.token ?? "");
  const payload = verifyWalletToken(token);
  if (!payload?.wallet_address) {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(WALLET_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60,
  });
  return response;
}

export async function DELETE(request: Request) {
  const csrfError = requireSameOrigin(request);
  if (csrfError) return csrfError;

  const limited = rateLimit(request, "auth:session", 20, 60_000);
  if (!limited.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(WALLET_SESSION_COOKIE, "", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
