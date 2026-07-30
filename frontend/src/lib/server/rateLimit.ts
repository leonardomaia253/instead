const buckets = new Map<string, { count: number; resetAt: number }>();

function clientIp(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("cf-connecting-ip") ||
    "unknown"
  );
}

export function rateLimit(request: Request, scope: string, limit = 20, windowMs = 60_000) {
  const now = Date.now();
  const key = `${scope}:${clientIp(request)}`;
  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }
  current.count += 1;
  if (current.count > limit) {
    return { allowed: false, retryAfterSeconds: Math.ceil((current.resetAt - now) / 1000) };
  }
  return { allowed: true, retryAfterSeconds: 0 };
}

export async function readLimitedJson<T = unknown>(request: Request, maxBytes = 4096): Promise<T> {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > maxBytes) throw new Error("Payload too large");

  const text = await request.text();
  if (Buffer.byteLength(text, "utf8") > maxBytes) throw new Error("Payload too large");
  return JSON.parse(text || "{}") as T;
}

export async function readLimitedText(request: Request, maxBytes = 64 * 1024): Promise<string> {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > maxBytes) throw new Error("Payload too large");

  const text = await request.text();
  if (Buffer.byteLength(text, "utf8") > maxBytes) throw new Error("Payload too large");
  return text;
}
