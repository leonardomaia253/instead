import { createConfig, http } from "wagmi";
import { injected, walletConnect } from "wagmi/connectors";
import {
  arbitrum,
  polygon,
  bsc,
  base,
  optimism,
  mainnet,
  avalanche,
} from "viem/chains";

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID as string;

export const SUPPORTED_CHAINS = [
  arbitrum,
  polygon,
  bsc,
  base,
  optimism,
  mainnet,
  avalanche,
] as const;

export const wagmiConfig = createConfig({
  chains: SUPPORTED_CHAINS,
  ssr: true,
  connectors: [
    injected(),
    walletConnect({ projectId }),
  ],
  transports: {
    [arbitrum.id]:  http(),
    [polygon.id]:   http(),
    [bsc.id]:       http(),
    [base.id]:      http(),
    [optimism.id]:  http(),
    [mainnet.id]:   http(),
    [avalanche.id]: http(),
  },
});

// ─── Metadados de rede para UI ────────────────────────────────────────────────
export const CHAIN_META: Record<number, {
  name: string;
  icon: string;
  color: string;
  gasLabel: string;
  factoryAddress: string;
  ethUsdFeed: string;
  explorer: string;
}> = {
  [arbitrum.id]: {
    name: "Arbitrum One",
    icon: "🔵",
    color: "#2563eb",
    gasLabel: "Gas Ultra Baixo (~$0.01)",
    factoryAddress: process.env.NEXT_PUBLIC_FACTORY_ARBITRUM ?? "",
    ethUsdFeed: "0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612",
    explorer: "https://arbiscan.io",
  },
  [polygon.id]: {
    name: "Polygon",
    icon: "🟣",
    color: "#7c3aed",
    gasLabel: "Gas Baixo (~$0.02)",
    factoryAddress: process.env.NEXT_PUBLIC_FACTORY_POLYGON ?? "",
    ethUsdFeed: "0xF9680D99D6C9589e2a93a78A04A279e509205945",
    explorer: "https://polygonscan.com",
  },
  [bsc.id]: {
    name: "BNB Chain",
    icon: "🟡",
    color: "#f59e0b",
    gasLabel: "Gas Baixo (~$0.05)",
    factoryAddress: process.env.NEXT_PUBLIC_FACTORY_BSC ?? "",
    ethUsdFeed: "0x0567F2323251f0Aab15c8dFb1967E4e8A7D42aeE",
    explorer: "https://bscscan.com",
  },
  [base.id]: {
    name: "Base",
    icon: "🔷",
    color: "#3b82f6",
    gasLabel: "Gas Ultra Baixo (~$0.005)",
    factoryAddress: process.env.NEXT_PUBLIC_FACTORY_BASE ?? "",
    ethUsdFeed: "0x71041dddad3595F9CEd3dCCFBe3D1F4b0a16Bb70",
    explorer: "https://basescan.org",
  },
  [optimism.id]: {
    name: "Optimism",
    icon: "🔴",
    color: "#ef4444",
    gasLabel: "Gas Muito Baixo (~$0.01)",
    factoryAddress: process.env.NEXT_PUBLIC_FACTORY_OPTIMISM ?? "",
    ethUsdFeed: "0x13e3Ee699D1909E989722E753853AE30b17e08c5",
    explorer: "https://optimistic.etherscan.io",
  },
  [mainnet.id]: {
    name: "Ethereum",
    icon: "⟠",
    color: "#64748b",
    gasLabel: "Gas Alto (~$5-20)",
    factoryAddress: process.env.NEXT_PUBLIC_FACTORY_MAINNET ?? "",
    ethUsdFeed: "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419",
    explorer: "https://etherscan.io",
  },
  [avalanche.id]: {
    name: "Avalanche",
    icon: "🔺",
    color: "#dc2626",
    gasLabel: "Gas Baixo (~$0.05)",
    factoryAddress: process.env.NEXT_PUBLIC_FACTORY_AVALANCHE ?? "",
    ethUsdFeed: "0x0A77230d17318075983913bC2145DB16C7366156",
    explorer: "https://snowtrace.io",
  },
};

