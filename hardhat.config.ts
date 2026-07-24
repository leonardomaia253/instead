import type { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY;
const HARDHAT_FORK_RPC_URL = process.env.HARDHAT_FORK_RPC_URL;
const HARDHAT_FORK_BLOCK_NUMBER = process.env.HARDHAT_FORK_BLOCK_NUMBER
  ? Number(process.env.HARDHAT_FORK_BLOCK_NUMBER)
  : undefined;

function network(urlEnv: string) {
  const url = process.env[urlEnv] ?? "";
  return {
    url,
    accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
  };
}

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.26",
    settings: {
      evmVersion: "cancun",
      optimizer: {
        enabled: true,
        runs: 1,
      },
      viaIR: true,
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  networks: {
    hardhat: HARDHAT_FORK_RPC_URL
      ? {
          forking: {
            url: HARDHAT_FORK_RPC_URL,
            blockNumber: HARDHAT_FORK_BLOCK_NUMBER,
          },
        }
      : {},
    arbitrum: network("ARBITRUM_RPC_URL"),
    polygon: network("POLYGON_RPC_URL"),
    bsc: network("BSC_RPC_URL"),
    base: network("BASE_RPC_URL"),
    optimism: network("OPTIMISM_RPC_URL"),
    mainnet: network("MAINNET_RPC_URL"),
    avalanche: network("AVALANCHE_RPC_URL"),
    sepolia: network("SEPOLIA_RPC_URL"),
    baseSepolia: network("BASE_SEPOLIA_RPC_URL"),
    arbitrumSepolia: network("ARBITRUM_SEPOLIA_RPC_URL"),
    optimismSepolia: network("OPTIMISM_SEPOLIA_RPC_URL"),
  },
  etherscan: {
    apiKey: {
      arbitrumOne: process.env.ARBISCAN_API_KEY ?? "",
      polygon: process.env.POLYGONSCAN_API_KEY ?? "",
      bsc: process.env.BSCSCAN_API_KEY ?? "",
      base: process.env.BASESCAN_API_KEY ?? "",
      optimisticEthereum: process.env.OPTIMISTIC_ETHERSCAN_API_KEY ?? "",
      mainnet: process.env.ETHERSCAN_API_KEY ?? "",
      avalanche: process.env.SNOWTRACE_API_KEY ?? "",
    },
  },
};

export default config;
