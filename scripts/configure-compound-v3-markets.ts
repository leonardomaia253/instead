import { ethers, network } from "hardhat";
import { readDeploymentManifest, writeDeploymentManifest } from "./deployment-manifest";

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function parseJsonMap(name: string) {
  const parsed = JSON.parse(requireEnv(name)) as Record<string, { asset: string; comet: string }>;
  for (const [symbol, value] of Object.entries(parsed)) {
    if (!/^0x[a-fA-F0-9]{40}$/.test(value.asset)) throw new Error(`${name}.${symbol}.asset must be an EVM address`);
    if (!/^0x[a-fA-F0-9]{40}$/.test(value.comet)) throw new Error(`${name}.${symbol}.comet must be an EVM address`);
  }
  return parsed;
}

async function main() {
  const manifest = readDeploymentManifest(network.name) as { externalLendingAdapters?: Record<string, { address?: string }> };
  const adapterAddress = process.env.EXTERNAL_LENDING_ADAPTER_ADDRESS || manifest.externalLendingAdapters?.compound_v3?.address;
  if (!adapterAddress || !/^0x[a-fA-F0-9]{40}$/.test(adapterAddress)) throw new Error("Compound adapter address is required");

  const markets = parseJsonMap("COMPOUND_V3_MARKETS_JSON");
  const adapter = await ethers.getContractAt("CompoundV3Adapter", adapterAddress);
  const configured = [];
  for (const [symbol, market] of Object.entries(markets)) {
    const tx = await adapter.setCometMarket(market.asset, market.comet);
    const receipt = await tx.wait();
    configured.push({ symbol, asset: market.asset, comet: market.comet, txHash: receipt?.hash ?? tx.hash });
  }

  const current = readDeploymentManifest(network.name) as Record<string, unknown>;
  const externalLendingMarkets = {
    ...((current.externalLendingMarkets as Record<string, unknown>) ?? {}),
    compound_v3: configured,
  };
  const next = writeDeploymentManifest(network.name, { externalLendingMarkets });
  console.log(JSON.stringify({ network: network.name, adapter: adapterAddress, configured, manifest: next }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
