import { createClient } from "@supabase/supabase-js";

const WALLET_SESSION_KEY = "instead_wallet_access_token";
const WALLET_SESSION_COOKIE = "instead_wallet_session";

function validPublicEnv(name: string) {
  const value = process.env[name];
  if (!value || value.includes("your-") || value === "0x...") return null;
  return value;
}

const supabaseUrl = validPublicEnv("NEXT_PUBLIC_SUPABASE_URL");
const supabaseAnonKey = validPublicEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export function assertSupabaseConfigured() {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase nao esta configurado neste build. Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY e gere um novo deploy.");
  }
}

export function getSupabaseFunctionUrl(functionName: string) {
  assertSupabaseConfigured();
  return `${supabaseUrl}/functions/v1/${functionName}`;
}

function disabledSupabaseError() {
  return new Error("Supabase nao esta configurado neste build.");
}

function createDisabledQuery() {
  const response = () => Promise.resolve({ data: null, error: disabledSupabaseError() });
  const builder: Record<string, unknown> = {
    then: response().then.bind(response()),
    catch: response().catch.bind(response()),
    finally: response().finally.bind(response()),
  };
  const passthroughMethods = [
    "select",
    "insert",
    "upsert",
    "update",
    "delete",
    "eq",
    "neq",
    "order",
    "range",
    "limit",
    "is",
  ];
  for (const method of passthroughMethods) builder[method] = () => builder;
  builder.single = response;
  builder.maybeSingle = response;
  return builder;
}

function createDisabledSupabaseClient() {
  return {
    from: () => createDisabledQuery(),
    removeChannel: () => "ok",
    channel: () => ({
      on: () => ({
        subscribe: () => ({ unsubscribe: () => undefined }),
      }),
      subscribe: () => ({ unsubscribe: () => undefined }),
    }),
    auth: {
      signInWithPassword: async () => ({ data: null, error: disabledSupabaseError() }),
      getUser: async () => ({ data: { user: null }, error: disabledSupabaseError() }),
    },
    functions: {
      invoke: async () => ({ data: null, error: disabledSupabaseError() }),
    },
  } as unknown as ReturnType<typeof createClient>;
}

function getStoredWalletAccessToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(WALLET_SESSION_KEY);
}

export function setWalletAccessToken(token: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(WALLET_SESSION_KEY, token);
  document.cookie = `${WALLET_SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; Max-Age=3600; SameSite=Lax; Secure`;
}

export function clearWalletAccessToken() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(WALLET_SESSION_KEY);
  document.cookie = `${WALLET_SESSION_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax; Secure`;
}

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      accessToken: async () => getStoredWalletAccessToken(),
    })
  : createDisabledSupabaseClient();

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
  assertSupabaseConfigured();
  const { data, error } = await supabase
    .from("generated_tokens")
    .select("*")
    .order("created_at", { ascending: false })
    .range(page * limit, (page + 1) * limit - 1);

  if (error) throw error;
  return data as GeneratedToken[];
}

export async function getTokensByCreator(walletAddress: string) {
  assertSupabaseConfigured();
  const { data, error } = await supabase
    .from("generated_tokens")
    .select("*")
    .eq("creator_wallet", walletAddress.toLowerCase())
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as GeneratedToken[];
}

export async function insertGeneratedToken(token: Omit<GeneratedToken, "id" | "created_at">) {
  assertSupabaseConfigured();
  const { data, error } = await supabase
    .from("generated_tokens")
    .insert({ ...token, creator_wallet: token.creator_wallet.toLowerCase() })
    .select()
    .single();

  if (error) throw error;
  return data as GeneratedToken;
}

export async function upsertUserProfile(profile: Omit<UserProfile, "id" | "created_at">) {
  assertSupabaseConfigured();
  const { data, error } = await supabase
    .from("users")
    .upsert({ ...profile, wallet_address: profile.wallet_address.toLowerCase() }, { onConflict: "wallet_address" })
    .select()
    .single();

  if (error) throw error;
  return data as UserProfile;
}

export async function insertAudit(audit: Omit<Audit, "id" | "created_at">) {
  assertSupabaseConfigured();
  const { data, error } = await supabase
    .from("audits")
    .insert({ ...audit, user_wallet: audit.user_wallet.toLowerCase() })
    .select()
    .single();

  if (error) throw error;
  return data as Audit;
}

export async function getAuditsByWallet(walletAddress: string) {
  assertSupabaseConfigured();
  const { data, error } = await supabase
    .from("audits")
    .select("*")
    .eq("user_wallet", walletAddress.toLowerCase())
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as Audit[];
}

export async function getStakingPools() {
  assertSupabaseConfigured();
  const { data, error } = await supabase
    .from("staking_pools")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data as StakingPool[];
}

export async function getPlatformStats() {
  assertSupabaseConfigured();
  const { data, error } = await supabase
    .from("platform_stats")
    .select("*");

  if (error) throw error;
  return data as PlatformStat[];
}

export async function upsertLendingPosition(position: any) {
  assertSupabaseConfigured();
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
