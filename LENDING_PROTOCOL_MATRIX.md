# Lending protocol matrix

This is the production integration map for the Instead lending vertical.

The platform should not couple every protocol directly into one monolithic contract. Each protocol must be integrated through a dedicated adapter with a shared UI/API contract, independent risk flags, per-chain addresses, fork tests and kill switches.

## Adapter tiers

| Protocol | Runtime | Adapter path | Notes |
| --- | --- | --- | --- |
| Aave v3 | EVM | Solidity adapter | Current implemented baseline. User position stays on Aave via `onBehalfOf = user`. |
| SparkLend | EVM | Solidity adapter | Aave-derived market style; can reuse much of the Aave adapter shape after docs/address validation. |
| Radiant | EVM | Solidity adapter | Aave-derived, cross-chain risk profile. Must be gated per deployment and security status. |
| Compound III | EVM | Solidity adapter | Comet market model; one base asset per market, collateral via Comet. Different from Aave. |
| Morpho Blue | EVM | Solidity adapter | Isolated markets with explicit market params. Needs market-id/config registry. |
| Venus | EVM | Solidity adapter | BNB Chain/isolated pools via Comptroller/vTokens. Needs enter-market and vToken config. |
| BENQI | EVM | Solidity adapter | Avalanche lending markets. Similar cToken-style flow, Avalanche-specific. |
| Euler v2 | EVM | Solidity adapter | EVK/EVC vault architecture. Needs vault connector risk validation. |
| Silo | EVM | Solidity adapter | Isolated lending markets, ERC-4626-like vault surfaces in v3. |
| Exactly | EVM | Solidity adapter | Fixed/variable rate model. Needs maturity/rate-mode support in UI. |
| Gearbox | EVM | Advanced adapter | Credit-account model. Not a simple supply/borrow/repay adapter; treat as advanced/leverage only. |
| Maker/Sky | EVM special | Vault/savings adapter | CDP/vault and savings-rate flows, not a lending-pool adapter. |
| Kamino | Solana | API/SDK adapter | Solana transaction builder via Kamino SDK/API; not callable from EVM contracts. |
| Marginfi | Solana | API/SDK adapter | Solana lending accounts/banks via SDK; separate wallet/runtime path. |

## Required production checks per protocol

- Official docs reviewed and pinned in adapter notes.
- Supported chain and market addresses configured in Supabase.
- Adapter unit tests with mocks.
- Fork tests against real protocol contracts where EVM.
- Testnet or simulation evidence before production.
- Per-protocol pause/disable flag.
- Health-factor or risk metric mapping.
- Event/reconciliation coverage.
- Explicit user disclosure when the protocol is not Aave-style.

## Rollout recommendation

1. Keep Aave v3 as active baseline.
2. Add Spark/Radiant only if their current deployments and docs match the Aave adapter semantics.
3. Add Morpho and Compound next because they are major EVM protocols but require their own adapters.
4. Add Venus/BENQI per-chain where user demand exists.
5. Add Euler/Silo/Exactly after isolated-market/vault risk screens exist.
6. Keep Gearbox, Maker/Sky, Kamino and Marginfi as separate product modes, not direct Aave-compatible routes.
