# Instead Lending Operations

Este documento descreve o modelo operacional atual do lending da Instead depois da refatoracao para adapter Aave v3 nao custodial.

## Modelo atual

O contrato `InsteadLendingPool` nao deve manter uma posicao Aave agregada em `address(this)`.

Operacoes esperadas:

- `supply(asset, amount)`: transfere o ativo do usuario para o adapter e chama Aave `supply(..., onBehalfOf = usuario)`.
- `borrow(asset, amount)`: valida `borrowAllowance(usuario, adapter)` no variable debt token e chama Aave `borrow(..., onBehalfOf = usuario)`, mantendo a divida no usuario.
- `repay(asset, amount)`: recebe ativo do usuario e chama Aave `repay(..., onBehalfOf = usuario)`.
- `withdraw(asset, amount)`: exige aprovacao previa do aToken para o adapter e chama Aave `withdraw`, enviando o underlying ao usuario.

## Invariantes de seguranca

- Aave deve enxergar o usuario como dono da posicao, nunca o contrato da Instead.
- `getUserAccountData(user)` deve consultar Aave para o proprio usuario.
- Borrow deve falhar se o usuario nao tiver colateral/delegation suficientes na Aave.
- Withdraw deve exigir aprovacao do aToken do usuario.
- Supabase continua sendo indexador/UX, nao fonte final de autorizacao para fundos.

## Gates antes de producao por rede

1. Deploy verificado do adapter.
2. `configureAsset(asset, aToken, variableDebtToken, true)` executado para cada ativo suportado.
3. UI/guia para `approveDelegation` do variable debt token Aave.
4. Teste de supply/borrow/repay/withdraw em fork ou testnet da rede.
5. Monitoramento de eventos do adapter e health factor Aave.
6. Multisig como owner do adapter.
7. Runbook para `pause`.
8. Auditoria externa ou revisao independente antes de capital real.

## Reconciliacao off-chain

Cada operacao sensivel continua precisando de:

- `operation_id` idempotente;
- `tx_hash`;
- `chain_id`;
- status `pending -> confirmed -> mismatch/failed`;
- validacao de receipt e evento on-chain;
- comparacao com dados Aave quando aplicavel.

## Status

O risco estrutural de liquidacao cruzada por posicao agregada foi removido do desenho do contrato. A liberacao de producao ainda depende dos gates por rede acima.
