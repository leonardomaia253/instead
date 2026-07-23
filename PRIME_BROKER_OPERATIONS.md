# Instead Prime Broker Operations

Este documento descreve os riscos de inconsistência operacional da Instead atuando como uma camada prime broker autônoma entre usuários e protocolos externos como Aave.

## Modelo operacional

A Instead não deve depender de acertos manuais para manter posições coerentes. Cada operação precisa ter:

- uma transação on-chain como fonte primária;
- um `operation_id` idempotente;
- um `tx_hash` único por operação relevante;
- um estado esperado para reconciliação;
- eventos on-chain suficientes para reconstruir o ledger;
- tabelas Supabase que aceitam retry sem duplicar efeito.

## Riscos e mitigações implementadas

| Vertical | Risco | Mitigação |
| --- | --- | --- |
| Lending | UI registra posição que não corresponde ao contrato | `lending_positions` agora guarda `last_tx_hash`, `operation_status` e entra na fila `operation_reconciliation_queue`. |
| Lending | Dívida local diverge da dívida agregada na Aave | `InsteadLendingPool` agora mantém `totalCollateralByAsset`, `totalBorrowedByAsset`, `totalFeesByAsset` e emite `OperationAccounted`. |
| Lending | Usuário repaga mais do que sua dívida local e reduz dívida agregada de outros | `repay` limita o pagamento ao `borrowBalance` rastreado do usuário. |
| Lending | Withdraw/repay em ativo não suportado | `withdrawCollateral` e `repay` agora validam `supportedAssets`. |
| Token Factory | Frontend chama assinatura antiga do contrato | ABI e deploy foram alinhados ao `createToken` v2: mintable, taxable, taxBPS e blacklist. |
| Token Factory | Supply enviado em wei enquanto contrato espera unidades inteiras | Frontend passa supply inteiro, e o contrato continua aplicando `* 10 ** 18` internamente. |
| Token Factory | Token salvo como `pending` sem tentar capturar evento | Deploy agora extrai `tokenAddress` do evento `TokenCreated`. |
| Supabase | Retry duplica token ou auditoria | `generated_tokens` tem unicidade por `tx_hash + chain_id`; `audits` tem `operation_id` único. |
| Staking | Auditoria usa `txHash` stale do hook | Staking agora usa o hash retornado diretamente por `stake(amount)`. |
| Todas | Operação confirmada no frontend mas sem reconciliação posterior | Nova tabela `operation_reconciliation_queue` registra estado esperado para confirmação assíncrona. |

## Riscos estruturais ainda existentes

### 1. Aave enxerga o contrato Instead como uma única posição

Hoje, `InsteadLendingPool` deposita e toma dívida na Aave usando `address(this)`. Isso significa que a liquidação e o health factor on-chain da Aave são agregados no contrato da Instead.

Mitigação parcial atual:

- ledger interno por usuário;
- contadores agregados por ativo;
- eventos de accounting;
- fila de reconciliação.

Mitigação completa recomendada:

- migrar para posições isoladas por usuário usando credit delegation, vaults por usuário ou contas proxy;
- ou implementar um motor interno de margem com oráculos, liquidação própria e reservas de insolvência.

### 2. Health factor individual ainda é estimado

O frontend calcula health factor com saldos locais, não com um cálculo de risco robusto multiativo/multioráculo.

Mitigação recomendada:

- adicionar oráculos por ativo;
- armazenar configuração de risco por ativo: LTV, liquidation threshold, liquidation penalty;
- bloquear borrow/withdraw se a simulação pós-operação violar margem mínima;
- criar keeper que marque `mismatch` na fila quando o estado on-chain divergir.

### 3. Supabase não deve ser fonte final para fundos

Supabase serve como indexador operacional e UX. Ele não deve autorizar saque, borrow ou repay sozinho.

Mitigação atual:

- RLS por wallet;
- idempotência;
- reconciliação por `tx_hash`.

Mitigação recomendada:

- Edge Function com service role para confirmar receipts e eventos;
- status `pending -> confirmed -> mismatch/failed`;
- alertas automáticos para `mismatch`.

## Loop autônomo recomendado

1. Usuário executa transação.
2. Frontend grava auditoria e fila com `operation_id`.
3. Keeper/Edge Function busca receipt.
4. Keeper valida evento esperado.
5. Keeper compara evento com estado Supabase.
6. Se bater, marca `confirmed`.
7. Se divergir, marca `mismatch` e gera alerta.
8. Operações futuras usam apenas estado confirmado ou recalculado por evento.

## Invariantes operacionais

- `sum(userPositions.collateralBalance)` por ativo deve ser igual a `totalCollateralByAsset`.
- `sum(userPositions.borrowBalance)` por ativo deve ser igual a `totalBorrowedByAsset`.
- `generated_tokens(tx_hash, chain_id)` deve ser único.
- `audits.operation_id` deve ser único.
- Toda operação sensível deve ter `tx_hash`, `chain_id`, `status` e `expected_state`.
- Nenhum dado Supabase deve permitir acesso a carteira diferente via RLS.
