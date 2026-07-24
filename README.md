# Instead DeFi: tokenizacao e lending experimental

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16-black.svg)](https://nextjs.org/)
[![Web3](https://img.shields.io/badge/Web3-EVM-blueviolet.svg)](https://ethereum.org/)

**Instead Finance** e um ecossistema DeFi para criacao de ativos digitais e lending via Aave v3. A Token Factory foi desenhada para operacao multichain; o modulo de lending agora usa um adapter nao custodial em que a posicao fica no usuario, mas continua desabilitado por padrao ate deploy, auditoria e configuracao por rede.

## Status de producao

- **Token Factory:** caminho principal de produto. A interface suporta Arbitrum, Polygon, BNB Chain, Base, Optimism, Ethereum e Avalanche, desde que os enderecos de factory estejam configurados e validados por rede.
- **Lending:** adapter Aave v3 nao custodial. Nao deve receber capital real antes de configuracao de assets/aTokens/debt delegation por rede, testes de integracao e auditoria externa.
- **Staking e dashboards:** dependem de configuracao correta de contratos, Supabase, RLS, SIWE e observabilidade no ambiente de producao.

## Funcionalidades principais

- **Token Factory no-code**
  - Criacao de tokens ERC-20 com opcoes como mintable, burnable, taxable e blacklist.
  - Presets competitivos: Ultimate Token, Fair Launch Token, Deflationary Token com burn tax/anti-whale e Superchain-ready ERC20.
  - Fair Launch on-chain: `createFairLaunchTokenETH` envia 100% do supply para liquidez DEX no deploy, junto com ETH inicial.
  - Registro off-chain em Supabase com reconciliacao por `tx_hash` e `chain_id`.
  - Fluxo comercial adequado para deploy assistido e pacotes premium.

- **Lending Aave v3 nao custodial**
  - Integra `supply`, `withdraw`, `borrow` e `repay` da Aave v3 no contrato `InsteadLendingPool`.
  - Usa `onBehalfOf = usuario`, evitando posicao Aave agregada no contrato da Instead.
  - Bloqueado por padrao no frontend via `NEXT_PUBLIC_ENABLE_PRODUCTION_LENDING`.
  - Nao e multi-protocolo em producao hoje; Compound/Uniswap/Curve/Yearn nao possuem integracao funcional neste codigo.
  - Matriz multi-protocolo planejada em `LENDING_PROTOCOL_MATRIX.md`, com adapters separados para Compound, Morpho, Spark, Venus, BENQI, Euler, Silo, Exactly, Gearbox, Maker/Sky, Kamino e Marginfi.
  - Router EVM `InsteadLendingRouter` para allowlist, kill switch e roteamento seguro de adapters aprovados.

- **Dashboard e operacao**
  - Painel de tokens, posicoes, auditorias e observabilidade.
  - Admin com SIWE/JWT e um Revenue Command Center para operacao comercial.

- **Telegram bot**
  - Comandos `/token` e `/lending` para reduzir atrito de conversao.
  - Registra intencoes no Supabase e leva o usuario para finalizar no app com carteira.

- **Pagamentos fiat**
  - Stripe Checkout para cartao global.
  - Pagar.me Checkout para Brasil com cartao e PIX.
  - Webhooks server-side registram `payment_intents` no Supabase antes de deploy assistido.
  - Nao pede seed phrase, private key nem executa transacao custodial.

## Stack tecnologica

### Frontend

- Next.js App Router
- Wagmi, Viem e RainbowKit
- Three.js, Framer Motion e GSAP
- CSS com variaveis de tema

### Backend e contratos

- Supabase PostgreSQL, RLS e Edge Functions
- Solidity
- Contratos ERC-20, Token Factory, Staking e Lending experimental

## Como rodar

1. Instale dependencias:

```bash
cd frontend
npm install --legacy-peer-deps
```

2. Configure variaveis em `frontend/.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=
NEXT_PUBLIC_FACTORY_ARBITRUM=
NEXT_PUBLIC_FACTORY_POLYGON=
NEXT_PUBLIC_FACTORY_BSC=
NEXT_PUBLIC_FACTORY_BASE=
NEXT_PUBLIC_FACTORY_OPTIMISM=
NEXT_PUBLIC_FACTORY_MAINNET=
NEXT_PUBLIC_FACTORY_AVALANCHE=
TELEGRAM_BOT_TOKEN=
TELEGRAM_WEBHOOK_SECRET=
NEXT_PUBLIC_ENABLE_PRODUCTION_LENDING=false
NEXT_PUBLIC_LENDING_POOL_ADDRESS=
AAVE_SUPPORTED_ASSETS_JSON=
AAVE_ATOKENS_JSON=
AAVE_VARIABLE_DEBT_TOKENS_JSON=
PRODUCTION_MULTISIG_ADDRESS=
INCIDENT_PAUSE_RUNBOOK_URL=
```

3. Inicie o app:

```bash
npm run dev
```

## Lending em producao

Por seguranca, o lending fica bloqueado no frontend ate cada rede estar configurada e auditada:

```bash
NEXT_PUBLIC_ENABLE_PRODUCTION_LENDING=true
```

Nao habilite essa flag em producao antes de configurar assets, aTokens, debt delegation, monitoramento, multisig e plano de resposta a incidentes.

Rode o verificador antes de go-live:

```bash
pnpm secrets:check
pnpm readiness
```

Deploy operacional:

```bash
pnpm deploy:factory --network base
pnpm deploy:lending --network base
pnpm lending:configure-assets --network base
pnpm deploy:staking --network base
pnpm ownership:transfer --network base
```

Testes de contrato sem chain real principal:

```bash
pnpm contracts:test

# Fork local: usa estado real da rede via RPC, mas executa tudo em Hardhat local.
HARDHAT_FORK_RPC_URL=$BASE_RPC_URL \
AAVE_POOL_ADDRESSES_PROVIDER=0x... \
pnpm contracts:test:fork

# Testnet publica, com gas de teste.
pnpm deploy:factory --network baseSepolia
pnpm deploy:lending --network baseSepolia
```

Use mocks locais para regra de negocio, fork para compatibilidade com Aave/endereco real, e testnet para ensaio publico antes de mainnet.

Para Fair Launch em producao, configure `DEX_ROUTER_ADDRESS` com um router compatível com Uniswap V2 na rede alvo. Sem router real validado, a factory nao deve ser publicada como Fair Launch completo.

Cada deploy grava `deployments/<network>.json`. Verifique o manifesto e, opcionalmente, bytecode on-chain:

```bash
DEPLOYMENT_NETWORK=base DEPLOYMENT_RPC_URL=$BASE_RPC_URL pnpm deployments:verify
DEPLOYMENT_NETWORK=base DEPLOYMENT_RPC_URL=$BASE_RPC_URL PRODUCTION_MULTISIG_ADDRESS=0x... pnpm ownership:verify
APP_ORIGIN=https://instead.volupai.com SUPABASE_URL=https://... pnpm smoke:test
pnpm db:migrations:check
```

Health endpoint:

```bash
curl https://instead.volupai.com/api/health
```

Use `RUNBOOK.md` para a sequencia completa de go-live e resposta a incidentes.

## Documentacao

Veja [DOCS.md](DOCS.md), [PRODUCTION_AUDIT.md](PRODUCTION_AUDIT.md) e [PRIME_BROKER_OPERATIONS.md](PRIME_BROKER_OPERATIONS.md).

## Telegram webhook

Configure o webhook apontando para a Edge Function `telegram-bot` e envie um segredo forte no header `X-Telegram-Bot-Api-Secret-Token`.

Nunca commite `TELEGRAM_BOT_TOKEN`. Se um token aparecer em chat, issue, log ou print, rotacione no BotFather antes de producao.

```bash
TELEGRAM_BOT_TOKEN=... \
TELEGRAM_WEBHOOK_SECRET=... \
TELEGRAM_WEBHOOK_URL=https://<project-ref>.functions.supabase.co/telegram-bot \
pnpm telegram:set-webhook
```

## Licenca

MIT.
