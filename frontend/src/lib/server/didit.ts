import crypto from "node:crypto";
import { createSupabaseAdminClient } from "./supabaseAdmin";

export type DiditVerificationKind = "kyc" | "kyb";

export type DiditSessionRequest = {
  walletAddress: string;
  email?: string;
  kind?: DiditVerificationKind;
  consentedAt: string;
  metadata?: Record<string, unknown>;
};

const EVM_ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DIDIT_STATUS_MAP: Record<string, string> = {
  "not started": "not_started",
  "in progress": "in_progress",
  "awaiting user": "awaiting_user",
  resubmitted: "resubmitted",
  "in review": "in_review",
  approved: "approved",
  declined: "declined",
  expired: "expired",
  abandoned: "abandoned",
  "kyc expired": "kyc_expired",
};

function appOrigin() {
  const origin = process.env.APP_ORIGIN || process.env.NEXT_PUBLIC_APP_ORIGIN;
  if (origin) return origin.replace(/\/$/, "");
  if (process.env.NODE_ENV !== "production") return "http://localhost:3000";
  throw new Error("APP_ORIGIN is required for Didit callbacks");
}

function requiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

export function normalizeDiditStatus(status: unknown) {
  const key = String(status ?? "not started").trim().toLowerCase();
  return DIDIT_STATUS_MAP[key] ?? "in_review";
}

export function diditVendorData(walletAddress: string, kind: DiditVerificationKind) {
  return `${kind}:wallet:${walletAddress.toLowerCase()}`;
}

export async function hasApprovedCompliance(walletAddress: string) {
  if (!EVM_ADDRESS_RE.test(walletAddress)) return false;
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("compliance_verifications")
    .select("id")
    .eq("provider", "didit")
    .eq("verification_kind", "kyc")
    .eq("wallet_address", walletAddress.toLowerCase())
    .eq("status", "approved")
    .limit(1);
  if (error) throw error;
  return Boolean(data?.length);
}

export async function createDiditSession(input: DiditSessionRequest) {
  const kind = input.kind ?? "kyc";
  const walletAddress = input.walletAddress.toLowerCase();
  if (!EVM_ADDRESS_RE.test(walletAddress)) throw new Error("Invalid wallet address");
  if (input.email && !EMAIL_RE.test(input.email)) throw new Error("Invalid email");
  if (!input.consentedAt) throw new Error("Compliance consent is required");

  const workflowId = kind === "kyb" ? requiredEnv("DIDIT_KYB_WORKFLOW_ID") : requiredEnv("DIDIT_KYC_WORKFLOW_ID");
  const vendorData = diditVendorData(walletAddress, kind);
  const payload = {
    workflow_id: workflowId,
    vendor_data: vendorData,
    callback: `${appOrigin()}/dashboard?verification=didit`,
    callback_method: "both",
    language: "pt-BR",
    metadata: {
      wallet_address: walletAddress,
      verification_kind: kind,
      ...(input.metadata ?? {}),
    },
    contact_details: {
      email: input.email || undefined,
      send_notification_emails: Boolean(input.email),
      email_lang: "pt-BR",
    },
  };

  const response = await fetch("https://verification.didit.me/v3/session/", {
    method: "POST",
    headers: {
      "x-api-key": requiredEnv("DIDIT_API_KEY"),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.message || "Didit session creation failed");

  const status = normalizeDiditStatus(body.status);
  const supabase = createSupabaseAdminClient();
  const record = {
    subject_type: "wallet",
    subject_id: walletAddress,
    wallet_address: walletAddress,
    email: input.email ?? null,
    provider: "didit",
    verification_kind: kind,
    provider_session_id: body.session_id,
    provider_session_number: body.session_number ?? null,
    provider_url: body.url,
    workflow_id: body.workflow_id ?? workflowId,
    workflow_version: body.workflow_version ?? null,
    vendor_data: body.vendor_data ?? vendorData,
    status,
    metadata: payload.metadata,
    consented_at: input.consentedAt,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("compliance_verifications")
    .upsert(record, { onConflict: "provider,provider_session_id" })
    .select("id,provider_session_id,provider_url,status,verification_kind")
    .single();
  if (error) throw error;
  return {
    id: data.id,
    sessionId: data.provider_session_id,
    url: data.provider_url,
    status: data.status,
    kind: data.verification_kind,
  };
}

export function verifyDiditWebhook(rawBody: string, signature: string | null, payload?: any) {
  const secret = requiredEnv("DIDIT_WEBHOOK_SECRET");
  if (!signature) return false;

  const rawExpected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const received = signature.replace(/^sha256=/i, "");
  if (rawExpected.length === received.length && crypto.timingSafeEqual(Buffer.from(rawExpected), Buffer.from(received))) {
    return true;
  }

  if (!payload) return false;
  const canonical = [
    payload.timestamp ?? "",
    payload.session_id ?? payload.business_session_id ?? "",
    payload.status ?? "",
    payload.webhook_type ?? "",
  ].join(":");
  const canonicalExpected = crypto.createHmac("sha256", secret).update(canonical).digest("hex");
  return canonicalExpected.length === received.length && crypto.timingSafeEqual(Buffer.from(canonicalExpected), Buffer.from(received));
}

export async function upsertDiditWebhookEvent(payload: any) {
  const status = normalizeDiditStatus(payload.status ?? payload.decision?.status);
  const sessionId = payload.session_id ?? payload.business_session_id ?? payload.decision?.session_id;
  if (!sessionId) throw new Error("Didit session id is required");
  const now = new Date().toISOString();
  const patch: Record<string, unknown> = {
    status,
    decision: payload.decision ?? {},
    metadata: payload.metadata ?? {},
    vendor_data: payload.vendor_data ?? undefined,
    workflow_id: payload.workflow_id ?? undefined,
    workflow_version: payload.workflow_version ?? undefined,
    updated_at: now,
  };
  if (status === "approved") patch.approved_at = now;
  if (status === "declined") patch.declined_at = now;

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("compliance_verifications")
    .update(patch)
    .eq("provider", "didit")
    .eq("provider_session_id", sessionId);
  if (error) throw error;
}
