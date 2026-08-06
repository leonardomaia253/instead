import { ethers, network } from "hardhat";
import { readDeploymentManifest, writeDeploymentManifest } from "./deployment-manifest";

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function parseJsonMap(name: string) {
  const parsed = JSON.parse(requireEnv(name)) as Record<string, { asset: string; aToken: string; variableDebtToken: string }>;
  for (const [symbol, value] of Object.entries(parsed)) {
    for (const key of ["asset", "aToken", "variableDebtToken"] as const) {
      if (!/^0x[a-fA-F0-9]{40}$/.test(value[key])) throw new Error(`${name}.${symbol}.${key} must be an EVM address`);
    }
  }
  return parsed;
}

async function main() {
  const manifest = readDeploymentManifest(network.name) as { externalLendingAdapters?: Record<string, { address?: string }> };
  const adapterAddress = process.env.EXTERNAL_LENDING_ADAPTER_ADDRESS || manifest.externalLendingAdapters?.spark?.address;
  if (!adapterAddress || !/^0x[a-fA-F0-9]{40}$/.test(adapterAddress)) throw new Error("Spark adapter address is required");

  const assets = parseJsonMap("SPARK_ASSETS_JSON");
  const adapter = await ethers.getContractAt("SparkAdapter", adapterAddress);
  const configured = [];
  for (const [symbol, details] of Object.entries(assets)) {
    const tx = await adapter.configureAsset(details.asset, details.aToken, details.variableDebtToken, true);
    const receipt = await tx.wait();
    configured.push({ symbol, ...details, txHash: receipt?.hash ?? tx.hash });
  }

  const current = readDeploymentManifest(network.name) as Record<string, unknown>;
  const externalLendingMarkets = {
    ...((current.externalLendingMarkets as Record<string, unknown>) ?? {}),
    spark: configured,
  };
  const next = writeDeploymentManifest(network.name, { externalLendingMarkets });
  console.log(JSON.stringify({ network: network.name, adapter: adapterAddress, configured, manifest: next }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
