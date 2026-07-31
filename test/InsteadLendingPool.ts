import { expect } from "chai";
import { ethers } from "hardhat";

describe("InsteadLendingPool", function () {
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
    const implementation = await Adapter.deploy();
    const initData = Adapter.interface.encodeFunctionData("initialize", [
      await provider.getAddress(),
      treasury.address,
    ]);
    const Proxy = await ethers.getContractFactory("InsteadERC1967Proxy");
    const proxy = await Proxy.deploy(await implementation.getAddress(), initData);
    const adapter = Adapter.attach(await proxy.getAddress());
    await adapter.configureAsset(await token.getAddress(), await aToken.getAddress(), await debtToken.getAddress(), true);

    await token.mint(user.address, ethers.parseEther("1000"));
    await token.mint(await pool.getAddress(), ethers.parseEther("1000"));

    return { owner, user, treasury, token, aToken, debtToken, pool, provider, adapter };
  }

  it("supplies to Aave on behalf of the user, not the adapter", async function () {
    const { user, token, pool, adapter } = await deployFixture();
    const amount = ethers.parseEther("10");

    await token.connect(user).approve(await adapter.getAddress(), amount);
    await adapter.connect(user).supply(await token.getAddress(), amount);

    expect(await pool.lastSupplyOnBehalfOf()).to.equal(user.address);
    expect(await pool.lastSupplyOnBehalfOf()).to.not.equal(await adapter.getAddress());
  });

  it("borrows on behalf of the user and sends only the fee to treasury", async function () {
    const { user, treasury, token, debtToken, pool, adapter } = await deployFixture();
    const amount = ethers.parseEther("100");
    const expectedFee = ethers.parseEther("1.5");

    await debtToken.connect(user).approveDelegation(await adapter.getAddress(), amount);
    await adapter.connect(user).borrow(await token.getAddress(), amount);

    expect(await pool.lastBorrowOnBehalfOf()).to.equal(user.address);
    expect(await pool.lastBorrowOnBehalfOf()).to.not.equal(await adapter.getAddress());
    expect(await token.balanceOf(treasury.address)).to.equal(expectedFee);
    expect(await token.balanceOf(user.address)).to.equal(ethers.parseEther("1098.5"));
  });

  it("rejects borrow without enough Aave credit delegation", async function () {
    const { user, token, adapter } = await deployFixture();
    const amount = ethers.parseEther("100");

    await expect(
      adapter.connect(user).borrow(await token.getAddress(), amount)
    ).to.be.revertedWith("Insufficient credit delegation");
  });

  it("repays on behalf of the user", async function () {
    const { user, token, pool, adapter } = await deployFixture();
    const amount = ethers.parseEther("25");

    await token.connect(user).approve(await adapter.getAddress(), amount);
    await adapter.connect(user).repay(await token.getAddress(), amount);

    expect(await pool.lastRepayOnBehalfOf()).to.equal(user.address);
    expect(await pool.lastRepayOnBehalfOf()).to.not.equal(await adapter.getAddress());
  });

  it("rejects aToken mappings that do not match the underlying asset", async function () {
    const { adapter, token, debtToken } = await deployFixture();
    const Token = await ethers.getContractFactory("MockERC20");
    const otherToken = await Token.deploy();

    const AToken = await ethers.getContractFactory("MockAToken");
    const mismatchedAToken = await AToken.deploy(await otherToken.getAddress());

    await expect(
      adapter.configureAsset(await token.getAddress(), await mismatchedAToken.getAddress(), await debtToken.getAddress(), true)
    ).to.be.revertedWith("aToken mismatch");
  });

  it("rejects debt token mappings that do not match the underlying asset", async function () {
    const { adapter, token, aToken } = await deployFixture();
    const Token = await ethers.getContractFactory("MockERC20");
    const otherToken = await Token.deploy();

    const DebtToken = await ethers.getContractFactory("MockVariableDebtToken");
    const mismatchedDebtToken = await DebtToken.deploy(await otherToken.getAddress());

    await expect(
      adapter.configureAsset(await token.getAddress(), await aToken.getAddress(), await mismatchedDebtToken.getAddress(), true)
    ).to.be.revertedWith("debt token mismatch");
  });
});
