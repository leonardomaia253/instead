import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const network = process.env.DEPLOYMENT_NETWORK;
if (!network) {
  console.error("DEPLOYMENT_NETWORK is required.");
  process.exit(1);
}

const manifestPath = resolve(process.cwd(), "deployments", `${network}.json`);
if (!existsSync(manifestPath)) {
  console.error(`Deployment manifest not found: ${manifestPath}`);
  process.exit(1);
}

const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const failures = [];

function assertAddress(path, value) {
  if (!/^0x[a-fA-F0-9]{40}$/.test(String(value ?? ""))) failures.push(`${path} must be an EVM address`);
}

if (manifest.tokenFactory) assertAddress("tokenFactory.address", manifest.tokenFactory.address);
if (manifest.lending) {
  assertAddress("lending.proxy", manifest.lending.proxy);
  assertAddress("lending.implementation", manifest.lending.implementation);
  assertAddress("lending.provider", manifest.lending.provider);
}
if (manifest.staking) assertAddress("staking.address", manifest.staking.address);
if (manifest.lendingAssets) {
  for (const [index, asset] of manifest.lendingAssets.entries()) {
    assertAddress(`lendingAssets[${index}].asset`, asset.asset);
    assertAddress(`lendingAssets[${index}].aToken`, asset.aToken);
    assertAddress(`lendingAssets[${index}].variableDebtToken`, asset.variableDebtToken);
  }
}

const rpcUrl = process.env.DEPLOYMENT_RPC_URL;
async function hasCode(address) {
  if (!rpcUrl) return true;
  const response = await fetch(rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "eth_getCode",
      params: [address, "latest"],
    }),
  });
  const body = await response.json();
  return typeof body.result === "string" && body.result !== "0x";
}

if (failures.length === 0 && rpcUrl) {
  const codeTargets = [
    manifest.tokenFactory?.address,
    manifest.lending?.proxy,
    manifest.lending?.implementation,
    manifest.staking?.address,
  ].filter(Boolean);

  for (const address of codeTargets) {
    if (!(await hasCode(address))) failures.push(`${address} has no bytecode on ${network}`);
  }
}

if (failures.length > 0) {
  console.error("Deployment manifest verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Deployment manifest verified for ${network}.`);
if (!rpcUrl) console.log("DEPLOYMENT_RPC_URL not set; skipped bytecode checks.");
