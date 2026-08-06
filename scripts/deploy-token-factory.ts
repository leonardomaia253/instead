import { ethers, network, run } from "hardhat";
import { writeDeploymentManifest } from "./deployment-manifest";

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
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
  const ethUsdFeed = requireEnv("CHAINLINK_ETH_USD_FEED");
  const treasury = requireEnv("PRODUCTION_MULTISIG_ADDRESS");
  const dexRouter = requireEnv("DEX_ROUTER_ADDRESS");

  const Factory = await ethers.getContractFactory("InsteadTokenFactory");
  const factory = await Factory.deploy(ethUsdFeed, treasury, dexRouter);
  await factory.waitForDeployment();

  const address = await factory.getAddress();
  const manifest = writeDeploymentManifest(network.name, {
    tokenFactory: {
      address,
      version: 4,
      ethUsdFeed,
      treasury,
      dexRouter,
      deployedAt: new Date().toISOString(),
    },
  });

  console.log(JSON.stringify({
    network: network.name,
    contract: "InsteadTokenFactory",
    address,
    ethUsdFeed,
    treasury,
    dexRouter,
    manifest,
  }, null, 2));

  await verify(address, [ethUsdFeed, treasury, dexRouter]);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
