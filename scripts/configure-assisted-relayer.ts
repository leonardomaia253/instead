import { ethers } from "hardhat";
import { readDeploymentManifest } from "./deployment-manifest";

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

const FACTORY_RELAYER_ABI = [
  "function authorizedRelayers(address relayer) view returns (bool)",
  "function setRelayer(address relayer, bool authorized)",
];

async function main() {
  const networkName = requireEnv("DEPLOYMENT_NETWORK");
  const relayer = requireEnv("ASSISTED_DEPLOYER_ADDRESS");
  const authorized = process.env.ASSISTED_DEPLOYER_AUTHORIZED !== "false";
  const manifest = readDeploymentManifest(networkName);
  const factoryAddress = manifest.tokenFactory?.address;
  if (!factoryAddress) throw new Error(`deployments/${networkName}.json does not include tokenFactory.address`);

  const factory = await ethers.getContractAt(FACTORY_RELAYER_ABI, factoryAddress);
  const current = await factory.authorizedRelayers(relayer);
  if (current === authorized) {
    console.log(`Relayer ${relayer} already authorized=${authorized} on ${networkName}`);
    return;
  }

  const tx = await factory.setRelayer(relayer, authorized);
  console.log(`Submitted setRelayer(${relayer}, ${authorized}): ${tx.hash}`);
  await tx.wait();
  console.log(`Relayer ${relayer} authorized=${authorized} on ${networkName}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
