import { ethers, network } from "hardhat";
import { readDeploymentManifest, writeDeploymentManifest } from "./deployment-manifest";

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

const OWNABLE_ABI = [
  "function owner() view returns (address)",
  "function transferOwnership(address newOwner)",
] as const;

async function transferIfNeeded(label: string, address: string, multisig: string) {
  const contract = await ethers.getContractAt(OWNABLE_ABI, address);
  const currentOwner = await contract.owner();
  if (currentOwner.toLowerCase() === multisig.toLowerCase()) {
    return { label, address, owner: currentOwner, transferred: false };
  }

  const tx = await contract.transferOwnership(multisig);
  const receipt = await tx.wait();
  return {
    label,
    address,
    previousOwner: currentOwner,
    owner: multisig,
    transferred: true,
    txHash: receipt?.hash,
  };
}

async function main() {
  const multisig = requireEnv("PRODUCTION_MULTISIG_ADDRESS");
  const manifest = readDeploymentManifest(network.name) as {
    tokenFactory?: { address?: string };
    lending?: { proxy?: string };
    staking?: { address?: string };
  };

  const targets = [
    ["tokenFactory", manifest.tokenFactory?.address],
    ["lending", manifest.lending?.proxy],
    ["staking", manifest.staking?.address],
  ].filter(([, address]) => Boolean(address)) as Array<[string, string]>;

  if (targets.length === 0) throw new Error(`No ownable contracts found in deployments/${network.name}.json`);

  const results = [];
  for (const [label, address] of targets) {
    results.push(await transferIfNeeded(label, address, multisig));
  }

  const ownership = Object.fromEntries(results.map((result) => [result.label, result]));
  const nextManifest = writeDeploymentManifest(network.name, { ownership });
  console.log(JSON.stringify({ network: network.name, multisig, ownership, manifest: nextManifest }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
