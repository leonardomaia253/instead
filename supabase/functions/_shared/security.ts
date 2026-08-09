const DEFAULT_ALLOWED_HEADERS = "authorization, x-client-info, apikey, content-type, x-monitor-secret, x-automation-secret";
const DEFAULT_ALLOWED_METHODS = "POST, OPTIONS";
const DEFAULT_MAX_BODY_BYTES = 4096;
const DEFAULT_RATE_LIMIT_WINDOW_MS = 60_000;
const DEFAULT_RATE_LIMIT_REQUESTS = 20;

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, RateLimitBucket>();

export function corsHeaders() {
  const appOrigin = Deno.env.get("APP_ORIGIN");
  return {
    "Access-Control-Allow-Origin": appOrigin ?? "null",
    "Access-Control-Allow-Headers": DEFAULT_ALLOWED_HEADERS,
    "Access-Control-Allow-Methods": DEFAULT_ALLOWED_METHODS,
    "Vary": "Origin",
  };
}

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(), "Content-Type": "application/json" },
  });
}

export function getClientIp(req: Request) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? req.headers.get("cf-connecting-ip")
    ?? "unknown";
}

export function preflight(req: Request) {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders() });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  return null;
}

export function requireBearer(req: Request) {
  const authorization = req.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
  return null;
}

export function rateLimit(req: Request, scope: string) {
  const windowMs = Number(Deno.env.get("EDGE_RATE_LIMIT_WINDOW_MS") ?? DEFAULT_RATE_LIMIT_WINDOW_MS);
  const maxRequests = Number(Deno.env.get("EDGE_RATE_LIMIT_REQUESTS") ?? DEFAULT_RATE_LIMIT_REQUESTS);
  const key = `${scope}:${getClientIp(req)}:${req.headers.get("authorization")?.slice(0, 32) ?? "anonymous"}`;
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return null;
  }

  bucket.count += 1;
  if (bucket.count > maxRequests) {
    return json({ error: "Too many requests" }, 429);
  }

  return null;
}

export async function readJsonBody<T extends Record<string, unknown>>(
  req: Request,
  maxBytes = DEFAULT_MAX_BODY_BYTES,
) {
  const contentLength = Number(req.headers.get("content-length") ?? 0);
  if (contentLength > maxBytes) throw new Error("Payload too large");

  const text = await req.text();
  if (new TextEncoder().encode(text).length > maxBytes) throw new Error("Payload too large");
  return JSON.parse(text || "{}") as T;
}

export function cleanText(value: unknown, maxLength = 160) {
  return String(value ?? "")
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

export function cleanNumber(value: unknown, fallback = 0) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return number;
}
