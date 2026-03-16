import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ─── Tipos do Banco de Dados ──────────────────────────────────────────────────
export type UserProfile = {
  id: string;
  wallet_address: string;
  username: string | null;
  avatar_url: string | null;
  is_admin: boolean;
  created_at: string;
};

export type GeneratedToken = {
  id: string;
  token_address: string;
  creator_wallet: string;
  name: string;
  symbol: string;
  initial_supply: number;
  max_supply: number;
  mintable: boolean;
  tx_hash: string;
  chain_id: number;
  created_at: string;
};

export type Audit = {
  id: string;
  user_wallet: string;
  action: string;
  metadata: any;
  created_at: string;
};

export type StakingPool = {
  id: string;
  name: string;
  symbol: string;
  apr: string;
  lock_period: string;
  tvl: string;
  description: string;
  icon_name: string;
  color: string;
  is_active: boolean;
  created_at: string;
};

export type PlatformStat = {
  key: string;
  value: string;
  updated_at: string;
};

// ─── Funções de acesso ao banco ───────────────────────────────────────────────

export async function getGeneratedTokens(page = 0, limit = 20) {
  const { data, error } = await supabase
    .from("generated_tokens")
    .select("*")
    .order("created_at", { ascending: false })
    .range(page * limit, (page + 1) * limit - 1);

  if (error) throw error;
  return data as GeneratedToken[];
}

export async function getTokensByCreator(walletAddress: string) {
  const { data, error } = await supabase
    .from("generated_tokens")
    .select("*")
    .eq("creator_wallet", walletAddress.toLowerCase())
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as GeneratedToken[];
}

export async function insertGeneratedToken(token: Omit<GeneratedToken, "id" | "created_at">) {
  const { data, error } = await supabase
    .from("generated_tokens")
    .insert({ ...token, creator_wallet: token.creator_wallet.toLowerCase() })
    .select()
    .single();

  if (error) throw error;
  return data as GeneratedToken;
}

export async function upsertUserProfile(profile: Omit<UserProfile, "id" | "created_at">) {
  const { data, error } = await supabase
    .from("users")
    .upsert({ ...profile, wallet_address: profile.wallet_address.toLowerCase() }, { onConflict: "wallet_address" })
    .select()
    .single();

  if (error) throw error;
  return data as UserProfile;
}

export async function insertAudit(audit: Omit<Audit, "id" | "created_at">) {
  const { data, error } = await supabase
    .from("audits")
    .insert({ ...audit, user_wallet: audit.user_wallet.toLowerCase() })
    .select()
    .single();

  if (error) throw error;
  return data as Audit;
}

export async function getStakingPools() {
  const { data, error } = await supabase
    .from("staking_pools")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data as StakingPool[];
}

export async function getPlatformStats() {
  const { data, error } = await supabase
    .from("platform_stats")
    .select("*");

  if (error) throw error;
  return data as PlatformStat[];
}

export async function upsertLendingPosition(position: any) {
  const { data, error } = await supabase
    .from("lending_positions")
    .upsert({ 
      ...position, 
      wallet_address: position.wallet_address.toLowerCase(),
      updated_at: new Date().toISOString()
    }, { 
      onConflict: "wallet_address,borrow_asset,chain_id" 
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}
