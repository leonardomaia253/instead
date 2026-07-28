# Instead Smart Contract Security Review

Date: 2026-07-24  
Scope: Solidity contracts, protocol adapters and deployment workflow  
Review type: Internal security review  
External Audit: Not complete  
Production verdict: Blocked until external audit, verified deployments, multisig ownership, fork evidence and production smoke checks are complete.

## Scope

- `contracts/TokenFactory.sol`
- `contracts/GenericToken.sol`
- `contracts/InsteadStaking.sol`
- `contracts/InsteadLendingPool.sol`
- `contracts/InsteadLendingRouter.sol`
- `contracts/InsteadERC1967Proxy.sol`
- `contracts/adapters/*`
- Hardhat deployment and ownership scripts

## Internal findings summary

| Area | Internal status | Production gate |
| --- | --- | --- |
| Token Factory | Internal checks passed | Deploy, verify bytecode, verify factory version/router/feed/treasury |
| Fair Launch liquidity | Internal checks passed | Fork/testnet slippage and router tests per network |
| Lending Pool | Internal tests passed | Fork tests and Aave asset/debt-token config per network |
| Lending Router/adapters | Internal tests passed | Adapter allowlist, kill switch and fork tests |
| Staking | Internal checks passed | Deploy and ownership verification |
| Ownership | Scripted | Must be transferred to `PRODUCTION_MULTISIG_ADDRESS` |
| External audit | Not complete | Required when `REQUIRE_EXTERNAL_AUDIT=true` |

## Production-blocking requirements

Before public production traffic:

1. Rotate every secret/private key/API key that appeared in chat, logs, issues or screenshots.
2. Run `pnpm secrets:check`.
3. Run `pnpm addresses:check`.
4. Run `pnpm contracts:test`.
5. If lending is enabled, run fork tests with real RPC and Aave provider:
   ```bash
   HARDHAT_FORK_RPC_URL=<rpc> AAVE_POOL_ADDRESSES_PROVIDER=<provider> pnpm contracts:test:fork
   ```
6. Deploy contracts with a fresh deployer key that has never been shared.
7. Verify deployments:
   ```bash
   DEPLOYMENT_NETWORK=<network> DEPLOYMENT_RPC_URL=<rpc> pnpm deployments:verify
   ```
8. Transfer ownership to multisig and verify:
   ```bash
   DEPLOYMENT_NETWORK=<network> DEPLOYMENT_RPC_URL=<rpc> PRODUCTION_MULTISIG_ADDRESS=<safe> pnpm ownership:verify
   ```
9. Complete external audit and record it in this file as:
   ```text
   External Audit: Complete
   ```
10. Run:
    ```bash
    REQUIRE_EVM_PRODUCTION_GATE=true REQUIRE_EXTERNAL_AUDIT=true PRODUCTION_TARGET=evm pnpm production:gate
    ```

## Notes from internal review

- Token Factory uses Chainlink price freshness checks for creation fees.
- Token Factory requires an UniswapV2-like router for fair launch liquidity.
- Lending Pool uses non-custodial Aave `onBehalfOf=user` semantics.
- Borrow flow requires explicit Aave credit delegation.
- Upgradeable contracts must remain multisig-controlled.
- Supabase rows must never be treated as authorization to move funds.

## Final status

Internal review is useful evidence, not a substitute for an external audit.

Status: INTERNAL REVIEW COMPLETE — EXTERNAL AUDIT REQUIRED BEFORE PUBLIC PRODUCTION.
