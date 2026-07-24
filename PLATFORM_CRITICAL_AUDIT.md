# Instead Critical Platform Audit

Data: 2026-07-24

## Nota geral

**5.8/10 para producao real.** O produto tem uma base boa para demonstracao, testes locais e venda assistida, mas ainda nao esta pronto para operar com usuarios desconhecidos, capital real e promessa multi-protocolo em escala.

## Notas por vertical

- **Token Factory: 7/10**
  - Ponto forte: contratos testados, presets comerciais, Fair Launch com DEX router e metadata Supabase.
  - Falta: deploy real por rede, verificacao em explorers, ownership final em multisig, limites comerciais claros e painel de liberacao operacional.

- **Pagamentos fiat: 6/10**
  - Ponto forte: Stripe/Pagar.me usam checkout hospedado e webhooks server-side.
  - Falta: credenciais reais, webhook testado em sandbox, reconciliacao financeira diaria, refund/dispute flow e liberacao automatizada controlada.

- **Lending/prime broker: 4/10**
  - Ponto forte: Aave adapter nao custodial e router para adapters.
  - Falta: adapters reais para protocolos alem da Aave, fork tests por rede, debt delegation UX, liquidacao/health monitoring, auditoria externa.

- **Supabase/auth/admin: 6/10**
  - Ponto forte: RLS nas tabelas publicas, service role isolado no servidor, SIWE JWT para admin.
  - Falta: aplicar migrations em staging/prod, refresh/revogacao de sessao, grants Data API revisados, advisors Supabase, logs de admin actions.

- **Telegram bot: 5/10**
  - Ponto forte: reduz friccao e registra intencoes.
  - Falta: token rotacionado, webhook configurado, linking seguro wallet-Telegram, fluxo transacional com status.

- **Observabilidade/operacao: 4/10**
  - Ponto forte: health check, smoke tests e eventos basicos.
  - Falta: Sentry/uptime/alertas, runbook de incidentes testado, dashboard financeiro e alertas on-chain.

## Falhas severas encontradas

1. **Segredos foram expostos no chat.**
   - Telegram bot token, Supabase access token e service role precisam ser rotacionados antes de qualquer producao.

2. **Readiness ainda falha por configuracao real ausente.**
   - Sem WalletConnect, factory address real, monitoramento e secrets de pagamento, a plataforma nao deve ser anunciada como pronta.

3. **Multi-protocolo lending ainda e arquitetura, nao produto acabado.**
   - O router existe, mas Compound/Morpho/Spark/Venus/etc. precisam adapters, testes fork e configuracao por mercado.

4. **Pagamentos fiat precisavam de endurecimento.**
   - Implementado nesta rodada: rate limit, validacao de checkout, status protegido por sessao wallet e conferencia amount/currency em webhook.

5. **RLS usava `auth.role()` em migrations antigas.**
   - Corrigido para policies com `TO service_role`; o check local agora falha se `auth.role()` voltar.

## Melhorias implementadas nesta rodada

- RLS sem `auth.role()` depreciado.
- Rate limit server-side nas rotas de checkout, status e webhooks.
- Validacao de wallet/email/produto/metadata antes de criar checkout.
- Confirmacao de pagamento exige provider, valor e moeda iguais ao registro interno.
- Status de pagamento exige sessao SIWE da mesma wallet.
- Pagina admin `/admin/payments` para operacao comercial.
- Smoke test cobre `/admin/payments` e endpoints de pagamento.

## Backlog critico recomendado

1. Rotacionar todos os segredos expostos e configurar ambiente de staging.
2. Rodar Stripe CLI e Pagar.me sandbox com webhooks reais.
3. Aplicar migrations Supabase em staging e rodar advisors.
4. Fazer deploy da factory em testnet com DEX router real e verificar explorer.
5. Criar job de reconciliacao financeira: payment paid -> deploy assistido -> token confirmado.
6. Implementar action log de admin para toda liberacao manual.
7. Criar adapters reais de lending um por vez, com fork test antes de expor no UI.
8. Configurar Sentry, uptime e alert webhook antes de trafego publico.
