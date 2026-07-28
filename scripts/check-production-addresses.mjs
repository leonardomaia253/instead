import { readFileSync } from "node:fs";

const config = JSON.parse(readFileSync("config/production-addresses.json", "utf8"));
const failures = [];
const warnings = [];
const zero = "0x0000000000000000000000000000000000000000";

function assertEvmAddress(path, value) {
  if (!/^0x[a-fA-F0-9]{40}$/.test(String(value ?? ""))) {
    failures.push(`${path} must be an EVM address`);
    return;
  }
  if (String(value).toLowerCase() === zero.toLowerCase()) failures.push(`${path} cannot be zero address`);
}

function assertSolanaPublicKey(path, value) {
  if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(String(value ?? ""))) {
    failures.push(`${path} must be a Solana base58 public key`);
  }
}

for (const [network, details] of Object.entries(config.networks ?? {})) {
  if (!Number.isInteger(details.chainId)) failures.push(`networks.${network}.chainId must be an integer`);
  if (!details.hardhatNetwork) failures.push(`networks.${network}.hardhatNetwork is required`);
  if (!details.factoryEnv?.startsWith("NEXT_PUBLIC_FACTORY_")) failures.push(`networks.${network}.factoryEnv is invalid`);
  if (!details.rpcEnv?.endsWith("_RPC_URL")) failures.push(`networks.${network}.rpcEnv is invalid`);
  assertEvmAddress(`networks.${network}.chainlinkEthUsdFeed`, details.chainlinkEthUsdFeed);
  assertEvmAddress(`networks.${network}.recommendedDexRouter.address`, details.recommendedDexRouter?.address);
  if (details.recommendedDexRouter?.compatibility !== "uniswap-v2-like") {
    failures.push(`networks.${network}.recommendedDexRouter must be uniswap-v2-like for current TokenFactory`);
  }
  for (const [index, router] of (details.compatibleRouters ?? []).entries()) {
    assertEvmAddress(`networks.${network}.compatibleRouters[${index}].address`, router.address);
  }
  for (const [index, router] of (details.notDropInRouters ?? []).entries()) {
    assertEvmAddress(`networks.${network}.notDropInRouters[${index}].address`, router.address);
    if (!router.reason) warnings.push(`networks.${network}.notDropInRouters[${index}] should include a reason`);
  }
}

const solana = config.nonEvmNetworks?.solana;
if (!solana) {
  failures.push("nonEvmNetworks.solana is required");
} else {
  if (solana.status !== "not-supported-by-current-token-factory") {
    failures.push("nonEvmNetworks.solana.status must explicitly state it is not supported by current EVM TokenFactory");
  }
  assertSolanaPublicKey("nonEvmNetworks.solana.mainnet.tokenProgram.programId", solana.mainnet?.tokenProgram?.programId);
  assertSolanaPublicKey(
    "nonEvmNetworks.solana.mainnet.associatedTokenProgram.programId",
    solana.mainnet?.associatedTokenProgram?.programId,
  );
}

if (failures.length > 0) {
  console.error("Production address config check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  if (warnings.length > 0) {
    console.error("\nWarnings:");
    for (const warning of warnings) console.error(`- ${warning}`);
  }
  process.exit(1);
}

console.log(`Production address config checks passed for ${Object.keys(config.networks ?? {}).length} EVM networks.`);
if (warnings.length > 0) {
  console.log("Warnings:");
  for (const warning of warnings) console.log(`- ${warning}`);
}
