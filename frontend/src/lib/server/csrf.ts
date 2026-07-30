import { NextResponse } from "next/server";

export function requireSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });

  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const protocol = request.headers.get("x-forwarded-proto") ?? "https";
  if (!host) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });

  const expectedOrigin = `${protocol}://${host}`;
  if (origin !== expectedOrigin) {
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  }

  return null;
}
