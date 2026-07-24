export type LendingRuntime = "evm" | "solana" | "evm_special";
export type LendingAdapterKind =
  | "aave_v3"
  | "aave_derived"
  | "compound_comet"
  | "morpho_blue"
  | "ctoken_market"
  | "evk_vault"
  | "isolated_vault"
  | "fixed_rate"
  | "credit_account"
  | "maker_sky"
  | "solana_sdk";
export type LendingProtocolStatus = "active" | "planned" | "blocked" | "research";

export type LendingProtocolDefinition = {
  id: string;
  name: string;
  runtime: LendingRuntime;
  adapterKind: LendingAdapterKind;
  status: LendingProtocolStatus;
  productionReady: boolean;
  notes: string;
};

export const LENDING_PROTOCOLS: LendingProtocolDefinition[] = [
  {
    id: "aave_v3",
    name: "Aave v3",
    runtime: "evm",
    adapterKind: "aave_v3",
    status: "active",
    productionReady: false,
    notes: "Implemented baseline adapter; still requires real deployment, fork tests and audits per network.",
  },
  {
    id: "spark",
    name: "SparkLend",
    runtime: "evm",
    adapterKind: "aave_derived",
    status: "planned",
    productionReady: false,
    notes: "Aave-derived semantics, but addresses and docs must be validated per network.",
  },
  {
    id: "radiant",
    name: "Radiant Capital",
    runtime: "evm",
    adapterKind: "aave_derived",
    status: "research",
    productionReady: false,
    notes: "Cross-chain/security profile requires stricter gating before enabling.",
  },
  {
    id: "compound_v3",
    name: "Compound III",
    runtime: "evm",
    adapterKind: "compound_comet",
    status: "planned",
    productionReady: false,
    notes: "Comet uses one base asset per market; needs a dedicated adapter.",
  },
  {
    id: "morpho_blue",
    name: "Morpho Blue",
    runtime: "evm",
    adapterKind: "morpho_blue",
    status: "planned",
    productionReady: false,
    notes: "Requires market params/id registry and isolated risk validation.",
  },
  {
    id: "venus",
    name: "Venus Protocol",
    runtime: "evm",
    adapterKind: "ctoken_market",
    status: "planned",
    productionReady: false,
    notes: "BNB Chain and isolated pools via Comptroller/vToken config.",
  },
  {
    id: "benqi",
    name: "BENQI",
    runtime: "evm",
    adapterKind: "ctoken_market",
    status: "planned",
    productionReady: false,
    notes: "Avalanche-specific lending markets.",
  },
  {
    id: "euler_v2",
    name: "Euler v2",
    runtime: "evm",
    adapterKind: "evk_vault",
    status: "research",
    productionReady: false,
    notes: "EVK/EVC vault architecture, not Aave-compatible.",
  },
  {
    id: "silo",
    name: "Silo Finance",
    runtime: "evm",
    adapterKind: "isolated_vault",
    status: "research",
    productionReady: false,
    notes: "Isolated markets/vaults require per-silo config.",
  },
  {
    id: "exactly",
    name: "Exactly Protocol",
    runtime: "evm",
    adapterKind: "fixed_rate",
    status: "research",
    productionReady: false,
    notes: "Fixed/variable rate model needs maturity-aware UI.",
  },
  {
    id: "gearbox",
    name: "Gearbox",
    runtime: "evm",
    adapterKind: "credit_account",
    status: "research",
    productionReady: false,
    notes: "Credit-account/leverage model; should be separate advanced product mode.",
  },
  {
    id: "maker_sky",
    name: "MakerDAO/Sky",
    runtime: "evm_special",
    adapterKind: "maker_sky",
    status: "research",
    productionReady: false,
    notes: "Vault/savings flows, not a generic lending pool.",
  },
  {
    id: "kamino",
    name: "Kamino Finance",
    runtime: "solana",
    adapterKind: "solana_sdk",
    status: "research",
    productionReady: false,
    notes: "Solana SDK/API integration; cannot be called from EVM lending adapter.",
  },
  {
    id: "marginfi",
    name: "Marginfi",
    runtime: "solana",
    adapterKind: "solana_sdk",
    status: "research",
    productionReady: false,
    notes: "Solana lending accounts/banks via SDK; separate wallet/runtime path.",
  },
];
