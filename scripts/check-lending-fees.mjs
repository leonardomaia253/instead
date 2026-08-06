import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const TARGET_FEE_BPS = 150n;
const ABI_CALL_CONVENIENCE_FEE = "0xfbe8b5ce";

const publicRpcs = {
  base: "https://base-rpc.publicnode.com",
  arbitrum: "https://arbitrum-one-rpc.publicnode.com",
  avalanche: "https://avalanche-c-chain-rpc.publicnode.com",
  polygon: "https://polygon-bor-rpc.publicnode.com",
  optimism: "https://mainnet.optimism.io",
  bsc: "https://bsc-dataseed.binance.org",
};

function readManifest(network) {
  return JSON.parse(readFileSync(resolve(process.cwd(), `deployments/${network}.json`), "utf8"));
}

async function ethCall(rpcUrl, to, data) {
  const res = await fetch(rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "eth_call",
      params: [{ to, data }, "latest"],
    }),
  });
  const body = await res.json();
  if (body.error) throw new Error(body.error.message || JSON.stringify(body.error));
  return BigInt(body.result);
}

const requestedNetworks = (process.env.LENDING_FEE_NETWORKS || "base,arbitrum,avalanche,polygon,optimism,bsc")
  .split(",")
  .map((item) => item.trim())
  .filter(Boolean);

const failures = [];
for (const network of requestedNetworks) {
  const rpcUrl = process.env[`${network.toUpperCase()}_RPC_URL`] || publicRpcs[network];
  if (!rpcUrl) {
    failures.push(`${network}: RPC URL is missing`);
    continue;
  }
  try {
    const manifest = readManifest(network);
    const adapter = manifest.lending?.proxy;
    if (!/^0x[a-fA-F0-9]{40}$/.test(adapter || "")) {
      failures.push(`${network}: lending proxy is missing`);
      continue;
    }
    const fee = await ethCall(rpcUrl, adapter, ABI_CALL_CONVENIENCE_FEE);
    if (fee !== TARGET_FEE_BPS) failures.push(`${network}: convenienceFee is ${fee} bps, expected ${TARGET_FEE_BPS} bps`);
    else console.log(`${network}: convenienceFee ${fee} bps`);
  } catch (error) {
    failures.push(`${network}: ${error.message}`);
  }
}

if (failures.length > 0) {
  console.error("Lending fee checks failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Lending fee checks passed.");
