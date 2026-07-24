import { expect } from "chai";
import { ethers } from "hardhat";

describe("InsteadTokenFactory advanced presets", function () {
  async function deployFixture() {
    const [owner, creator, holder] = await ethers.getSigners();
    const Feed = await ethers.getContractFactory("MockAggregatorV3");
    const feed = await Feed.deploy(2_000_00000000n);
    const Router = await ethers.getContractFactory("MockUniswapV2Router");
    const router = await Router.deploy();
    const Factory = await ethers.getContractFactory("InsteadTokenFactory");
    const factory = await Factory.deploy(await feed.getAddress(), owner.address, await router.getAddress());
    return { owner, creator, holder, router, factory };
  }

  it("creates a deflationary token that burns transfer tax", async function () {
    const { creator, holder, factory } = await deployFixture();
    const fee = await factory.getCreationFeeInEth();

    const tx = await factory.connect(creator).createTokenAdvanced(
      "Deflationary Demo",
      "DEFL",
      1_000_000,
      1_000_000,
      false,
      true,
      200,
      false,
      true,
      0,
      { value: fee },
    );
    const receipt = await tx.wait();
    const event = receipt?.logs
      .map((log) => {
        try {
          return factory.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .find((parsed) => parsed?.name === "TokenCreated");

    const token = await ethers.getContractAt("GenericToken", event!.args.tokenAddress);
    await token.connect(creator).transfer(holder.address, ethers.parseEther("1000"));

    expect(await token.balanceOf(holder.address)).to.equal(ethers.parseEther("980"));
    expect(await token.totalSupply()).to.equal(ethers.parseEther("999980"));
    expect(await token.burnTax()).to.equal(true);
  });

  it("enforces max wallet percentage for non-owner recipients", async function () {
    const { creator, holder, factory } = await deployFixture();
    const fee = await factory.getCreationFeeInEth();

    const tx = await factory.connect(creator).createTokenAdvanced(
      "Anti Whale Demo",
      "WHALE",
      1_000_000,
      1_000_000,
      false,
      false,
      0,
      false,
      false,
      100,
      { value: fee },
    );
    const receipt = await tx.wait();
    const event = receipt?.logs
      .map((log) => {
        try {
          return factory.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .find((parsed) => parsed?.name === "TokenCreated");

    const token = await ethers.getContractAt("GenericToken", event!.args.tokenAddress);

    await token.connect(creator).transfer(holder.address, ethers.parseEther("10000"));
    await expect(
      token.connect(creator).transfer(holder.address, 1),
    ).to.be.revertedWith("Max wallet exceeded");
  });

  it("creates a fair launch token with 100% of supply in the liquidity router", async function () {
    const { creator, holder, router, factory } = await deployFixture();
    const fee = await factory.getCreationFeeInEth();
    const liquidityEth = ethers.parseEther("1");
    const deadline = Math.floor(Date.now() / 1000) + 3600;

    const tx = await factory.connect(creator).createFairLaunchTokenETH(
      "Fair Launch Demo",
      "FAIR",
      1_000_000,
      ethers.parseEther("1000000"),
      liquidityEth,
      holder.address,
      deadline,
      { value: fee + liquidityEth },
    );
    const receipt = await tx.wait();
    const event = receipt?.logs
      .map((log) => {
        try {
          return factory.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .find((parsed) => parsed?.name === "FairLaunchCreated");

    const token = await ethers.getContractAt("GenericToken", event!.args.tokenAddress);

    expect(await token.balanceOf(await router.getAddress())).to.equal(ethers.parseEther("1000000"));
    expect(await token.balanceOf(creator.address)).to.equal(0);
    expect(await token.pendingOwner()).to.equal(creator.address);
    expect(await router.lastTo()).to.equal(holder.address);
    expect(await router.lastEthAmount()).to.equal(liquidityEth);
  });
});
