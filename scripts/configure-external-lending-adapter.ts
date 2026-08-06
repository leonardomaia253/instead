import { ethers, network } from "hardhat";
import { readDeploymentManifest, writeDeploymentManifest } from "./deployment-manifest";

type Protocol = "spark" | "compound_v3" | "morpho_blue";

const PROTOCOL_IDS: Record<Protocol, string> = {
  spark: "PROTOCOL_SPARK_V1",
  compound_v3: "PROTOCOL_COMPOUND_V3",
  morpho_blue: "PROTOCOL_MORPHO_BLUE",
};

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function requireAddress(value: unknown, label: string) {
  if (typeof value !== "string" || !/^0x[a-fA-F0-9]{40}$/.test(value)) {
    throw new Error(`${label} must be an EVM address`);
  }
  return value;
}

async function main() {
  const protocol = requireEnv("LENDING_PROTOCOL_ID") as Protocol;
  const protocolIdLabel = PROTOCOL_IDS[protocol];
  if (!protocolIdLabel) throw new Error(`Unsupported LENDING_PROTOCOL_ID=${protocol}`);

  const manifest = readDeploymentManifest(network.name) as {
    lendingRouter?: { proxy?: string };
    externalLendingAdapters?: Record<string, { address?: string }>;
  };
  const routerAddress = requireAddress(process.env.NEXT_PUBLIC_LENDING_ROUTER_ADDRESS || manifest.lendingRouter?.proxy, "lending router");
  const adapterAddress = requireAddress(process.env.EXTERNAL_LENDING_ADAPTER_ADDRESS || manifest.externalLendingAdapters?.[protocol]?.address, "external lending adapter");
  const riskTier = Number(process.env.EXTERNAL_LENDING_RISK_TIER ?? "3");
  const protocolId = ethers.id(protocolIdLabel);

  const adapter = await ethers.getContractAt("IInsteadLendingAdapter", adapterAddress);
  const router = await ethers.getContractAt("InsteadLendingRouter", routerAddress);
  if ((await adapter.ADAPTER_ID()) !== protocolId) throw new Error("Adapter protocol id mismatch");

  const current = await router.adapters(adapterAddress);
  let txHash: string | null = null;
  if (!current.enabled || current.protocolId !== protocolId || Number(current.riskTier) !== riskTier) {
    const tx = await router.configureAdapter(adapterAddress, protocolId, true, riskTier);
    const receipt = await tx.wait();
    txHash = receipt?.hash ?? tx.hash;
  }

  const currentManifest = readDeploymentManifest(network.name) as Record<string, unknown>;
  const externalAdapterConfigs = {
    ...((currentManifest.externalLendingAdapterConfigs as Record<string, unknown>) ?? {}),
    [protocol]: {
      adapter: adapterAddress,
      router: routerAddress,
      protocolId,
      riskTier,
      configureAdapterTxHash: txHash,
      configuredAt: new Date().toISOString(),
    },
  };

  const next = writeDeploymentManifest(network.name, { externalLendingAdapterConfigs });
  console.log(JSON.stringify({ network: network.name, protocol, adapter: adapterAddress, router: routerAddress, txHash, manifest: next }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
