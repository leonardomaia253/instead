import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const frontendEnvPath = resolve(root, "frontend/.env.local");

function parseEnvFile(path) {
  if (!existsSync(path)) return {};
  return Object.fromEntries(
    readFileSync(path, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const index = line.indexOf("=");
        return [line.slice(0, index).trim(), line.slice(index + 1).trim().replace(/^["']|["']$/g, "")];
      }),
  );
}

const env = { ...parseEnvFile(frontendEnvPath), ...process.env };

const EVM_ADDRESS = env.BALANCE_MONITOR_EVM_ADDRESS || env.ASSISTED_DEPLOYER_ADDRESS || env.PRODUCTION_MULTISIG_ADDRESS;
const SOLANA_ADDRESS = env.BALANCE_MONITOR_SOLANA_ADDRESS || env.NEXT_PUBLIC_SOLANA_DEPLOYER_ADDRESS;

const EVM_NETWORKS = [
  { id: "mainnet", label: "Ethereum", symbol: "ETH", rpcEnv: "MAINNET_RPC_URL", fallbackRpc: "https://ethereum-rpc.publicnode.com", thresholdEnv: "BALANCE_THRESHOLD_MAINNET_ETH", defaultThreshold: "0.02" },
  { id: "base", label: "Base", symbol: "ETH", rpcEnv: "BASE_RPC_URL", fallbackRpc: "https://mainnet.base.org", thresholdEnv: "BALANCE_THRESHOLD_BASE_ETH", defaultThreshold: "0.002" },
  { id: "arbitrum", label: "Arbitrum", symbol: "ETH", rpcEnv: "ARBITRUM_RPC_URL", fallbackRpc: "https://arb1.arbitrum.io/rpc", thresholdEnv: "BALANCE_THRESHOLD_ARBITRUM_ETH", defaultThreshold: "0.002" },
  { id: "optimism", label: "Optimism", symbol: "ETH", rpcEnv: "OPTIMISM_RPC_URL", fallbackRpc: "https://mainnet.optimism.io", thresholdEnv: "BALANCE_THRESHOLD_OPTIMISM_ETH", defaultThreshold: "0.002" },
  { id: "polygon", label: "Polygon", symbol: "POL", rpcEnv: "POLYGON_RPC_URL", fallbackRpc: "https://polygon-bor-rpc.publicnode.com", thresholdEnv: "BALANCE_THRESHOLD_POLYGON_POL", defaultThreshold: "5" },
  { id: "avalanche", label: "Avalanche", symbol: "AVAX", rpcEnv: "AVALANCHE_RPC_URL", fallbackRpc: "https://api.avax.network/ext/bc/C/rpc", thresholdEnv: "BALANCE_THRESHOLD_AVALANCHE_AVAX", defaultThreshold: "0.05" },
  { id: "bsc", label: "BNB Chain", symbol: "BNB", rpcEnv: "BSC_RPC_URL", fallbackRpc: "https://bsc-dataseed.binance.org", thresholdEnv: "BALANCE_THRESHOLD_BSC_BNB", defaultThreshold: "0.02" },
];

const SOLANA_NETWORK = {
  id: "solana",
  label: "Solana",
  symbol: "SOL",
  rpcEnv: "SOLANA_RPC_URL",
  fallbackRpc: "https://api.mainnet-beta.solana.com",
  thresholdEnv: "BALANCE_THRESHOLD_SOLANA_SOL",
  defaultThreshold: "3",
};

function parseUnits(value, decimals) {
  const [wholeRaw, fractionRaw = ""] = String(value).trim().split(".");
  const whole = wholeRaw || "0";
  const fraction = fractionRaw.padEnd(decimals, "0").slice(0, decimals);
  return BigInt(whole) * 10n ** BigInt(decimals) + BigInt(fraction || "0");
}

function formatUnits(value, decimals, maxDecimals = 6) {
  const base = 10n ** BigInt(decimals);
  const whole = value / base;
  const fraction = value % base;
  const fractionText = fraction.toString().padStart(decimals, "0").slice(0, maxDecimals).replace(/0+$/, "");
  return fractionText ? `${whole}.${fractionText}` : whole.toString();
}

async function rpc(url, method, params) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const payload = await response.json();
  if (!response.ok || payload.error) throw new Error(payload.error?.message || `HTTP ${response.status}`);
  return payload.result;
}

async function checkEvm(network) {
  if (!EVM_ADDRESS) return { ...network, status: "skipped", reason: "BALANCE_MONITOR_EVM_ADDRESS/ASSISTED_DEPLOYER_ADDRESS/PRODUCTION_MULTISIG_ADDRESS missing" };
  const rpcUrl = env[network.rpcEnv] || network.fallbackRpc;
  const balanceHex = await rpc(rpcUrl, "eth_getBalance", [EVM_ADDRESS, "latest"]);
  const balanceWei = BigInt(balanceHex);
  const thresholdWei = parseUnits(env[network.thresholdEnv] || network.defaultThreshold, 18);
  return {
    ...network,
    address: EVM_ADDRESS,
    balanceRaw: balanceWei.toString(),
    balance: formatUnits(balanceWei, 18),
    threshold: formatUnits(thresholdWei, 18),
    healthy: balanceWei >= thresholdWei,
    status: balanceWei >= thresholdWei ? "ok" : "low",
  };
}

async function checkSolana() {
  if (!SOLANA_ADDRESS) return { ...SOLANA_NETWORK, status: "skipped", reason: "BALANCE_MONITOR_SOLANA_ADDRESS/NEXT_PUBLIC_SOLANA_DEPLOYER_ADDRESS missing" };
  const rpcUrl = env[SOLANA_NETWORK.rpcEnv] || SOLANA_NETWORK.fallbackRpc;
  const result = await rpc(rpcUrl, "getBalance", [SOLANA_ADDRESS]);
  const lamports = BigInt(result.value);
  const thresholdLamports = parseUnits(env[SOLANA_NETWORK.thresholdEnv] || SOLANA_NETWORK.defaultThreshold, 9);
  return {
    ...SOLANA_NETWORK,
    address: SOLANA_ADDRESS,
    balanceRaw: lamports.toString(),
    balance: formatUnits(lamports, 9),
    threshold: formatUnits(thresholdLamports, 9),
    healthy: lamports >= thresholdLamports,
    status: lamports >= thresholdLamports ? "ok" : "low",
  };
}

async function sendTelegramAlert(lowBalances, errors) {
  const botToken = env.TELEGRAM_BOT_TOKEN;
  const chatId = env.TELEGRAM_ALERT_CHAT_ID;
  if (!botToken || !chatId) return false;

  const lines = [
    "🚨 [WARNING] Low operational balances",
    "Source: balances:monitor",
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

const checks = [];
const errors = [];

for (const network of EVM_NETWORKS) {
  try {
    checks.push(await checkEvm(network));
  } catch (error) {
    errors.push({ ...network, status: "error", error: error instanceof Error ? error.message : String(error) });
  }
}

try {
  checks.push(await checkSolana());
} catch (error) {
  errors.push({ ...SOLANA_NETWORK, status: "error", error: error instanceof Error ? error.message : String(error) });
}

const lowBalances = checks.filter((item) => item.status === "low");
const skipped = checks.filter((item) => item.status === "skipped");

for (const item of checks) {
  if (item.status === "skipped") {
    console.log(`${item.label}: skipped (${item.reason})`);
  } else {
    console.log(`${item.label}: ${item.balance} ${item.symbol} / threshold ${item.threshold} ${item.symbol} => ${item.status}`);
  }
}
for (const item of errors) console.log(`${item.label}: error (${item.error})`);

if (lowBalances.length > 0 || errors.length > 0) {
  const sent = await sendTelegramAlert(lowBalances, errors);
  console.log(`telegram_alert=${sent ? "sent" : "not_sent"}`);
}

if (env.BALANCE_MONITOR_FAIL_ON_LOW === "true" && (lowBalances.length > 0 || errors.length > 0)) {
  process.exit(1);
}

if (skipped.length > 0 && env.BALANCE_MONITOR_FAIL_ON_SKIPPED === "true") {
  process.exit(1);
}
