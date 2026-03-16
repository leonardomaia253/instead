# 📔 Documentação Extensa do Protocolo Instead

Bem-vindo ao centro de conhecimento da Instead Finance. Este documento serve como o manual definitivo para usuários, desenvolvedores e parceiros.

---

## 📋 Sumário
1. [Introdução](#1-introdução)
2. [Arquitetura do Protocolo](#2-arquitetura-do-protocolo)
3. [Guia de Lending & Borrowing](#3-guia-de-lending--borrowing)
4. [Guia de Token Factory](#4-guia-de-token-factory)
5. [Segurança e Auditoria](#5-segurança-e-auditoria)
6. [Governança e Tokenomics](#6-governança-e-tokenomics)
7. [API e Integração](#7-api-e-integração)
8. [Riscos e Divulgação de Segurança](#8-riscos-e-divulgação-de-segurança)
9. [Guia de Deployment](#9-guia-de-deployment)

---

## 1. Introdução
A **Instead Finance** nasceu da necessidade de unificar dois dos pilares mais importantes do DeFi: liquidez e emissão de ativos. Em um mercado fragmentado, oferecemos uma camada de abstração que permite que qualquer pessoa interaja com múltiplos protocolos de liquidez e lance tokens em mais de 7 redes EVM de forma transparente e eficiente.

---

## 2. Arquitetura do Protocolo
O protocolo Instead é composto por três camadas principais:

### A. Camada de Agregação (Aggregation Layer)
Nossos contratos inteligentes atuam como agregadores de liquidez, roteando depósitos para os pools mais eficientes e seguros do ecossistema (como Aave e Compound), garantindo sempre a melhor taxa para o utilizador final.

### B. Camada de Emissão (Issuance Layer - Token Factory)
Utilizamos templates de contratos pré-auditados e modulares. Ao criar um token, o usuário seleciona módulos (mint, burn, tax, etc.) que são compilados e deployed on-chain de forma atômica.

### C. Camada de Dados (Data Layer)
Integramos o Supabase para armazenamento de metadados off-chain e indexação de eventos, permitindo uma interface rápida e reativa sem depender exclusivamente de RPCs lentos.

---

## 3. Guia de Lending & Borrowing
O lending na Instead funciona através de um modelo de **Over-collateralized Loans** (Empréstimos Sobre-colateralizados).

### Como funciona:
1.  **Depósito:** O usuário deposita um ativo aceito (ex: ETH, USDC) como colateral.
2.  **LTV (Loan-to-Value):** Cada ativo possui um limite de empréstimo. Por exemplo, com um LTV de 70%, depositar $1000 em ETH permite retirar até $700 em liquidez.
3.  **Saúde da Posição (Health Factor):** Mantemos um monitoramento constante. Se o valor do seu colateral cair e o fator de saúde chegar perto de 1.0, sua posição corre risco de liquidação para proteger o protocolo.

---

## 4. Guia de Token Factory
A Token Factory é a nossa ferramenta "No-Code" para lançamento de projetos.

### Funcionalidades dos Tokens:
- **Standard:** Token ERC-20 básico, ideal para governança ou pagamentos.
- **Mintable:** Permite a criação de novos tokens após o deploy por endereços autorizados.
- **Burnable:** Permite que detentores destruam seus próprios tokens.
- **Taxable:** Implementa taxas de transação automáticas enviadas para uma carteira de tesouraria ou marketing.

---

## 5. Segurança e Auditoria
A segurança é a nossa prioridade número um.
- **Contratos Auditados:** Todos os nossos "templates" de tokens e contratos de lending passam por auditorias rigorosas.
- **Timelocks:** Mudanças críticas no protocolo exigem um período de espera (timelock) para garantir que a comunidade possa reagir.
- **Multi-sig Wallet:** O acesso a fundos de tesouraria é protegido por carteiras multi-assinatura (Gnosis Safe).

---

## 6. Governança e Tokenomics
O futuro da Instead é decidido pela comunidade. Detentores do token nativo (INST) podem:
- Votar em novas redes para suporte.
- Propor mudanças em taxas e parâmetros de risco.
- Receber parte das taxas geradas pelo protocolo através do staking.

---

## 7. API e Integração
Desenvolvedores podem integrar a funcionalidade da Instead em suas próprias dApps.

### SDK Exemplo (Pseudocódigo):
```javascript
import { InsteadSDK } from '@instead/sdk';

const sdk = new InsteadSDK(window.ethereum);
await sdk.lending.deposit('WETH', '1.5');
const health = await sdk.lending.getHealthFactor(userAddress);
```

---

## 8. Riscos e Divulgação de Segurança
A transparência é fundamental no DeFi. Abaixo estão os riscos inerentes à arquitetura atual da Instead Finance:

### A. Risco de Agregação (Lending Pool)
O `InsteadLendingPool` atua como uma fachada para a Aave v3. Atualmente, todas as posições são agrupadas sob o endereço do contrato da Instead. Isso significa que:
- O **Health Factor** é global para o contrato. Embora o frontend mostre dados individuais, a liquidação on-chain ocorre no nível do contrato.
- Uma falha na gestão de colateral por um grande usuário pode afetar a liquidez disponível para outros se o contrato for liquidado na Aave.

### B. Dependência de Oráculos
A precificação e as taxas de criação de tokens dependem do Chainlink. Em caso de latência extrema ou falha do feed, as funções de criação podem ser pausadas automaticamente pelo contrato.

---

## 9. Guia de Deployment

### Contratos Inteligentes
1. Configure as chaves de API e Mnemonic no `hardhat.config.ts`.
2. Execute o deploy: `npx hardhat run scripts/deploy.ts --network <network>`.
3. Verifique os contratos no block explorer: `npx hardhat verify --network <network> <address> <args>`.

### Frontend
1. Clone o repositório.
2. Copie `.env.example` para `.env.local` e preencha as variáveis.
3. Instale dependências: `npm install --legacy-peer-deps`.
4. Build: `npm run build`.

---

*Documentação gerada automaticamente para a plataforma Instead DeFi - 2026.*
