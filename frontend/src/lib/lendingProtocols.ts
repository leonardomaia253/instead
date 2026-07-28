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
};

export const LENDING_PROTOCOLS: LendingProtocolDefinition[] = [
  { id: "aave_v3",      name: "Aave v3",          runtime: "evm",         adapterKind: "aave_v3",        status: "active",   productionReady: true },
  { id: "spark",        name: "SparkLend",         runtime: "evm",         adapterKind: "aave_derived",   status: "planned",  productionReady: false },
  { id: "radiant",      name: "Radiant Capital",   runtime: "evm",         adapterKind: "aave_derived",   status: "research", productionReady: false },
  { id: "compound_v3",  name: "Compound III",      runtime: "evm",         adapterKind: "compound_comet", status: "planned",  productionReady: false },
  { id: "morpho_blue",  name: "Morpho Blue",       runtime: "evm",         adapterKind: "morpho_blue",    status: "planned",  productionReady: false },
  { id: "venus",        name: "Venus Protocol",    runtime: "evm",         adapterKind: "ctoken_market",  status: "planned",  productionReady: false },
  { id: "benqi",        name: "BENQI",             runtime: "evm",         adapterKind: "ctoken_market",  status: "planned",  productionReady: false },
  { id: "euler_v2",     name: "Euler v2",          runtime: "evm",         adapterKind: "evk_vault",      status: "research", productionReady: false },
  { id: "silo",         name: "Silo Finance",      runtime: "evm",         adapterKind: "isolated_vault", status: "research", productionReady: false },
  { id: "exactly",      name: "Exactly Protocol",  runtime: "evm",         adapterKind: "fixed_rate",     status: "research", productionReady: false },
  { id: "gearbox",      name: "Gearbox",           runtime: "evm",         adapterKind: "credit_account", status: "research", productionReady: false },
  { id: "maker_sky",    name: "MakerDAO/Sky",      runtime: "evm_special", adapterKind: "maker_sky",      status: "research", productionReady: false },
  { id: "kamino",       name: "Kamino Finance",    runtime: "solana",      adapterKind: "solana_sdk",     status: "research", productionReady: false },
  { id: "marginfi",     name: "Marginfi",          runtime: "solana",      adapterKind: "solana_sdk",     status: "research", productionReady: false },
];
