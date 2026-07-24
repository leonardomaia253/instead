import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const network = process.env.DEPLOYMENT_NETWORK;
const rpcUrl = process.env.DEPLOYMENT_RPC_URL;
const expectedOwner = process.env.PRODUCTION_MULTISIG_ADDRESS;

if (!network) {
  console.error("DEPLOYMENT_NETWORK is required.");
  process.exit(1);
}
if (!rpcUrl) {
  console.error("DEPLOYMENT_RPC_URL is required.");
  process.exit(1);
}
if (!/^0x[a-fA-F0-9]{40}$/.test(String(expectedOwner ?? ""))) {
  console.error("PRODUCTION_MULTISIG_ADDRESS must be an EVM address.");
  process.exit(1);
}

const manifestPath = resolve(process.cwd(), "deployments", `${network}.json`);
if (!existsSync(manifestPath)) {
  console.error(`Deployment manifest not found: ${manifestPath}`);
  process.exit(1);
}

const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const targets = [
  ["tokenFactory", manifest.tokenFactory?.address],
  ["lending", manifest.lending?.proxy],
  ["staking", manifest.staking?.address],
].filter(([, address]) => /^0x[a-fA-F0-9]{40}$/.test(String(address ?? "")));

if (targets.length === 0) {
  console.error("No ownable contracts found in deployment manifest.");
  process.exit(1);
}

async function ethCall(to, data) {
  const response = await fetch(rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "eth_call",
      params: [{ to, data }, "latest"],
    }),
  });
  const body = await response.json();
  if (body.error) throw new Error(body.error.message ?? JSON.stringify(body.error));
  return body.result;
}

const failures = [];
for (const [label, address] of targets) {
  const result = await ethCall(address, "0x8da5cb5b");
  const owner = `0x${result.slice(-40)}`;
  if (owner.toLowerCase() !== expectedOwner.toLowerCase()) {
    failures.push(`${label} owner is ${owner}, expected ${expectedOwner}`);
  }
}

if (failures.length > 0) {
  console.error("Ownership verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Ownership verified for ${network}: ${expectedOwner}`);
