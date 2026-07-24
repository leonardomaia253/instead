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
  const provider = requireEnv("AAVE_POOL_ADDRESSES_PROVIDER");
  const treasury = requireEnv("PRODUCTION_MULTISIG_ADDRESS");

  const Adapter = await ethers.getContractFactory("InsteadLendingPool");
  const implementation = await Adapter.deploy();
  await implementation.waitForDeployment();

  const initData = Adapter.interface.encodeFunctionData("initialize", [provider, treasury]);
  const Proxy = await ethers.getContractFactory("InsteadERC1967Proxy");
  const proxy = await Proxy.deploy(await implementation.getAddress(), initData);
  await proxy.waitForDeployment();

  const implementationAddress = await implementation.getAddress();
  const proxyAddress = await proxy.getAddress();

  const manifest = writeDeploymentManifest(network.name, {
    lending: {
      proxy: proxyAddress,
      implementation: implementationAddress,
      provider,
      treasury,
      deployedAt: new Date().toISOString(),
    },
  });

  console.log(JSON.stringify({
    network: network.name,
    contract: "InsteadLendingPool",
    proxy: proxyAddress,
    implementation: implementationAddress,
    provider,
    treasury,
    manifest,
  }, null, 2));

  await verify(implementationAddress, []);
  await verify(proxyAddress, [implementationAddress, initData]);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
