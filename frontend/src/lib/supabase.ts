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
