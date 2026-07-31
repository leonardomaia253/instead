import { expect } from "chai";
import { ethers } from "hardhat";

describe("InsteadLendingRouter", function () {
  async function deployFixture() {
    const [owner, user, treasury] = await ethers.getSigners();

    const Token = await ethers.getContractFactory("MockERC20");
    const token = await Token.deploy();

    const AToken = await ethers.getContractFactory("MockAToken");
    const aToken = await AToken.deploy(await token.getAddress());

    const DebtToken = await ethers.getContractFactory("MockVariableDebtToken");
    const debtToken = await DebtToken.deploy(await token.getAddress());

    const Pool = await ethers.getContractFactory("MockAavePool");
    const pool = await Pool.deploy();

    const Provider = await ethers.getContractFactory("MockAddressesProvider");
    const provider = await Provider.deploy(await pool.getAddress());

    const Adapter = await ethers.getContractFactory("InsteadLendingPool");
    const adapterImplementation = await Adapter.deploy();
    const adapterInitData = Adapter.interface.encodeFunctionData("initialize", [
      await provider.getAddress(),
      treasury.address,
    ]);

    const Proxy = await ethers.getContractFactory("InsteadERC1967Proxy");
    const adapterProxy = await Proxy.deploy(await adapterImplementation.getAddress(), adapterInitData);
    const adapter = Adapter.attach(await adapterProxy.getAddress());
    await adapter.configureAsset(await token.getAddress(), await aToken.getAddress(), await debtToken.getAddress(), true);

    const Router = await ethers.getContractFactory("InsteadLendingRouter");
    const routerImplementation = await Router.deploy();
    const routerInitData = Router.interface.encodeFunctionData("initialize", [owner.address]);
    const routerProxy = await Proxy.deploy(await routerImplementation.getAddress(), routerInitData);
    const router = Router.attach(await routerProxy.getAddress());

    await adapter.setAuthorizedRouter(await router.getAddress());
    await token.mint(user.address, ethers.parseEther("1000"));
    await token.mint(await pool.getAddress(), ethers.parseEther("1000"));

    return { owner, user, treasury, token, debtToken, pool, adapter, router };
  }

  it("rejects disabled adapters", async function () {
    const { user, token, adapter, router } = await deployFixture();
    await token.connect(user).approve(await router.getAddress(), ethers.parseEther("1"));

    await expect(
      router.connect(user).supply(await adapter.getAddress(), await token.getAddress(), ethers.parseEther("1")),
    ).to.be.revertedWith("Adapter disabled");
  });

  it("routes supply through an enabled adapter on behalf of the user", async function () {
    const { user, token, pool, adapter, router } = await deployFixture();
    const amount = ethers.parseEther("10");

    await router.configureAdapter(await adapter.getAddress(), await adapter.ADAPTER_ID(), true, 2);
    await token.connect(user).approve(await router.getAddress(), amount);
    await router.connect(user).supply(await adapter.getAddress(), await token.getAddress(), amount);

    expect(await pool.lastSupplyOnBehalfOf()).to.equal(user.address);
    expect(await pool.lastSupplyOnBehalfOf()).to.not.equal(await adapter.getAddress());
    expect(await pool.lastSupplyOnBehalfOf()).to.not.equal(await router.getAddress());
  });

  it("routes borrow through an enabled adapter on behalf of the user", async function () {
    const { user, treasury, token, debtToken, pool, adapter, router } = await deployFixture();
    const amount = ethers.parseEther("100");

    await router.configureAdapter(await adapter.getAddress(), await adapter.ADAPTER_ID(), true, 2);
    await debtToken.connect(user).approveDelegation(await adapter.getAddress(), amount);
    await router.connect(user).borrow(await adapter.getAddress(), await token.getAddress(), amount);

    expect(await pool.lastBorrowOnBehalfOf()).to.equal(user.address);
    expect(await token.balanceOf(treasury.address)).to.equal(ethers.parseEther("1.5"));
    expect(await token.balanceOf(user.address)).to.equal(ethers.parseEther("1098.5"));
  });
});