// ─── Contract ABIs ────────────────────────────────────────────────────────────
export const TOKEN_FACTORY_ABI = [
  {
    name: "createToken",
    type: "function",
    stateMutability: "payable",
    inputs: [
      { name: "name", type: "string" },
      { name: "symbol", type: "string" },
      { name: "initialSupply", type: "uint256" },
      { name: "maxSupply", type: "uint256" },
      { name: "isMintable", type: "bool" },
    ],
    outputs: [{ name: "", type: "address" }],
  },
  {
    name: "getCreationFeeInEth",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "TokenCreated",
    type: "event",
    inputs: [
      { name: "tokenAddress", type: "address", indexed: true },
      { name: "creator", type: "address", indexed: true },
      { name: "name", type: "string", indexed: false },
      { name: "symbol", type: "string", indexed: false },
      { name: "initialSupply", type: "uint256", indexed: false },
      { name: "maxSupply", type: "uint256", indexed: false },
      { name: "mintable", type: "bool", indexed: false },
      { name: "feePaid", type: "uint256", indexed: false },
    ],
  },
] as const;

export const LENDING_POOL_ABI = [
  { name: "depositCollateral",type: "function", stateMutability: "nonpayable", inputs: [{ name: "asset", type: "address" }, { name: "amount", type: "uint256" }], outputs: [] },
  { name: "withdrawCollateral",type: "function", stateMutability: "nonpayable", inputs: [{ name: "asset", type: "address" }, { name: "amount", type: "uint256" }], outputs: [] },
  { name: "borrow",           type: "function", stateMutability: "nonpayable", inputs: [{ name: "asset", type: "address" }, { name: "amount", type: "uint256" }], outputs: [] },
  { name: "repay",            type: "function", stateMutability: "nonpayable", inputs: [{ name: "asset", type: "address" }, { name: "amount", type: "uint256" }], outputs: [] },
  { name: "userPositions",    type: "function", stateMutability: "view",       inputs: [{ name: "", type: "address" }, { name: "", type: "address" }], outputs: [{ name: "collateralBalance", type: "uint256" }, { name: "borrowBalance", type: "uint256" }] },
  { name: "supportedAssets",  type: "function", stateMutability: "view",       inputs: [{ name: "", type: "address" }], outputs: [{ name: "", type: "bool" }] },
] as const;

export const STAKING_ABI = [
  { name: "stake",         type: "function", stateMutability: "nonpayable", inputs: [{ name: "amount", type: "uint256" }], outputs: [] },
  { name: "unstake",       type: "function", stateMutability: "nonpayable", inputs: [{ name: "amount", type: "uint256" }], outputs: [] },
  { name: "claimReward",   type: "function", stateMutability: "nonpayable", inputs: [], outputs: [] },
  { name: "pendingReward", type: "function", stateMutability: "view", inputs: [{ name: "_user", type: "address" }], outputs: [{ name: "", type: "uint256" }] },
  { name: "userInfo",      type: "function", stateMutability: "view", inputs: [{ name: "user", type: "address" }], outputs: [{ name: "amount", type: "uint256" }, { name: "rewardDebt", type: "uint256" }] },
] as const;

export const CONTRACTS = {
  LENDING_POOL:  process.env.NEXT_PUBLIC_LENDING_POOL_ADDRESS as `0x${string}`,
  STAKING:       process.env.NEXT_PUBLIC_STAKING_ADDRESS as `0x${string}`,
  TOKEN_FACTORY: (process.env.NEXT_PUBLIC_FACTORY_ARBITRUM || process.env.NEXT_PUBLIC_TOKEN_FACTORY_ADDRESS) as `0x${string}`,
};
