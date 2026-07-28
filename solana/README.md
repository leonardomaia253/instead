# Instead Solana Factory

This is the Solana track for Instead Finance. It is intentionally separate from the EVM `TokenFactory.sol` because Solana programs, SPL/Token-2022 mints, liquidity routing, and oracle integrations are not EVM-compatible.

## Production-grade scope

The target is not an MVP. The Solana product line should include:

- Anchor program with platform governance, treasury, pause switch, two-step authority transfer, launch registry, and events.
- Token-2022-first mint creation with metadata and room for transfer-fee/freeze/mint-authority presets.
- Presets matching the EVM product language: standard, mintable, burnable/client-side burn UX, deflationary/fee, fair-launch, and governance-owned.
- Jupiter/Raydium/Orca liquidity flow through dedicated Solana transaction construction, not EVM `addLiquidityETH`.
- Pyth oracle integration for any USD-denominated fee, quote, or risk logic that must run on Solana.
- Supabase reconciliation and admin audit logging mirroring EVM launches.
- Devnet soak tests before mainnet-beta.
- External audit before public mainnet traffic.

## Current state

The current program is a production-oriented foundation, not a completed audited mainnet launch:

- platform initialization/update
- treasury fee collection in lamports
- pause switch
- two-step authority transfer
- Token-2022 mint initialization
- Metaplex metadata creation
- launch account registry
- liquidity planning/completion markers

Still required before mainnet:

- real Token-2022 transfer-fee extension initialization
- immutable/freezable/mint authority finalization per preset
- Jupiter/Raydium/Orca transaction builder and post-swap verification
- Pyth SOL/USD quote validation if fees are USD-denominated
- Anchor tests against local validator
- devnet deployment and soak run
- multisig authority handoff
- audit

## Setup

Install Solana + Anchor using current official docs:

- Solana install docs: https://solana.com/docs/intro/installation
- Anchor docs: https://www.anchor-lang.com/

Then:

```bash
cd solana
pnpm install
anchor build
anchor test
```

## Deploy

Devnet first:

```bash
solana config set --url devnet
anchor build
anchor deploy --provider.cluster devnet
```

Mainnet-beta only after audit/soak:

```bash
solana config set --url "$SOLANA_RPC_URL"
anchor deploy --provider.cluster mainnet
```

After deployment, set:

```env
NEXT_PUBLIC_SOLANA_FACTORY_PROGRAM_ID=<program-id>
```

Do not commit deployer keypairs, RPC API keys, or authority keypairs.

## Production gate

For serious production:

```bash
REQUIRE_SOLANA_PRODUCTION=true PRODUCTION_TARGET=solana pnpm production:gate
```

This gate requires:

- `SOLANA_RPC_URL`
- `NEXT_PUBLIC_SOLANA_FACTORY_PROGRAM_ID`
- Rust/Cargo
- Solana CLI
- Anchor CLI
- Anchor build and tests

If any of those are missing, production must remain blocked.
