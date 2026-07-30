import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { json, preflight, rateLimit } from "../_shared/security.ts";

type NetworkCheck = {
  id: string;
  label: string;
  symbol: string;
  rpcEnv: string;
  fallbackRpc: string;
  thresholdEnv: string;
  defaultThreshold: string;
  decimals: number;
  kind: "evm" | "solana";
};

const EVM_ADDRESS = Deno.env.get("BALANCE_MONITOR_EVM_ADDRESS") || Deno.env.get("PRODUCTION_MULTISIG_ADDRESS");
const SOLANA_ADDRESS = Deno.env.get("BALANCE_MONITOR_SOLANA_ADDRESS") || Deno.env.get("NEXT_PUBLIC_SOLANA_DEPLOYER_ADDRESS");

const NETWORKS: NetworkCheck[] = [
  { id: "mainnet", label: "Ethereum", symbol: "ETH", rpcEnv: "MAINNET_RPC_URL", fallbackRpc: "https://ethereum-rpc.publicnode.com", thresholdEnv: "BALANCE_THRESHOLD_MAINNET_ETH", defaultThreshold: "0.02", decimals: 18, kind: "evm" },
  { id: "base", label: "Base", symbol: "ETH", rpcEnv: "BASE_RPC_URL", fallbackRpc: "https://mainnet.base.org", thresholdEnv: "BALANCE_THRESHOLD_BASE_ETH", defaultThreshold: "0.002", decimals: 18, kind: "evm" },
  { id: "arbitrum", label: "Arbitrum", symbol: "ETH", rpcEnv: "ARBITRUM_RPC_URL", fallbackRpc: "https://arb1.arbitrum.io/rpc", thresholdEnv: "BALANCE_THRESHOLD_ARBITRUM_ETH", defaultThreshold: "0.002", decimals: 18, kind: "evm" },
  { id: "optimism", label: "Optimism", symbol: "ETH", rpcEnv: "OPTIMISM_RPC_URL", fallbackRpc: "https://mainnet.optimism.io", thresholdEnv: "BALANCE_THRESHOLD_OPTIMISM_ETH", defaultThreshold: "0.002", decimals: 18, kind: "evm" },
  { id: "polygon", label: "Polygon", symbol: "POL", rpcEnv: "POLYGON_RPC_URL", fallbackRpc: "https://polygon-bor-rpc.publicnode.com", thresholdEnv: "BALANCE_THRESHOLD_POLYGON_POL", defaultThreshold: "5", decimals: 18, kind: "evm" },
  { id: "avalanche", label: "Avalanche", symbol: "AVAX", rpcEnv: "AVALANCHE_RPC_URL", fallbackRpc: "https://api.avax.network/ext/bc/C/rpc", thresholdEnv: "BALANCE_THRESHOLD_AVALANCHE_AVAX", defaultThreshold: "0.05", decimals: 18, kind: "evm" },
  { id: "bsc", label: "BNB Chain", symbol: "BNB", rpcEnv: "BSC_RPC_URL", fallbackRpc: "https://bsc-dataseed.binance.org", thresholdEnv: "BALANCE_THRESHOLD_BSC_BNB", defaultThreshold: "0.02", decimals: 18, kind: "evm" },
  { id: "solana", label: "Solana", symbol: "SOL", rpcEnv: "SOLANA_RPC_URL", fallbackRpc: "https://api.mainnet-beta.solana.com", thresholdEnv: "BALANCE_THRESHOLD_SOLANA_SOL", defaultThreshold: "3", decimals: 9, kind: "solana" },
];

function parseUnits(value: string, decimals: number): bigint {
  const [wholeRaw, fractionRaw = ""] = value.trim().split(".");
  const fraction = fractionRaw.padEnd(decimals, "0").slice(0, decimals);
  return BigInt(wholeRaw || "0") * 10n ** BigInt(decimals) + BigInt(fraction || "0");
}

function formatUnits(value: bigint, decimals: number, maxDecimals = 6): string {
  const base = 10n ** BigInt(decimals);
  const whole = value / base;
  const fraction = value % base;
  const fractionText = fraction.toString().padStart(decimals, "0").slice(0, maxDecimals).replace(/0+$/, "");
  return fractionText ? `${whole}.${fractionText}` : whole.toString();
}

async function rpc(url: string, method: string, params: unknown[]) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const payload = await response.json();
  if (!response.ok || payload.error) throw new Error(payload.error?.message || `HTTP ${response.status}`);
  return payload.result;
}

async function checkNetwork(network: NetworkCheck) {
  const address = network.kind === "solana" ? SOLANA_ADDRESS : EVM_ADDRESS;
  if (!address) return { ...network, status: "skipped", reason: `${network.kind === "solana" ? "BALANCE_MONITOR_SOLANA_ADDRESS" : "BALANCE_MONITOR_EVM_ADDRESS"} missing` };

  const rpcUrl = Deno.env.get(network.rpcEnv) || network.fallbackRpc;
  const threshold = parseUnits(Deno.env.get(network.thresholdEnv) || network.defaultThreshold, network.decimals);
  const rawBalance = network.kind === "solana"
    ? BigInt((await rpc(rpcUrl, "getBalance", [address])).value)
    : BigInt(await rpc(rpcUrl, "eth_getBalance", [address, "latest"]));

  return {
    ...network,
    address,
    balance: formatUnits(rawBalance, network.decimals),
    threshold: formatUnits(threshold, network.decimals),
    healthy: rawBalance >= threshold,
    status: rawBalance >= threshold ? "ok" : "low",
  };
}

async function sendTelegramAlert(lowBalances: Array<Record<string, unknown>>, errors: Array<Record<string, unknown>>) {
  const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
  const chatId = Deno.env.get("TELEGRAM_ALERT_CHAT_ID");
  if (!botToken || !chatId) return false;

  const lines = [
    "🚨 [WARNING] Low operational balances",
    "Source: supabase/balance-monitor",
    "",
    ...lowBalances.map((item) => `• ${item.label}: ${item.balance} ${item.symbol} < ${item.threshold} ${item.symbol}`),
  ];
  if (errors.length > 0) {
    lines.push("", "RPC errors:", ...errors.map((item) => `• ${item.label}: ${item.error}`));
  }

  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text: lines.join("\n"), disable_web_page_preview: true }),
  });
  return response.ok;
}

serve(async (req) => {
  const early = preflight(req);
  if (early) return early;

  const cronSecret = Deno.env.get("BALANCE_MONITOR_SECRET");
  if (!cronSecret) return json({ error: "Service unavailable" }, 503);
  if (req.headers.get("x-monitor-secret") !== cronSecret) return json({ error: "Unauthorized" }, 401);

  const limited = rateLimit(req, "balance-monitor");
  if (limited) return limited;

  const checks = [];
  const errors = [];

  for (const network of NETWORKS) {
    try {
      checks.push(await checkNetwork(network));
    } catch (error) {
      errors.push({ ...network, status: "error", error: error instanceof Error ? error.message : String(error) });
    }
  }

  const lowBalances = checks.filter((item) => item.status === "low");
  const alertSent = lowBalances.length > 0 || errors.length > 0
    ? await sendTelegramAlert(lowBalances, errors)
    : false;

  return json({
    ok: lowBalances.length === 0 && errors.length === 0,
    alertSent,
    lowBalances,
    errors,
    checks,
  });
});
