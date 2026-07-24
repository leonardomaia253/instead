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
  const stakeToken = requireEnv("STAKING_STAKE_TOKEN");
  const rewardToken = requireEnv("STAKING_REWARD_TOKEN");
  const rewardPerBlock = BigInt(requireEnv("STAKING_REWARD_PER_BLOCK"));

  const Staking = await ethers.getContractFactory("InsteadStaking");
  const staking = await Staking.deploy(stakeToken, rewardToken, rewardPerBlock);
  await staking.waitForDeployment();

  const address = await staking.getAddress();
  const manifest = writeDeploymentManifest(network.name, {
    staking: {
      address,
      stakeToken,
      rewardToken,
      rewardPerBlock: rewardPerBlock.toString(),
      deployedAt: new Date().toISOString(),
    },
  });

  console.log(JSON.stringify({
    network: network.name,
    contract: "InsteadStaking",
    address,
    stakeToken,
    rewardToken,
    rewardPerBlock: rewardPerBlock.toString(),
    manifest,
  }, null, 2));

  await verify(address, [stakeToken, rewardToken, rewardPerBlock]);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
