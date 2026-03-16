# 🌌 Instead DeFi: Infraestrutura de Empréstimos e Tokenização

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-14.2-black.svg)](https://nextjs.org/)
[![Web3](https://img.shields.io/badge/Web3-EVM-blueviolet.svg)](https://ethereum.org/)

**Instead Finance** é um ecossistema DeFi completo projetado para democratizar o acesso a empréstimos colateralizados e à criação de ativos digitais. Operando de forma multichain, a plataforma permite que usuários retirem liquidez de seus ativos bluechip e lancem novos tokens sem a necessidade de escrever uma única linha de código.

---

## 🚀 Funcionalidades Principais

*   **🏦 Mercado de Empréstimos (Lending):**
    *   Deposite colateral em redes como Arbitrum, Polygon e Ethereum.
    *   Taxas de juros dinâmicas baseadas na utilização do pool.
    *   Monitoramento de saúde da posição em tempo real.
*   **🏭 Fábrica de Tokens (Token Factory):**
    *   Criação de tokens ERC-20 com funcionalidades avançadas (Mintable, Burnable, Taxable).
    *   Deploy simultâneo em múltiplas redes.
    *   Segurança garantida por contratos auditados.
*   **📈 Dashboard Analytics:**
    *   Visão clara de suas posições e ativos tokenizados.
    *   Integração direta com MetaMask e WalletConnect.
*   **⚡ Landing Page de Alta Performance:**
    *   Experiência imersiva com 3D (Three.js), animações fluidas (Framer Motion) e interações dinâmicas (GSAP).

---

## 🛠️ Stack Tecnológica

### Frontend
- **Framework:** [Next.js](https://nextjs.org/) (App Router)
- **3D & Animações:** [Three.js](https://threejs.org/), [@react-three/fiber](https://github.com/pmndrs/react-three-fiber), [Framer Motion](https://www.framer.com/motion/), [GSAP](https://greensock.com/gsap/)
- **Estilização:** Vanilla CSS com Variáveis Modernas
- **Web3:** [Wagmi](https://wagmi.sh/), [Viem](https://viem.sh/), [RainbowKit](https://www.rainbowkit.com/)

### Backend & Smart Contracts
- **Banco de Dados:** [Supabase](https://supabase.com/)
- **Linguagem:** Solidity
- **Ambiente:** Hardhat

---

## 📦 Como Instalar e Rodar

1.  **Clone o repositório:**
    ```bash
    git clone https://github.com/seu-usuario/instead.git
    cd instead
    ```

2.  **Instale as dependências do Frontend:**
    ```bash
    cd frontend
    npm install --legacy-peer-deps
    ```

3.  **Configure as variáveis de ambiente:**
    - Copie o `.env.example` para `.env.local` dentro da pasta `frontend`.
    - Insira suas chaves do Supabase e do WalletConnect.

4.  **Inicie o servidor de desenvolvimento:**
    ```bash
    npm run dev
    ```

---

## 📖 Documentação Detalhada

Para uma visão técnica profunda e guias passo a passo, consulte nosso [Guia Completo (GitBook Style)](DOCS.md).

## 📄 Licença

Este projeto está sob a licença MIT. Consulte o arquivo [LICENSE](LICENSE) para mais detalhes.
