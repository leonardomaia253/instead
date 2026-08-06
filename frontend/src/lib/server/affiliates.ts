import crypto from "node:crypto";
import { createSupabaseAdminClient } from "./supabaseAdmin";

const REFERRAL_RE = /^[a-z0-9][a-z0-9_-]{2,31}$/;

function normalizeCode(value: unknown) {
  const code = String(value ?? "").trim().toLowerCase();
  return REFERRAL_RE.test(code) ? code : null;
}

function fallbackReferralCode(walletAddress: string) {
  return `aff_${walletAddress.toLowerCase().slice(2, 10)}`;
}

export async function getOrCreateAffiliateProfile(input: {
  walletAddress: string;
  displayName?: string | null;
  email?: string | null;
  referralCode?: string | null;
}) {
  const wallet = input.walletAddress.toLowerCase();
  const supabase = createSupabaseAdminClient();
  const existing = await supabase.from("affiliate_profiles").select("*").eq("wallet_address", wallet).maybeSingle();
  if (existing.error) throw existing.error;
  if (existing.data) return existing.data;

  const { data, error } = await supabase
    .from("affiliate_profiles")
    .insert({
      wallet_address: wallet,
      referral_code: normalizeCode(input.referralCode) ?? fallbackReferralCode(wallet),
      display_name: input.displayName ?? null,
      email: input.email ?? null,
      status: "pending",
      payout_wallet: wallet,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function recordAffiliateClick(input: {
  referralCode: string;
  landingPath?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const referralCode = normalizeCode(input.referralCode);
  if (!referralCode) return null;
  const supabase = createSupabaseAdminClient();
  const { data: affiliate } = await supabase.from("affiliate_profiles").select("id").eq("referral_code", referralCode).eq("status", "active").maybeSingle();
  const ipHash = input.ip ? crypto.createHash("sha256").update(input.ip).digest("hex") : null;
  const { data, error } = await supabase
    .from("affiliate_clicks")
    .insert({
      affiliate_id: affiliate?.id ?? null,
      referral_code: referralCode,
      landing_path: input.landingPath ?? null,
      ip_hash: ipHash,
      user_agent: input.userAgent?.slice(0, 500) ?? null,
      metadata: input.metadata ?? {},
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function resolveAffiliateByCode(referralCode: unknown) {
  const code = normalizeCode(referralCode);
  if (!code) return null;
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("affiliate_profiles")
    .select("id,wallet_address,referral_code,status,default_commission_bps")
    .eq("referral_code", code)
    .eq("status", "active")
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createAffiliateCommissionForPayment(payment: {
  id: string;
  wallet_address: string | null;
  vertical: string;
  product_code: string;
  amount_cents: number;
  currency: string;
  metadata: Record<string, unknown>;
}) {
  const affiliate = await resolveAffiliateByCode(payment.metadata?.referral_code);
  if (!affiliate) return;
  if (payment.wallet_address && affiliate.wallet_address.toLowerCase() === payment.wallet_address.toLowerCase()) return;

  const commissionBps = Number(payment.metadata?.affiliate_commission_bps ?? affiliate.default_commission_bps ?? 0);
  if (!Number.isInteger(commissionBps) || commissionBps <= 0) return;
  const commissionAmount = Math.floor((Number(payment.amount_cents) * commissionBps) / 10_000);
  const supabase = createSupabaseAdminClient();

  const { data: conversion, error: conversionError } = await supabase
    .from("affiliate_conversions")
    .upsert({
      affiliate_id: affiliate.id,
      payment_intent_id: payment.id,
      buyer_wallet: payment.wallet_address?.toLowerCase() ?? null,
      product_code: payment.product_code,
      vertical: payment.vertical,
      amount_cents: Number(payment.amount_cents),
      currency: payment.currency,
      status: "pending",
      metadata: { referral_code: affiliate.referral_code },
      updated_at: new Date().toISOString(),
    }, { onConflict: "payment_intent_id" })
    .select()
    .single();
  if (conversionError) throw conversionError;

  const { error: commissionError } = await supabase
    .from("affiliate_commissions")
    .upsert({
      affiliate_id: affiliate.id,
      conversion_id: conversion.id,
      amount_cents: commissionAmount,
      currency: payment.currency,
      commission_bps: commissionBps,
      status: "pending",
      metadata: { payment_intent_id: payment.id, product_code: payment.product_code },
      updated_at: new Date().toISOString(),
    }, { onConflict: "conversion_id" });
  if (commissionError) throw commissionError;
}
