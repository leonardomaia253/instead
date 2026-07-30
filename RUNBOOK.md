# Instead Production Runbook

## Go-live sequence

1. Rotate any secret that appeared in chat, logs, issues or screenshots.
2. Fill hosting/Supabase secrets from `.env.production.example`.
3. Apply Supabase migrations in staging, then production.
4. Run `pnpm supabase:diagnose` and fix any mismatch before deploying functions; `SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, anon keys, service role key, and `SUPABASE_PROJECT_REF` must identify the same project. If `frontend/.env.local` and process env disagree, choose the production project and remove or update the other source before continuing.
5. Deploy Edge Functions with `SUPABASE_PROJECT_REF=<project-ref> SYNC_SUPABASE_SECRETS=true pnpm edge:functions:deploy`, which can sync configured secrets and publishes `siwe-auth`, `token-ai`, `lending-ai`, `telegram-bot`, `balance-monitor`, and `lending-automation`.
6. Configure Telegram webhook with `pnpm telegram:set-webhook`; set `REQUIRE_TELEGRAM_BOT=true` only after the webhook URL, secret, bot token and service role are configured.
7. For public paid/bot/AI traffic, configure a distributed rate-limit layer in Vercel WAF, set `REQUIRE_DISTRIBUTED_RATE_LIMIT=true`, and set `DISTRIBUTED_RATE_LIMIT_PROVIDER=vercel-waf:instead-prod-api-abuse-v1`. Mirror `config/vercel-waf-rate-limit-policy.json` in Vercel Dashboard under Project > Firewall > WAF > Custom Rules > Rate Limit. In-memory limits are only a local backstop.
8. Deploy Token Factory per target network.
   Configure `DEX_ROUTER_ADDRESS` para Fair Launch on-chain e valide em fork/testnet antes de publicar a oferta.
9. Deploy Lending adapter only on networks where Aave asset config is ready.
10. Deploy `InsteadLendingRouter` with `pnpm deploy:lending-router --network <network>` before enabling multi-protocol lending.
11. Run `pnpm lending:configure-assets --network <network>` after lending deploy.
   Seed protocol routing metadata with `SUPABASE_URL=https://... SUPABASE_SERVICE_ROLE_KEY=... pnpm db:lending-protocols:seed`.
12. Before mainnet, run local mocks with `pnpm contracts:test`, a local fork with `HARDHAT_FORK_RPC_URL=<rpc> AAVE_POOL_ADDRESSES_PROVIDER=0x... pnpm contracts:test:fork`, and a public testnet deploy. Keep `REQUIRE_LENDING_FORK_TEST=true` for lending go-live.
13. Verify `deployments/<network>.json` with `pnpm deployments:verify`.
    If explorer API keys are unavailable, run `DEPLOYMENT_NETWORK=<network> pnpm contracts:verify:sourcify` and confirm Sourcify reports `exact_match` for implementations/factory and `match` for ERC1967 proxies.
14. Transfer contract ownership to `PRODUCTION_MULTISIG_ADDRESS` with `pnpm ownership:transfer --network <network>`.
15. Verify ownership on-chain with `pnpm ownership:verify`.
16. Run `pnpm audit:local-production` before deployment; it serializes workspace hygiene, local API security, secret, revenue, UX, performance, dependency, contract, build, and type checks.
17. For serious production, set `REQUIRE_STRICT_PRODUCTION_GATE=true`, `REQUIRE_EVM_PRODUCTION_GATE=true`, `REQUIRE_EXTERNAL_AUDIT=true`, `DEPLOYMENT_NETWORK=<network>`, and `DEPLOYMENT_RPC_URL=<rpc>`, then run `pnpm production:gate`. Strict mode fails on warnings, including skipped smoke tests, disabled Solana go-live, disabled fork evidence, and missing integration credentials.
    To certify the current production environment in one command, run `pnpm production:certify`; it diagnoses Supabase env, syncs Edge Function secrets, deploys Edge Functions, and runs the strict production gate.
18. Deploy frontend and Edge Functions.
19. Run `pnpm smoke:test` against the production URL.
20. Enable `NEXT_PUBLIC_ENABLE_PRODUCTION_LENDING=true` only after lending tests pass on that network.

## Solana go-live sequence

Solana is a separate non-EVM track. Do not treat it as a Hardhat network.

