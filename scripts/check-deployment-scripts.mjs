import { readFileSync } from "node:fs";

const failures = [];

function read(path) {
  return readFileSync(path, "utf8");
}

const staging = read("scripts/deploy-staging-all.ts");

for (const forbidden of [
  'getEnv("CHAINLINK_ETH_USD_FEED"',
  'getEnv("PRODUCTION_MULTISIG_ADDRESS"',
  'getEnv("DEX_ROUTER_ADDRESS"',
  '"0x0000000000000000000000000000000000000001"',
]) {
  if (staging.includes(forbidden)) failures.push(`deploy-staging-all.ts must not use production deployment fallback: ${forbidden}`);
}

for (const required of [
  "requireAddressEnv",
  "isLocalNetwork",
  "CHAINLINK_ETH_USD_FEED",
  "PRODUCTION_MULTISIG_ADDRESS",
  "DEX_ROUTER_ADDRESS",
  "STAKING_REWARD_TOKEN",
]) {
  if (!staging.includes(required)) failures.push(`deploy-staging-all.ts must explicitly validate ${required}`);
}

if (!staging.includes("ethUsdFeed") || !staging.includes("dexRouter") || !staging.includes("rewardToken")) {
  failures.push("deploy-staging-all.ts must write constructor parameters to the deployment manifest");
}

if (failures.length > 0) {
  console.error("Deployment script checks failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Deployment script checks passed.");
