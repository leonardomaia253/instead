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
      const mockPoolAddress = "0x0000000000000000000000000000000000000123";
      const SparkAdapter = await ethers.getContractFactory("SparkAdapter");
      const sparkAdapter = await SparkAdapter.deploy(mockPoolAddress, deployer.address);
      await sparkAdapter.waitForDeployment();

      const adapterId = await sparkAdapter.ADAPTER_ID();
      expect(adapterId).to.equal(ethers.keccak256(ethers.toUtf8Bytes("PROTOCOL_SPARK_V1")));
      expect(await sparkAdapter.adapterVersion()).to.equal(1);
      expect(await sparkAdapter.sparkPool()).to.equal(mockPoolAddress);

      const tokenAddr = await mockToken.getAddress();
      expect(await sparkAdapter.supportsAsset(tokenAddr)).to.equal(false);

      await sparkAdapter.setAssetSupport(tokenAddr, true);
      expect(await sparkAdapter.supportsAsset(tokenAddr)).to.equal(true);
    });
  });

  describe("CompoundV3Adapter", function () {
    it("deploys and maps comet market to asset", async function () {
      const mockCometAddress = "0x0000000000000000000000000000000000000456";
      const CompoundV3Adapter = await ethers.getContractFactory("CompoundV3Adapter");
      const compoundAdapter = await CompoundV3Adapter.deploy(deployer.address);
      await compoundAdapter.waitForDeployment();

      const adapterId = await compoundAdapter.ADAPTER_ID();
      expect(adapterId).to.equal(ethers.keccak256(ethers.toUtf8Bytes("PROTOCOL_COMPOUND_V3")));
      expect(await compoundAdapter.adapterVersion()).to.equal(1);

      const tokenAddr = await mockToken.getAddress();
      await compoundAdapter.setCometMarket(tokenAddr, mockCometAddress);
      expect(await compoundAdapter.supportsAsset(tokenAddr)).to.equal(true);
      expect(await compoundAdapter.assetToComet(tokenAddr)).to.equal(mockCometAddress);
    });
  });

  describe("MorphoAdapter", function () {
    it("deploys and configures market parameters for isolated vault", async function () {
      const mockMorphoAddress = "0x0000000000000000000000000000000000000789";
      const MorphoAdapter = await ethers.getContractFactory("MorphoAdapter");
      const morphoAdapter = await MorphoAdapter.deploy(mockMorphoAddress, deployer.address);
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
    });
  });
});
