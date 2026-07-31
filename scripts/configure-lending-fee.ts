import { ethers, network } from "hardhat";
import { readDeploymentManifest, writeDeploymentManifest } from "./deployment-manifest";

const TARGET_CONVENIENCE_FEE_BPS = 150n;

function requireAddress(value: unknown, label: string) {
  if (typeof value !== "string" || !/^0x[a-fA-F0-9]{40}$/.test(value)) {
    throw new Error(`${label} must be an EVM address`);
  }
  return value;
}

async function main() {
  const manifest = readDeploymentManifest(network.name) as {
    lending?: { proxy?: string };
  };
  const adapterAddress = requireAddress(
    manifest.lending?.proxy || process.env.NEXT_PUBLIC_LENDING_POOL_ADDRESS,
    "NEXT_PUBLIC_LENDING_POOL_ADDRESS or deployments.<network>.lending.proxy",
  );

  const adapter = await ethers.getContractAt("InsteadLendingPool", adapterAddress);
  const currentFee = BigInt((await adapter.convenienceFee()).toString());

  if (currentFee === TARGET_CONVENIENCE_FEE_BPS) {
    console.log(JSON.stringify({
      network: network.name,
      adapter: adapterAddress,
      convenienceFeeBps: currentFee.toString(),
      updated: false,
      status: "already_configured",
    }, null, 2));
    return;
  }

  const signer = (await ethers.getSigners())[0];
  if (!signer) {
    throw new Error(`Lending fee is ${currentFee} bps; DEPLOYER_PRIVATE_KEY is required to submit setConvenienceFee(150)`);
  }

  const owner = await adapter.owner();
  if (owner.toLowerCase() !== signer.address.toLowerCase()) {
    throw new Error(`Lending fee is ${currentFee} bps; signer ${signer.address} is not owner ${owner}. Submit setConvenienceFee(150) through the owner/multisig.`);
  }

  const tx = await adapter.setConvenienceFee(TARGET_CONVENIENCE_FEE_BPS);
  const receipt = await tx.wait();
  const nextFee = BigInt((await adapter.convenienceFee()).toString());
  if (nextFee !== TARGET_CONVENIENCE_FEE_BPS) {
    throw new Error(`setConvenienceFee transaction mined but fee is ${nextFee} bps`);
  }

  const txHash = receipt?.hash ?? tx.hash;
  writeDeploymentManifest(network.name, {
    lendingFeeConfig: {
      adapter: adapterAddress,
      convenienceFeeBps: Number(TARGET_CONVENIENCE_FEE_BPS),
      txHash,
      configuredAt: new Date().toISOString(),
    },
  });

  console.log(JSON.stringify({
    network: network.name,
    adapter: adapterAddress,
    convenienceFeeBps: nextFee.toString(),
    txHash,
    updated: true,
    status: "configured",
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
