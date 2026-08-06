import { expect } from "chai";
import { ethers } from "hardhat";

describe("Lending Adapters Unit Tests", function () {
  let deployer: any;
  let user: any;
  let mockToken: any;
  let mockSparkPool: any;
  let mockComet: any;
  let mockMorpho: any;

  beforeEach(async function () {
    [deployer, user] = await ethers.getSigners();

    // Deploy GenericToken as mock asset
    const GenericToken = await ethers.getContractFactory("GenericToken");
    mockToken = await GenericToken.deploy(
      "Test USD",
      "USDT",
      1000000, // initialSupply
      1000000, // maxSupply
      deployer.address,
      false, // mintable
      false, // taxable
      0,     // taxBPS
      false, // hasBlacklist
      false, // burnTax
      0      // maxWalletBPS
    );
    await mockToken.waitForDeployment();
  });

  describe("SparkAdapter", function () {
    it("deploys, sets asset support and checks adapter attributes", async function () {
      const Pool = await ethers.getContractFactory("MockAavePool");
      const pool = await Pool.deploy();
      const AToken = await ethers.getContractFactory("MockAToken");
      const aToken = await AToken.deploy(await mockToken.getAddress());
      const DebtToken = await ethers.getContractFactory("MockVariableDebtToken");
      const debtToken = await DebtToken.deploy(await mockToken.getAddress());
      const SparkAdapter = await ethers.getContractFactory("SparkAdapter");
      const sparkAdapter = await SparkAdapter.deploy(await pool.getAddress(), deployer.address);
      await sparkAdapter.waitForDeployment();

      const adapterId = await sparkAdapter.ADAPTER_ID();
      expect(adapterId).to.equal(ethers.keccak256(ethers.toUtf8Bytes("PROTOCOL_SPARK_V1")));
      expect(await sparkAdapter.adapterVersion()).to.equal(1);
      expect(await sparkAdapter.sparkPool()).to.equal(await pool.getAddress());

      const tokenAddr = await mockToken.getAddress();
      expect(await sparkAdapter.supportsAsset(tokenAddr)).to.equal(false);

      await sparkAdapter.configureAsset(tokenAddr, await aToken.getAddress(), await debtToken.getAddress(), true);
      expect(await sparkAdapter.supportsAsset(tokenAddr)).to.equal(true);
      expect(await sparkAdapter.aTokenByAsset(tokenAddr)).to.equal(await aToken.getAddress());
      expect(await sparkAdapter.variableDebtTokenByAsset(tokenAddr)).to.equal(await debtToken.getAddress());
    });
  });

  describe("CompoundV3Adapter", function () {
    it("deploys and maps comet market to asset", async function () {
      const MockComet = await ethers.getContractFactory("MockComet");
      const mockComet = await MockComet.deploy(await mockToken.getAddress());
      const CompoundV3Adapter = await ethers.getContractFactory("CompoundV3Adapter");
      const compoundAdapter = await CompoundV3Adapter.deploy(deployer.address);
      await compoundAdapter.waitForDeployment();

      const adapterId = await compoundAdapter.ADAPTER_ID();
      expect(adapterId).to.equal(ethers.keccak256(ethers.toUtf8Bytes("PROTOCOL_COMPOUND_V3")));
      expect(await compoundAdapter.adapterVersion()).to.equal(1);

      const tokenAddr = await mockToken.getAddress();
      await compoundAdapter.setCometMarket(tokenAddr, await mockComet.getAddress());
      expect(await compoundAdapter.supportsAsset(tokenAddr)).to.equal(true);
      expect(await compoundAdapter.assetToComet(tokenAddr)).to.equal(await mockComet.getAddress());
      await compoundAdapter.withdrawFor(user.address, tokenAddr, 123n);
      expect(await mockComet.lastWithdrawSrc()).to.equal(user.address);
      expect(await mockComet.lastWithdrawTo()).to.equal(user.address);
    });
  });

  describe("MorphoAdapter", function () {
    it("deploys and configures market parameters for isolated vault", async function () {
      const MockMorpho = await ethers.getContractFactory("MockMorpho");
      const mockMorpho = await MockMorpho.deploy();
      const MorphoAdapter = await ethers.getContractFactory("MorphoAdapter");
      const morphoAdapter = await MorphoAdapter.deploy(await mockMorpho.getAddress(), deployer.address);
      await morphoAdapter.waitForDeployment();

      const adapterId = await morphoAdapter.ADAPTER_ID();
      expect(adapterId).to.equal(ethers.keccak256(ethers.toUtf8Bytes("PROTOCOL_MORPHO_BLUE")));
      expect(await morphoAdapter.adapterVersion()).to.equal(1);

      const tokenAddr = await mockToken.getAddress();
      const mockParams = {
        loanToken: tokenAddr,
        collateralToken: ethers.ZeroAddress,
        oracle: "0x0000000000000000000000000000000000000999",
        irm: "0x0000000000000000000000000000000000000888",
        lltv: 800000000000000000n, // 80% LTV
      };

      await morphoAdapter.setMarketParams(tokenAddr, mockParams);
      expect(await morphoAdapter.supportsAsset(tokenAddr)).to.equal(true);
      await morphoAdapter.withdrawFor(user.address, tokenAddr, 123n);
      expect(await mockMorpho.lastOnBehalf()).to.equal(user.address);
      expect(await mockMorpho.lastReceiver()).to.equal(user.address);
      await morphoAdapter.borrowFor(user.address, tokenAddr, 456n);
      expect(await mockMorpho.lastOnBehalf()).to.equal(user.address);
      expect(await mockMorpho.lastReceiver()).to.equal(user.address);
    });
  });
});
