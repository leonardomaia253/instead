"use client";

import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export default function DocsPage() {
  return (
    <div className="site-shell">
      <Navbar />
      <main className="doc-shell">
        <div className="container">
          <header className="doc-hero">
            <span>DOCS / OPERATOR MANUAL</span>
            <h1>Manual de operação do protocolo.</h1>
            <p>
              A documentação da Instead foi organizada como mesa de comando: arquitetura, fluxos, riscos e integrações separados por decisão operacional.
            </p>
          </header>

          <section className="doc-grid">
            <article className="doc-panel doc-panel--wide">
              <code>01 / LENDING</code>
              <h3>Borrow sem perder leitura de risco</h3>
              <p>
                Entenda colateral, LTV, juros dinâmicos, health factor e liquidação antes de assinar uma transação. O objetivo da interface é tornar o risco visível, não decorativo.
              </p>
            </article>
            <article className="doc-panel">
              <code>02 / FACTORY</code>
              <h3>Token launch</h3>
              <p>Crie ativos com supply, mint, burn e taxa sem escrever Solidity. Deploy de contratos fica bloqueado até auditoria e testes.</p>
            </article>
            <article className="doc-panel">
              <code>03 / AUTH</code>
              <h3>Wallet session</h3>
              <p>SIWE emite nonce, verifica assinatura e cria sessão curta para RLS e áreas protegidas.</p>
            </article>
            <article className="doc-panel">
              <code>04 / OBS</code>
              <h3>Observability</h3>
              <p>Eventos leves para Web Vitals e erros client-side, com envio desativado quando Supabase não existe no build.</p>
            </article>
            <article className="doc-panel">
              <code>05 / CHAINS</code>
              <h3>Network map</h3>
              <p>Arbitrum, Base, Polygon, Ethereum e outras redes aparecem como rotas de liquidez, não apenas badges estéticos.</p>
            </article>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