1. Rotate any Solana RPC API key or keypair that appeared in chat, logs, issues or screenshots.
2. Install Rust/Cargo, Solana CLI and Anchor CLI from official docs.
3. Configure `SOLANA_RPC_URL` in the deployment environment.
4. Build and test the Anchor workspace:
   - `pnpm solana:check`
   - `pnpm solana:build`
   - `pnpm solana:test`
5. Deploy to devnet and complete a written soak test.
6. Transfer program authority/treasury authority to multisig/Squads policy where applicable.
7. Deploy to mainnet-beta only after audit and soak.
8. Set `NEXT_PUBLIC_SOLANA_FACTORY_PROGRAM_ID=<program-id>`.
9. Set `REQUIRE_SOLANA_PRODUCTION=true`.
10. Run `PRODUCTION_TARGET=solana pnpm production:gate`.

## Incident pause

1. Confirm incident from on-chain events, Supabase reconciliation, RPC traces or monitoring alert.
2. Use multisig to call `pause()` on affected contracts.
3. Disable `NEXT_PUBLIC_ENABLE_PRODUCTION_LENDING` in hosting if lending is involved.
4. Stop Telegram lending promotion by editing bot copy or disabling webhook.
5. Mark affected operations as `mismatch` or `failed` in reconciliation queue.
6. Publish user-facing status update.
7. Prepare fix, test in fork/staging, and require multisig approval before unpause.

## Required monitoring

- Frontend build/deploy status.
- Supabase Edge Function error rate.
- Telegram webhook 4xx/5xx rate.
- RPC latency and failure rate.
- Operational gas balances across Ethereum, Base, Arbitrum, Optimism, Polygon, Avalanche, BNB Chain, and Solana.
- Contract `Paused`, `AssetConfigured`, `Borrowed`, `Repaid`, `CollateralSupplied`, `CollateralWithdrawn` events.
- Contract `owner()` remains the production multisig.
- Aave user health factor for active lending users.
- Reconciliation queue items stuck in `pending` or `mismatch`.
- Smoke test for `/pt`, `/pt/factory`, `/pt/lending`, `/robots.txt`, `/sitemap.xml`, and Edge Function auth behavior.
- `/api/health` returns `status: ok` and must stay uncached.

### Balance monitor

Run `pnpm balances:monitor` from cron/CI to verify operational gas balances. Low balances send Telegram alerts through `TELEGRAM_BOT_TOKEN` and `TELEGRAM_ALERT_CHAT_ID`.

The Supabase Edge Function is deployed as `balance-monitor` and can be scheduled with Supabase `pg_cron`/`pg_net` or an external cron. See `supabase/migrations/018_balance_monitor_schedule.sql` for the scheduler template.

Default thresholds:

- Ethereum: `0.02 ETH`
- Base: `0.002 ETH`
- Arbitrum: `0.002 ETH`
- Optimism: `0.002 ETH`
- Polygon: `5 POL`
- Avalanche: `0.05 AVAX`
- BNB Chain: `0.02 BNB`
- Solana: `3 SOL`

## Never do

- Never store bot tokens, private keys, service role keys or JWT secrets in git.
- Always rotate any Telegram token, private key, service role key or JWT secret that appeared in chat, logs, issues or screenshots.
- Never enable production lending with placeholder asset/aToken/debt token addresses.
- Never use an EOA as long-term contract owner.
- Never treat Supabase rows as authorization to move funds.
- Never deploy Solana mainnet-beta from a keypair or RPC API key that appeared in chat.
- Never mark an internal review as an external audit.

## Fiat payments

Use fiat payments when the customer wants token creation or assisted launch without paying the platform fee in crypto.

1. Configure Stripe Checkout:
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`
   - Webhook URL: `https://<app>/api/payments/webhooks/stripe`
   - Events: `checkout.session.completed`, `checkout.session.expired`
2. Configure Pagar.me Checkout for Brazil:
   - `PAGARME_SECRET_KEY`
   - `PAGARME_WEBHOOK_SECRET`
   - Webhook URL: `https://<app>/api/payments/webhooks/pagarme`
   - Events: `order.paid`, `charge.paid`, `order.payment_failed`, `charge.payment_failed`, `order.canceled`, `checkout.canceled`
3. Set `REQUIRE_FIAT_PAYMENTS=true` only after both providers are configured in production.
4. Sales/admin can send customers through the factory review step and choose Stripe for global card checkout or Pagar.me for Brazil card/PIX checkout.
5. Only perform assisted deploy after `payment_intents.status='paid'`.

Never collect raw card data in the Instead app. Use hosted checkout pages only.
