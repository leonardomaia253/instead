# Documentacao do Protocolo Instead

Este documento descreve o estado real do projeto em codigo. Ele evita promessas de producao que ainda dependem de deploy, auditoria, configuracao de secrets e revisao de contratos.

## 1. Visao geral

A Instead Finance combina uma **Token Factory no-code** com modulos de apoio para dashboard, staking, admin e lending experimental.

O caminho mais proximo de producao e a Token Factory. O lending atual e uma integracao **Aave v3 nao custodial**: a posicao de risco fica no usuario, nao no contrato da Instead. Ainda assim, ele so deve ser habilitado por rede depois de deploy, configuracao, testes de integracao, monitoramento e auditoria externa.

Na vertical de criacao de tokens, a oferta agora deve ser posicionada contra builders como CreateMyToken com presets claros: Ultimate Token, Fair Launch Token, Deflationary Token e Superchain-ready ERC20. O diferencial da Instead deve ser combinar deploy no-code, painel/admin, reconciliacao Supabase, Telegram bot e servico assistido.

## 2. Arquitetura

### Token Factory

- Cria tokens ERC-20 a partir de parametros definidos pelo usuario.
- Suporta opcoes como mintable, burnable, taxable e blacklist.
- Registra metadados off-chain no Supabase.
- Usa `tx_hash` e `chain_id` para idempotencia e reconciliacao.
- A interface possui configuracao para Arbitrum, Polygon, BNB Chain, Base, Optimism, Ethereum e Avalanche.

### Lending Aave v3 nao custodial

O contrato `InsteadLendingPool` atua como uma fachada para Aave v3:

- `supply`
- `withdraw`
- `borrow`
- `repay`
- `getUserAccountData`

No estado atual, o adapter chama Aave usando `onBehalfOf = msg.sender`, removendo a posicao agregada que existia na arquitetura anterior.

Por seguranca operacional, o frontend bloqueia operacoes de lending por padrao. A flag `NEXT_PUBLIC_ENABLE_PRODUCTION_LENDING=true` deve ser usada apenas quando a rede tiver assets, aTokens, variable debt tokens, debt delegation, monitoramento e deploy auditado.

### Staking

O modulo de staking existe no codigo e depende de contratos, enderecos e fluxo de auditoria corretamente configurados por rede.

### Supabase

Supabase e usado para:

- usuarios e admins;
- tokens gerados;
- auditorias;
- posicoes de lending;
- nonces SIWE;
- eventos de observabilidade;
- fila de reconciliacao operacional.
- camada de comunidade, missoes, XP, governanca, CRM e fila de mensagens.

Supabase nao deve ser fonte final de autorizacao para fundos. Operacoes sensiveis precisam ser validadas contra eventos e receipts on-chain.

### Comunidade como produto

A camada de comunidade implementada no app cobre:

- canais oficiais: Discord, Telegram, X/Twitter, Farcaster, Reddit, YouTube, TikTok e newsletter;
- perfis por wallet com handles sociais, referral code, XP, nivel e cargo;
- missoes com aprovacao automatica ou revisao manual;
- recompensas por XP, incluindo badges, acesso, desconto, early access e elegibilidade para airdrop;
- enquetes de governanca com voto por wallet;
- cockpit admin para revisar missoes, ver rankings, canais, recompensas, votos e automacoes;
- fila `community_message_queue` para workers de Discord/Telegram/newsletter processarem mensagens segmentadas.

Endpoints principais:

- `/api/community/me`: overview publico e criacao/atualizacao de perfil.
- `/api/community/event`: registro de missao/evento de comunidade.
- `/api/community/vote`: voto em governanca.
- `/api/community/queue`: worker seguro para claim/mark da fila de mensagens.
- `/api/discord/webhook`: verificacao/automacao de Discord.
- `/api/admin/community`: cockpit admin, revisao de missoes e enfileiramento de automacoes.

## 3. Protocolos externos

Integracao funcional atual:

- **Aave v3:** usada pelo contrato de lending nao custodial.

Nao ha integracao funcional implementada neste repositorio para:

- Compound;
- Uniswap;
- Curve;
- Yearn;
- outros roteadores/agregadores de rendimento.

Qualquer mencao futura a multi-protocolo deve depender de adapters reais, testes por protocolo, configuracao de risco e auditoria externa.

## 4. Redes suportadas

O frontend lista suporte para:

- Arbitrum;
- Polygon;
- BNB Chain;
- Base;
- Optimism;
- Ethereum Mainnet;
- Avalanche.

Isso nao significa que todos os contratos estejam necessariamente deployados e prontos em todas as redes. Para declarar producao em uma rede, confirme:

- endereco de factory configurado;
- contratos verificados no explorer;
- variaveis `NEXT_PUBLIC_FACTORY_*` preenchidas;
- RPC confiavel;
- assets suportados configurados;
- testes de transacao reais;
- monitoramento e alertas;
- multisig/pause/upgrade definidos.

## 5. Checklist de producao

- Build e typecheck limpos em CI.
- `pnpm audit --prod` limpo.
- Supabase migrations aplicadas em staging e producao.
- SIWE validado com wallet real.
- `SUPABASE_JWT_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `SIWE_DOMAIN` e `APP_ORIGIN` configurados.
- Admin protegido por JWT server-side.
- CORS, rate limit e payload limits nas Edge Functions.
- Observabilidade com alertas externos.
- Contratos com testes unitarios, fuzz/invariant e auditoria externa.
- Deploy via multisig, com pause e upgrade controlados.

## 6. Pendencias antes de 100% producao

O bloqueador estrutural de posicao agregada foi removido do contrato de lending. Antes de declarar 100% producao, ainda falta:

- deploy verificado dos contratos em cada rede suportada;
- configuracao de `configureAsset(asset, aToken, variableDebtToken, true)` por rede;
- orientacao e UI para `approveDelegation` do debt token Aave antes de borrow;
- testes de integracao em fork ou testnet por rede;
- auditoria externa de contratos;
- monitoramento de eventos, RPC, Supabase, Edge Functions e posicoes Aave;
- runbook de incidentes com pause/multisig.

Enquanto esses itens nao estiverem completos, o lending deve permanecer bloqueado por flag em producao.
