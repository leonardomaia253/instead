# Instead Solana Production Blueprint

This blueprint is the target architecture for a production-grade Solana launch. It complements the Anchor scaffold in this directory.

## Product capabilities

### Token factory

- SPL Token and Token-2022 mint creation.
- Presets:
  - standard SPL token
  - fixed-supply immutable token
  - mintable governance token
  - Token-2022 transfer-fee token
  - metadata-locked community token
  - fair-launch token with liquidity workflow
  - enterprise/governance-owned token
- Per-launch registry PDA for auditability and Supabase reconciliation.
- Platform creation fee in lamports, with optional future oracle-backed USD pricing.
- Governance-controlled pause switch.
- Two-step authority transfer.
- Treasury as Squads/multisig-compatible address.

### Liquidity

Solana liquidity is not a drop-in equivalent to EVM `addLiquidityETH`.

Target flow:

1. Create mint and creator ATA.
2. Build a Jupiter/Raydium/Orca quote off-chain.
3. Show exact transaction bundle to the user.
4. User signs with Solana wallet.
5. Program records a liquidity plan PDA or updates the launch registry.
6. Backend reconciles the resulting signature, pool, mint, and balances.

Recommended first production route:

- Jupiter Swap API for quote/swap transaction construction.
- Raydium/Orca direct integrations only after dedicated pool/liquidity tests.

### Oracle

- Use Pyth for SOL/USD and any token pricing that must influence program logic.
- Use off-chain quote sanity checks for UX estimates.
- Avoid trusting frontend-provided USD conversion without on-chain or backend verification.

### Admin and security

- Authority must be a multisig before mainnet traffic.
- Program upgrade authority must be transferred to multisig or intentionally frozen after audit.
- Pause switch must be tested on devnet.
- Every privileged instruction must emit an event.
- All launch records must be indexed into Supabase with reconciliation jobs.

## Program backlog

- Add Token-2022 transfer-fee extension initialization.
- Add metadata immutability enforcement per preset.
- Add mint authority revoke/freeze authority revoke instructions.
- Add platform fee schedule account for SKU pricing.
- Add allowlisted preset account with versioning.
- Add optional Pyth price account validation for USD-denominated fees.
- Add liquidity plan PDA with expiry and quote hash.
- Add post-liquidity verification instruction.
- Add Squads/multisig runbook.

## Test matrix

- Platform initialization rejects invalid BPS and excessive fees.
- Non-authority cannot update platform.
- Pause blocks token creation.
- Two-step authority transfer cannot be hijacked.
- Token creation validates name/symbol/URI/supply/decimals.
- Treasury receives creation fee.
- Mint supply lands in creator ATA.
- Metadata is created with expected name/symbol/URI.
- Liquidity plan rejects expired quote.
- Liquidity completion requires creator or authorized backend signer.
- Fuzz invalid BPS/supply/decimals.
- Devnet soak: 100 launches, reconciliation, explorer links, frontend readback.

## Mainnet launch gate

Do not deploy for public production until:

- Anchor tests pass locally.
- Devnet deployment has a written soak report.
- Program ID is saved in `NEXT_PUBLIC_SOLANA_FACTORY_PROGRAM_ID`.
- Program upgrade authority policy is documented.
- Treasury/multisig addresses are documented.
- Supabase reconciliation is live.
- Alerting is live.
- External Solana audit is complete.
