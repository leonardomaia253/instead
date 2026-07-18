import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { routing } from './navigation';

const intlMiddleware = createMiddleware(routing);
const ADMIN_SESSION_COOKIE = 'instead_wallet_session';

function base64UrlToBytes(value: string) {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  const binary = atob(base64);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let index = 0; index < a.length; index += 1) diff |= a[index] ^ b[index];
  return diff === 0;
}

async function verifyJwt(token: string) {
  const secret = process.env.SUPABASE_JWT_SECRET;
  if (!secret) return null;

  const [encodedHeader, encodedPayload, encodedSignature] = token.split('.');
  if (!encodedHeader || !encodedPayload || !encodedSignature) return null;

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const expected = new Uint8Array(
    await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`)),
  );
  if (!timingSafeEqual(expected, base64UrlToBytes(encodedSignature))) return null;

  const payload = JSON.parse(new TextDecoder().decode(base64UrlToBytes(encodedPayload))) as {
    exp?: number;
    is_admin?: boolean;
  };
  if (!payload.exp || payload.exp * 1000 < Date.now()) return null;
  return payload;
}

function getLocale(pathname: string) {
  const segment = pathname.split('/')[1];
  return routing.locales.includes(segment as (typeof routing.locales)[number]) ? segment : routing.defaultLocale;
}

export default async function proxy(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  const locale = getLocale(pathname);
  const adminBase = `/${locale}/admin`;
  const adminLoginPath = `${adminBase}/login`;

  if (pathname.startsWith(adminBase) && pathname !== adminLoginPath) {
    const token = req.cookies.get(ADMIN_SESSION_COOKIE)?.value;
    const payload = token ? await verifyJwt(token) : null;

    if (!payload?.is_admin) {
      const loginUrl = req.nextUrl.clone();
      loginUrl.pathname = adminLoginPath;
      loginUrl.searchParams.set('next', pathname);
      const response = NextResponse.redirect(loginUrl);
      response.cookies.delete(ADMIN_SESSION_COOKIE);
      return response;
    }
  }

  return intlMiddleware(req);
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)']
};
