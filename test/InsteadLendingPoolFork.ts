import { expect } from "chai";
import { ethers } from "hardhat";

const forkSuite = process.env.HARDHAT_FORK_RPC_URL && process.env.AAVE_POOL_ADDRESSES_PROVIDER
  ? describe
  : describe.skip;

forkSuite("InsteadLendingPool fork smoke", function () {
  it("deploys behind a proxy and resolves the live Aave pool", async function () {
    const [deployer] = await ethers.getSigners();
    const provider = process.env.AAVE_POOL_ADDRESSES_PROVIDER!;

    const Adapter = await ethers.getContractFactory("InsteadLendingPool");
    const implementation = await Adapter.deploy();
    await implementation.waitForDeployment();

    const initData = Adapter.interface.encodeFunctionData("initialize", [provider, deployer.address]);
    const Proxy = await ethers.getContractFactory("InsteadERC1967Proxy");
    const proxy = await Proxy.deploy(await implementation.getAddress(), initData);
    await proxy.waitForDeployment();

    const adapter = Adapter.attach(await proxy.getAddress());
    const aavePool = await adapter.getAavePool();

    expect(aavePool).to.match(/^0x[a-fA-F0-9]{40}$/);
    expect(aavePool).to.not.equal(ethers.ZeroAddress);
    expect(await adapter.treasury()).to.equal(deployer.address);
    expect(await adapter.owner()).to.equal(deployer.address);
  });
});
