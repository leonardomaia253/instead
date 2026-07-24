# Instead Production Runbook

## Go-live sequence

1. Rotate any secret that appeared in chat, logs, issues or screenshots.
2. Fill hosting/Supabase secrets from `.env.production.example`.
3. Apply Supabase migrations in staging, then production.
4. Deploy Edge Functions: `siwe-auth`, `token-ai`, `lending-ai`, `telegram-bot`.
5. Configure Telegram webhook with `pnpm telegram:set-webhook`; set `REQUIRE_TELEGRAM_BOT=true` only after the webhook URL, secret, bot token and service role are configured.
6. Deploy Token Factory per target network.
   Configure `DEX_ROUTER_ADDRESS` para Fair Launch on-chain e valide em fork/testnet antes de publicar a oferta.
7. Deploy Lending adapter only on networks where Aave asset config is ready.
8. Deploy `InsteadLendingRouter` with `pnpm deploy:lending-router --network <network>` before enabling multi-protocol lending.
9. Run `pnpm lending:configure-assets --network <network>` after lending deploy.
   Seed protocol routing metadata with `SUPABASE_URL=https://... SUPABASE_SERVICE_ROLE_KEY=... pnpm db:lending-protocols:seed`.
10. Before mainnet, run local mocks with `pnpm contracts:test`, a local fork with `HARDHAT_FORK_RPC_URL=<rpc> AAVE_POOL_ADDRESSES_PROVIDER=0x... pnpm contracts:test:fork`, and a public testnet deploy. Keep `REQUIRE_LENDING_FORK_TEST=true` for lending go-live.
11. Verify `deployments/<network>.json` with `pnpm deployments:verify`.
12. Transfer contract ownership to `PRODUCTION_MULTISIG_ADDRESS` with `pnpm ownership:transfer --network <network>`.
13. Verify ownership on-chain with `pnpm ownership:verify`.
14. Run `pnpm secrets:check`, `pnpm readiness`, `pnpm db:migrations:check`, `pnpm db:contract:check`, `pnpm audit:prod`, `pnpm contracts:test`, frontend build, and `pnpm smoke:local`.
15. Deploy frontend and Edge Functions.
16. Run `pnpm smoke:test` against the production URL.
17. Enable `NEXT_PUBLIC_ENABLE_PRODUCTION_LENDING=true` only after lending tests pass on that network.

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
- Contract `Paused`, `AssetConfigured`, `Borrowed`, `Repaid`, `CollateralSupplied`, `CollateralWithdrawn` events.
- Contract `owner()` remains the production multisig.
- Aave user health factor for active lending users.
- Reconciliation queue items stuck in `pending` or `mismatch`.
- Smoke test for `/pt`, `/pt/factory`, `/pt/lending`, `/robots.txt`, `/sitemap.xml`, and Edge Function auth behavior.
- `/api/health` returns `status: ok` and must stay uncached.

## Never do

- Never store bot tokens, private keys, service role keys or JWT secrets in git.
- Always rotate any Telegram token, private key, service role key or JWT secret that appeared in chat, logs, issues or screenshots.
- Never enable production lending with placeholder asset/aToken/debt token addresses.
- Never use an EOA as long-term contract owner.
- Never treat Supabase rows as authorization to move funds.

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
