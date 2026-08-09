import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/server/rateLimit";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  const limited = rateLimit(request, "health", 120, 60_000);
  if (!limited.allowed) {
    return NextResponse.json(
      { error: "Too many requests" },
      {
        status: 429,
        headers: {
          "Cache-Control": "no-store, max-age=0",
          "Retry-After": String(limited.retryAfterSeconds),
        },
      },
    );
  }

  return NextResponse.json(
    {
      status: "ok",
      service: "instead-frontend",
      environment: process.env.NODE_ENV ?? "unknown",
      commit: process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.COMMIT_SHA ?? null,
      supabaseConfigured: Boolean(
        process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      ),
      productionLendingEnabled: process.env.NEXT_PUBLIC_ENABLE_PRODUCTION_LENDING === "true",
      walletAuth: "supabase-web3",
      checkedAt: new Date().toISOString(),
    },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    },
  );
}
