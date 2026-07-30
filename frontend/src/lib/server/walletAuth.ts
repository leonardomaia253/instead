import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

const WALLET_SESSION_COOKIE = "instead_wallet_session";

type WalletSession = {
  exp?: number;
  wallet_address?: string;
  is_admin?: boolean;
};

type AdminWalletSession = WalletSession & {
  wallet_address: string;
  is_admin: true;
};

function base64UrlToBuffer(value: string) {
  return Buffer.from(
    value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "="),
    "base64"
  );
}

export function verifyWalletSession(request: Request) {
  const secret = process.env.SUPABASE_JWT_SECRET;
  if (!secret) return null;

  const cookie = request.headers
    .get("cookie")
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${WALLET_SESSION_COOKIE}=`));
  const token = cookie ? decodeURIComponent(cookie.slice(WALLET_SESSION_COOKIE.length + 1)) : null;
  if (!token) return null;
  return verifyWalletToken(token);
}

export function verifyWalletToken(token: string) {
  const secret = process.env.SUPABASE_JWT_SECRET;
  if (!secret) return null;

  const [encodedHeader, encodedPayload, encodedSignature] = token.split(".");
  if (!encodedHeader || !encodedPayload || !encodedSignature) return null;
  let header: { alg?: string; typ?: string };
  try {
    header = JSON.parse(base64UrlToBuffer(encodedHeader).toString("utf8"));
  } catch {
    return null;
  }
  if (header.alg !== "HS256" || (header.typ && header.typ !== "JWT")) return null;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest();
  const received = base64UrlToBuffer(encodedSignature);
  if (expected.length !== received.length || !crypto.timingSafeEqual(expected, received)) return null;

  let payload: WalletSession;
  try {
    payload = JSON.parse(base64UrlToBuffer(encodedPayload).toString("utf8"));
  } catch {
    return null;
  }
  if (!payload.exp || payload.exp * 1000 < Date.now()) return null;
  return payload;
}

/**
 * Middleware helper para rotas de API admin.
 * Retorna NextResponse 401 se sessão inválida ou não-admin.
 * Retorna null se autenticado — o caller pode prosseguir.
 */
export async function verifyAdminWallet(req: NextRequest): Promise<NextResponse | null> {
  const session = verifyWalletSession(req);
  if (!session || !session.is_admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export function getAdminWalletSession(req: NextRequest): AdminWalletSession | null {
  const session = verifyWalletSession(req);
  if (!session || !session.is_admin || !session.wallet_address) return null;
  return session as AdminWalletSession;
}
