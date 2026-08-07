import { noStoreJson } from "@/lib/server/responses";
import { rateLimit, readLimitedJson } from "@/lib/server/rateLimit";
import { createSupabaseAdminClient } from "@/lib/server/supabaseAdmin";

const QUEUE_SECRET = process.env.COMMUNITY_QUEUE_SECRET;
const MAX_BATCH_SIZE = 50;

export async function POST(request: Request) {
  const limited = rateLimit(request, "community:queue", 120, 60_000);
  if (!limited.allowed) return noStoreJson({ error: "Rate limit exceeded" }, { status: 429 });

  if (!QUEUE_SECRET) {
    console.error("Community queue worker is not configured");
    return noStoreJson({ error: "Service unavailable" }, { status: 503 });
  }
  if (request.headers.get("x-instead-community-secret") !== QUEUE_SECRET) {
    return noStoreJson({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { action?: string; limit?: number; ids?: string[]; status?: string; errorMessage?: string };
  try {
    body = await readLimitedJson(request, 16 * 1024);
  } catch {
    return noStoreJson({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (body.action === "claim") return claimMessages(Number(body.limit || 25));
  if (body.action === "mark") return markMessages(body);
  return noStoreJson({ error: "Invalid action" }, { status: 400 });
}

async function claimMessages(limit: number) {
  const supabase = createSupabaseAdminClient();
  const batchSize = Math.max(1, Math.min(MAX_BATCH_SIZE, Math.floor(limit || 25)));
  const now = new Date().toISOString();

  const queued = await supabase
    .from("community_message_queue")
    .select("*")
    .eq("status", "queued")
    .lte("scheduled_at", now)
    .order("scheduled_at", { ascending: true })
    .limit(batchSize);

  if (queued.error) return noStoreJson({ error: "Could not claim messages" }, { status: 500 });
  const ids = (queued.data ?? []).map((item) => item.id);
  if (ids.length === 0) return noStoreJson({ messages: [] });

  const claimed = await supabase
    .from("community_message_queue")
    .update({
      status: "processing",
      metadata: {
        claimed_at: now,
      },
    })
    .in("id", ids)
    .eq("status", "queued")
    .select("*");

  if (claimed.error) return noStoreJson({ error: "Could not update claimed messages" }, { status: 500 });
  return noStoreJson({ messages: claimed.data ?? [] });
}

async function markMessages(body: { ids?: string[]; status?: string; errorMessage?: string }) {
  const ids = (body.ids ?? []).filter((id) => /^[0-9a-fA-F-]{36}$/.test(id)).slice(0, MAX_BATCH_SIZE);
  if (ids.length === 0) return noStoreJson({ error: "No valid message ids" }, { status: 400 });
  if (!["sent", "failed", "cancelled"].includes(body.status ?? "")) {
    return noStoreJson({ error: "Invalid status" }, { status: 400 });
  }

  const status = body.status as "sent" | "failed" | "cancelled";
  const patch: Record<string, unknown> = {
    status,
    error_message: status === "failed" ? String(body.errorMessage || "Worker reported failure").slice(0, 500) : null,
  };
  if (status === "sent") patch.sent_at = new Date().toISOString();

  const supabase = createSupabaseAdminClient();
  const updated = await supabase
    .from("community_message_queue")
    .update(patch)
    .in("id", ids)
    .in("status", ["queued", "processing"])
    .select("id,status,sent_at,error_message");

  if (updated.error) return noStoreJson({ error: "Could not mark messages" }, { status: 500 });
  return noStoreJson({ messages: updated.data ?? [] });
}
