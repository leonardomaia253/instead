import crypto from "node:crypto";

const WALLET_SESSION_COOKIE = "instead_wallet_session";

function base64UrlToBuffer(value: string) {
  return Buffer.from(value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "="), "base64");
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

  const [encodedHeader, encodedPayload, encodedSignature] = token.split(".");
  if (!encodedHeader || !encodedPayload || !encodedSignature) return null;

  const expected = crypto.createHmac("sha256", secret).update(`${encodedHeader}.${encodedPayload}`).digest();
  const received = base64UrlToBuffer(encodedSignature);
  if (expected.length !== received.length || !crypto.timingSafeEqual(expected, received)) return null;

  const payload = JSON.parse(base64UrlToBuffer(encodedPayload).toString("utf8")) as {
    exp?: number;
    wallet_address?: string;
    is_admin?: boolean;
  };
  if (!payload.exp || payload.exp * 1000 < Date.now()) return null;
  return payload;
}
