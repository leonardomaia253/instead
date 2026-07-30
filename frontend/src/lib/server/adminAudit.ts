import { createSupabaseAdminClient } from "./supabaseAdmin";

function clientIp(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("cf-connecting-ip") ||
    null
  );
}

export async function insertAdminAuditLog(input: {
  request: Request;
  adminWallet: string;
  action: string;
  targetResource: string;
  details?: Record<string, unknown>;
}) {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("admin_audit_logs").insert({
    admin_wallet: input.adminWallet.toLowerCase(),
    action: input.action,
    target_resource: input.targetResource,
    details: input.details ?? {},
    ip_address: clientIp(input.request),
    user_agent: input.request.headers.get("user-agent"),
  });
  if (error) throw error;
}
