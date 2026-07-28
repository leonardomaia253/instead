import { ethers, network } from "hardhat";
import { writeDeploymentManifest } from "./deployment-manifest";

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

async function main() {
  const adapterAddress = requireEnv("NEXT_PUBLIC_LENDING_POOL_ADDRESS");
  const routerAddress = requireEnv("NEXT_PUBLIC_LENDING_ROUTER_ADDRESS");
  const protocolId = ethers.id("AAVE_V3");
  const riskTier = Number(process.env.AAVE_RISK_TIER ?? "2");

  const adapter = await ethers.getContractAt("InsteadLendingPool", adapterAddress);
  const router = await ethers.getContractAt("InsteadLendingRouter", routerAddress);

  const currentRouter = await adapter.authorizedRouter();
  let setRouterTxHash: string | null = null;
  if (currentRouter.toLowerCase() !== routerAddress.toLowerCase()) {
    const tx = await adapter.setAuthorizedRouter(routerAddress);
    const receipt = await tx.wait();
    setRouterTxHash = receipt?.hash ?? tx.hash;
  }

  const config = await router.adapters(adapterAddress);
  let configureAdapterTxHash: string | null = null;
  if (!config.enabled || config.protocolId !== protocolId || Number(config.riskTier) !== riskTier) {
    const tx = await router.configureAdapter(adapterAddress, protocolId, true, riskTier);
    const receipt = await tx.wait();
    configureAdapterTxHash = receipt?.hash ?? tx.hash;
  }

  const manifest = writeDeploymentManifest(network.name, {
    lendingRouterConfig: {
      adapter: adapterAddress,
      router: routerAddress,
      protocolId,
      riskTier,
      setRouterTxHash,
      configureAdapterTxHash,
      configuredAt: new Date().toISOString(),
    },
  });

  console.log(JSON.stringify({
    network: network.name,
    adapter: adapterAddress,
    router: routerAddress,
    protocolId,
    riskTier,
    setRouterTxHash,
    configureAdapterTxHash,
    manifest,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
