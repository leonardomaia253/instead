import { NextRequest, NextResponse } from "next/server";
import createMiddleware from 'next-intl/middleware';
import { locales, defaultLocale, localePrefix } from './navigation';

const intlMiddleware = createMiddleware({
  locales,
  defaultLocale,
  localePrefix
});

export const config = {
  matcher: [
    /*
     * Match all paths except for:
     * 1. /api routes
     * 2. /_next (Next.js internals)
     * 3. /_static (inside /public)
     * 4. all root files inside /public (e.g. /favicon.ico)
     */
    "/((?!api/|_next/|_static/|_vercel|[\\w-]+\\.\\w+).*)",
  ],
};

export default async function middleware(req: NextRequest) {
  const url = req.nextUrl;

  // 1. IP and Header based Locale Detection
  // Check if we already have a locale prefix in the URL
  const { pathname } = url;
  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  if (!pathnameHasLocale) {
    // Detect from Cloudflare or Vercel Geolocation headers if available
    const country = req.headers.get('x-vercel-ip-country') || req.headers.get('cf-ipcountry') || 'US';
    const acceptLanguage = req.headers.get('accept-language') || '';
    
    let detectedLocale = defaultLocale;
    
    // Simple mapping: Brazil -> pt, Others -> en
    if (country === 'BR' || acceptLanguage.toLowerCase().includes('pt')) {
      detectedLocale = 'pt';
    }

    // Redirect to the detected locale if it's not the default or if we want to enforce prefix
    // next-intl middleware handles this as well, but we can nudge it here
  }

  // Admin protection logic remains
  if (url.pathname.startsWith("/admin") && url.pathname !== "/admin/login") {
     // Admin check...
  }

  // Use next-intl middleware
  return intlMiddleware(req);
}
