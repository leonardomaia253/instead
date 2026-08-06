import { ethers, network, run } from "hardhat";
import { writeDeploymentManifest } from "./deployment-manifest";

function getEnv(name: string, fallback: string = ""): string {
  return process.env[name] || fallback;
}

async function verifyContract(address: string, constructorArguments: unknown[] = []) {
  if (network.name === "hardhat" || network.name === "localhost") {
    console.log(`[Verify] Skipping verification for local network ${network.name}`);
    return;
  }
  console.log(`[Verify] Attempting explorer verification for ${address} on ${network.name}...`);
  try {
    await run("verify:verify", {
      address,
      constructorArguments,
    });
    console.log(`[Verify] Successfully verified ${address} on ${network.name}`);
  } catch (error) {
    console.warn(`[Verify] Warning: Verification skipped or failed for ${address}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(`====================================================`);
  console.log(`Deploying Staging Suite on Network: ${network.name}`);
  console.log(`Deployer Account: ${deployer ? deployer.address : "None (dry-run)"}`);
  console.log(`====================================================`);

  const ethUsdFeed = getEnv("CHAINLINK_ETH_USD_FEED", "0x694AA1769357215DE4FAC081bf1f309aDC325306");
  const treasury = getEnv("PRODUCTION_MULTISIG_ADDRESS", deployer ? deployer.address : "0x0000000000000000000000000000000000000001");
  const dexRouter = getEnv("DEX_ROUTER_ADDRESS", "0xe592427a0aece92de3edee1f18e0157c05861564");

  // 1. Deploy TokenFactory
  console.log("\n[1/4] Deploying TokenFactory...");
  const TokenFactory = await ethers.getContractFactory("InsteadTokenFactory");
  const factory = await TokenFactory.deploy(ethUsdFeed, treasury, dexRouter);
  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();
  console.log(`-> TokenFactory deployed at: ${factoryAddress}`);
  await verifyContract(factoryAddress, [ethUsdFeed, treasury, dexRouter]);

  // 2. Deploy LendingRouter
  console.log("\n[2/4] Deploying LendingRouter...");
  const LendingRouter = await ethers.getContractFactory("InsteadLendingRouter");
  const lendingRouter = await LendingRouter.deploy(treasury);
  await lendingRouter.waitForDeployment();
  const lendingRouterAddress = await lendingRouter.getAddress();
  console.log(`-> LendingRouter deployed at: ${lendingRouterAddress}`);
  await verifyContract(lendingRouterAddress, [treasury]);

  // 3. Deploy LendingPool Implementation & Proxy
  console.log("\n[3/4] Deploying LendingPool Implementation & Proxy...");
  const LendingPool = await ethers.getContractFactory("InsteadLendingPool");
  const lendingPoolImpl = await LendingPool.deploy();
  await lendingPoolImpl.waitForDeployment();
  const implAddress = await lendingPoolImpl.getAddress();
  console.log(`-> LendingPool Impl deployed at: ${implAddress}`);
  await verifyContract(implAddress, []);

  const Proxy = await ethers.getContractFactory("InsteadERC1967Proxy");
  const initData = LendingPool.interface.encodeFunctionData("initialize", [
    treasury,
    lendingRouterAddress,
  ]);
  const proxy = await Proxy.deploy(implAddress, initData);
  await proxy.waitForDeployment();
  const proxyAddress = await proxy.getAddress();
  console.log(`-> LendingPool Proxy deployed at: ${proxyAddress}`);
  await verifyContract(proxyAddress, [implAddress, initData]);

  // 4. Deploy Staking
  console.log("\n[4/4] Deploying Staking...");
  const Staking = await ethers.getContractFactory("InsteadStaking");
  const rewardToken = getEnv("STAKING_REWARD_TOKEN", factoryAddress);
  const staking = await Staking.deploy(rewardToken, treasury);
  await staking.waitForDeployment();
  const stakingAddress = await staking.getAddress();
  console.log(`-> Staking deployed at: ${stakingAddress}`);
  await verifyContract(stakingAddress, [rewardToken, treasury]);

  // Write deployment manifest
  const manifest = writeDeploymentManifest(network.name, {
    tokenFactory: { address: factoryAddress, version: 4, deployedAt: new Date().toISOString() },
    lendingRouter: { address: lendingRouterAddress, deployedAt: new Date().toISOString() },
    lendingPoolImpl: { address: implAddress, deployedAt: new Date().toISOString() },
    lendingPoolProxy: { address: proxyAddress, deployedAt: new Date().toISOString() },
    staking: { address: stakingAddress, deployedAt: new Date().toISOString() },
  });

  console.log("\n====================================================");
  console.log(`Staging deployment manifest updated at: ${manifest}`);
  console.log("Staging deployment completed successfully!");
  console.log("====================================================");
}

main().catch((error) => {
  console.error("Deploy staging failed:", error);
  process.exitCode = 1;
});
