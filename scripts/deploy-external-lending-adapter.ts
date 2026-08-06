import { ethers, network, run } from "hardhat";
import { readDeploymentManifest, writeDeploymentManifest } from "./deployment-manifest";

type Protocol = "spark" | "compound_v3" | "morpho_blue";

const PROTOCOLS: Record<Protocol, { contractName: string; protocolId: string; requiresMarket: boolean }> = {
  spark: { contractName: "SparkAdapter", protocolId: "PROTOCOL_SPARK_V1", requiresMarket: true },
  compound_v3: { contractName: "CompoundV3Adapter", protocolId: "PROTOCOL_COMPOUND_V3", requiresMarket: false },
  morpho_blue: { contractName: "MorphoAdapter", protocolId: "PROTOCOL_MORPHO_BLUE", requiresMarket: true },
};

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function requireAddress(name: string) {
  const value = requireEnv(name);
  if (!/^0x[a-fA-F0-9]{40}$/.test(value)) throw new Error(`${name} must be an EVM address`);
  return value;
}

async function verify(address: string, args: unknown[]) {
  if (network.name === "hardhat" || network.name === "localhost") return;
  try {
    await run("verify:verify", { address, constructorArguments: args });
  } catch (error) {
    console.warn(`Verification skipped/failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function main() {
  const protocol = requireEnv("LENDING_PROTOCOL_ID") as Protocol;
  const details = PROTOCOLS[protocol];
  if (!details) throw new Error(`Unsupported LENDING_PROTOCOL_ID=${protocol}`);

  const owner = requireAddress("PRODUCTION_MULTISIG_ADDRESS");
  const market = details.requiresMarket ? requireAddress("LENDING_MARKET_ADDRESS") : null;
  const args = protocol === "compound_v3" ? [owner] : [market, owner];

  const Factory = await ethers.getContractFactory(details.contractName);
  const adapter = await Factory.deploy(...args);
  await adapter.waitForDeployment();
  const adapterAddress = await adapter.getAddress();

  const manifest = readDeploymentManifest(network.name) as Record<string, unknown>;
  const externalAdapters = {
    ...((manifest.externalLendingAdapters as Record<string, unknown>) ?? {}),
    [protocol]: {
      address: adapterAddress,
      contract: details.contractName,
      protocolId: ethers.id(details.protocolId),
      market,
      owner,
      deployedAt: new Date().toISOString(),
    },
  };

  const next = writeDeploymentManifest(network.name, { externalLendingAdapters });
  console.log(JSON.stringify({ network: network.name, protocol, adapter: adapterAddress, manifest: next }, null, 2));

  await verify(adapterAddress, args);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
