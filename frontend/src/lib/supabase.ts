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
    throw new Error("Supabase não está configurado neste build. Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY e gere um novo deploy.");
  }
}

export function getSupabaseFunctionUrl(functionName: string) {
  assertSupabaseConfigured();
  return `${supabaseUrl}/functions/v1/${functionName}`;
}

function disabledSupabaseError() {
  return new Error("Supabase não está configurado neste build.");
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
  token_template?: string | null;
  launch_mode?: string | null;
  taxable?: boolean | null;
  tax_bps?: number | null;
  burn_tax?: boolean | null;
  max_wallet_bps?: number | null;
  liquidity_eth?: string | number | null;
  lp_recipient?: string | null;
  lp_lock_status?: string | null;
  tx_hash: string;
  chain_id: number;
  created_at: string;
};

export type Audit = {
  id: string;
  user_wallet: string;
  action: string;
  operation_id?: string | null;
  tx_hash?: string | null;
  chain_id?: number | null;
  status?: "pending" | "confirmed" | "mismatch" | "failed" | "ignored";
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

export type ReconciliationOperation = {
  operation_id: string;
  user_wallet: string;
  vertical: "lending" | "token_factory" | "staking";
  action: string;
  tx_hash: string;
  chain_id: number;
  expected_state?: Record<string, unknown>;
  status?: "pending" | "confirmed" | "mismatch" | "failed" | "ignored";
};

function normalizeTxHash(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value.toLowerCase() : null;
}

function buildOperationId(userWallet: string, action: string, txHash?: string | null) {
  return `${userWallet.toLowerCase()}:${action}:${txHash?.toLowerCase() ?? crypto.randomUUID()}`;
}

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
    .upsert(
      {
        ...token,
        creator_wallet: token.creator_wallet.toLowerCase(),
        tx_hash: token.tx_hash.toLowerCase(),
        status: "confirmed",
      },
      { onConflict: "tx_hash,chain_id" },
    )
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
  const txHash = normalizeTxHash(audit.tx_hash ?? audit.metadata?.tx_hash);
  const operationId = audit.operation_id ?? buildOperationId(audit.user_wallet, audit.action, txHash);
  const { data, error } = await supabase
    .from("audits")
    .upsert(
      {
        ...audit,
        user_wallet: audit.user_wallet.toLowerCase(),
        operation_id: operationId,
        tx_hash: txHash,
        chain_id: audit.chain_id ?? audit.metadata?.chain_id ?? null,
        status: audit.status ?? "confirmed",
      },
      { onConflict: "operation_id" },
    )
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
      last_tx_hash: normalizeTxHash(position.last_tx_hash ?? position.tx_hash),
      operation_status: position.operation_status ?? "confirmed",
      updated_at: new Date().toISOString()
    }, { 
      onConflict: "wallet_address,borrow_asset,chain_id" 
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function enqueueReconciliation(operation: ReconciliationOperation) {
  assertSupabaseConfigured();
  const { data, error } = await supabase
    .from("operation_reconciliation_queue")
    .upsert(
      {
        ...operation,
        user_wallet: operation.user_wallet.toLowerCase(),
        tx_hash: operation.tx_hash.toLowerCase(),
        expected_state: operation.expected_state ?? {},
        status: operation.status ?? "pending",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "operation_id" },
    )
    .select()
    .single();

  if (error) throw error;
  return data;
}
