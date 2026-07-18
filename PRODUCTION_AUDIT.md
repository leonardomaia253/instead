# Auditoria de Producao - Instead

Data: 2026-07-17

## Veredito

Status atual: **frontend e backend de apoio muito mais proximos de producao, mas ainda nao aprovado para producao 100%**.

A aplicacao tem uma base boa de frontend, Supabase e contratos, mas ainda possui bloqueadores de seguranca, operacao e contrato inteligente. O ponto mais critico e o contrato `InsteadLendingPool`: ele deposita/empresta na Aave em nome do contrato agregador (`address(this)`) e tenta separar usuarios apenas em mappings locais. Isso nao isola posicoes por usuario e pode criar risco de perda, saque indevido, contabilidade incorreta e liquidacao cruzada.

## Correcoes aplicadas nesta auditoria

- Workspace pnpm corrigido para incluir o app `frontend`.
- Criado `package.json` raiz com scripts de build, typecheck e audit.
- Build de producao Next.js validado com sucesso em Next 16.2.10.
- Typecheck TypeScript validado com sucesso.
- `pnpm audit --prod` validado sem vulnerabilidades conhecidas.
- Adicionados headers HTTP de seguranca no Next.js:
  - `X-Content-Type-Options`
  - `X-Frame-Options`
  - `Referrer-Policy`
  - `Permissions-Policy`
  - `Strict-Transport-Security`
- Adicionada validacao obrigatoria de variaveis Supabase publicas antes de criar o client.
- Atualizado `next` de `^16.1.6` para `^16.2.10` e removido `@types/next` obsoleto.
- Adicionadas dependencias opcionais `@x402/*` exigidas pelo stack WalletConnect/Coinbase durante o build.
- Adicionados overrides pnpm para `ws`, `postcss` e `uuid`.
- Corrigido erro de SSR `indexedDB is not defined` evitando inicializacao de conectores wallet browser-only no servidor.
- Migrado `middleware.ts` para `proxy.ts`, convencao atual do Next.js.
- Adicionado `metadataBase` para Open Graph/Twitter.
- Corrigidas rotas admin/login para respeitar locale (`/pt` e `/en`).
- Substituido nonce SIWE gerado no client por fluxo backend com nonce persistido.
- Criada Edge Function `siwe-auth` com nonce, verificacao de assinatura e JWT com claim `wallet_address`.
- Endurecidas as Edge Functions de IA para falhar quando `GEMINI_API_KEY` nao estiver configurada e exigir header `Authorization: Bearer ...`.
- Criada migration `004_production_rls_hardening.sql` para remover leitura publica de auditorias e posicoes de lending.
- Criada migration `005_siwe_auth_nonces.sql` para nonces SIWE.
- Criada migration `006_observability_events.sql` para eventos de observabilidade.
- Adicionada captura client-side de Web Vitals e erros nao tratados.
- Corrigido typo que quebrava TypeScript na tela de staking.
- Admin passou a exigir sessao SIWE/JWT tambem no `proxy.ts`, com validacao HMAC e expiracao antes de liberar `/[locale]/admin`.
- Login admin passou a assinar SIWE e reutilizar o token emitido pela Edge Function, em vez de confiar apenas na wallet conectada no client.
- Edge Functions `token-ai` e `lending-ai` receberam CORS restrito por `APP_ORIGIN`, metodo POST obrigatorio, bearer token obrigatorio, limite de payload, sanitizacao de entrada e rate limit em memoria por IP/token.
- Criado workflow GitHub Actions `Production Checks` com install congelado, typecheck, build e `pnpm audit --prod`.

## Bloqueadores antes de producao

1. **Smart contract de lending nao esta apto para mainnet**
   - Refatorar para arquitetura com isolamento real por usuario, ou usar posicoes diretas do usuario no Aave.
   - Incluir testes unitarios/fuzz/invariant e auditoria externa.

2. **SIWE precisa ser validado em staging/producao real**
   - O backend SIWE foi implementado, mas ainda precisa ser implantado com `SUPABASE_JWT_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `SIWE_DOMAIN` e `APP_ORIGIN`.
   - Testar login wallet real contra Supabase remoto e confirmar que RLS recebe `wallet_address`.

3. **Admin server-side depende de segredo em runtime**
   - O `proxy.ts` valida JWT admin antes de liberar `/pt/admin` e `/en/admin`.
   - Configurar `SUPABASE_JWT_SECRET` tambem no hosting Next.js; sem esse segredo, o proxy nega o admin por seguranca.

4. **Dependencias precisam de monitoramento continuo**
   - `pnpm audit --prod` esta limpo em 2026-07-17.
   - Manter Dependabot/Renovate ou auditoria automatica no CI.

5. **CI criado, falta configurar secrets reais**
   - Workflow `.github/workflows/production.yml` criado.
   - Configurar secrets `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` e `SUPABASE_JWT_SECRET`.

6. **Funcoes de IA precisam cotas persistentes para escala**
   - Rate limit em memoria foi adicionado para reduzir abuso no curto prazo.
   - Para producao com multiplas instancias, migrar limite para Redis/Supabase ou gateway gerenciado.

7. **Observabilidade ainda precisa alertas externos**
   - Web Vitals e erros client-side ja sao coletados em `observability_events`.
   - Falta Sentry/OpenTelemetry, uptime checks e alertas para Edge Functions, Supabase, RPC e transacoes on-chain.

## AWS barata recomendada

Para manter custo baixo sem overengineering:

- **Frontend Next.js**: AWS Amplify Hosting ou CloudFront + S3 se o app puder ser exportado estatico. Para App Router com SSR, Amplify Hosting e o caminho mais simples.
- **Banco/Auth/Edge Functions**: manter Supabase gerenciado no inicio. Migrar para AWS RDS/Lambda so quando houver demanda operacional real.
- **Secrets**: AWS Secrets Manager ou variaveis protegidas no provedor de hosting.
- **DNS/TLS/CDN**: Route 53 + CloudFront.
- **Logs e alertas**: CloudWatch + Sentry.
- **Custos iniciais esperados**: baixo trafego deve ficar principalmente em Supabase, dominio, build/hosting e chamadas Gemini/RPC. Evitar ECS/EKS no inicio.

## Checklist de go-live

- Build limpo em CI com `pnpm install --frozen-lockfile`, `pnpm typecheck` e `pnpm build`.
- `pnpm audit --prod` sem vulnerabilidades conhecidas.
- Contratos com testes e auditoria externa.
- Deploy dos contratos em multisig, com pause/upgrade controlados.
- Supabase migrations aplicadas em ambiente staging e producao.
- SIWE backend completo e admin server-side.
- CORS restrito, rate limit e payload limits nas Edge Functions.
- Variaveis reais configuradas e placeholders recusados.
- Monitoramento e alertas ativos.
