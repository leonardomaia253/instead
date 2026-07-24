import { ethers, network } from "hardhat";
import { writeDeploymentManifest } from "./deployment-manifest";

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function parseJsonMap(name: string) {
  const parsed = JSON.parse(requireEnv(name)) as Record<string, string>;
  for (const [symbol, address] of Object.entries(parsed)) {
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      throw new Error(`${name}.${symbol} must be an EVM address`);
    }
  }
  return parsed;
}

async function main() {
  const adapterAddress = requireEnv("NEXT_PUBLIC_LENDING_POOL_ADDRESS");
  const assets = parseJsonMap("AAVE_SUPPORTED_ASSETS_JSON");
  const aTokens = parseJsonMap("AAVE_ATOKENS_JSON");
  const debtTokens = parseJsonMap("AAVE_VARIABLE_DEBT_TOKENS_JSON");

  const missing = Object.keys(assets).filter((symbol) => !aTokens[symbol] || !debtTokens[symbol]);
  if (missing.length > 0) {
    throw new Error(`Missing aToken/debt token entries for: ${missing.join(", ")}`);
  }

  const adapter = await ethers.getContractAt("InsteadLendingPool", adapterAddress);
  const results = [];

  for (const [symbol, asset] of Object.entries(assets)) {
    const tx = await adapter.configureAsset(asset, aTokens[symbol], debtTokens[symbol], true);
    const receipt = await tx.wait();
    results.push({
      symbol,
      asset,
      aToken: aTokens[symbol],
      variableDebtToken: debtTokens[symbol],
      txHash: receipt?.hash,
    });
  }

  const manifest = writeDeploymentManifest(network.name, {
    lendingAssets: results,
  });

  console.log(JSON.stringify({
    network: network.name,
    adapter: adapterAddress,
    configured: results,
    manifest,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
