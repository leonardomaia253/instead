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
            <span>CENTRAL DE AJUDA</span>
            <h1>Use a Instead com mais segurança.</h1>
            <p>
              Encontre orientações sobre cada produto, entenda os riscos e siga os passos necessários para concluir suas operações.
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
              <p>Defina oferta, criação adicional, queima e taxas sem programar. A publicação só é liberada quando as verificações de segurança necessárias estiverem concluídas.</p>
            </article>
            <article className="doc-panel">
              <code>03 / AUTENTICAÇÃO</code>
              <h3>Acesso Seguro por Carteira</h3>
              <p>Autentique-se com sua carteira Web3 preferida através de assinatura digital segura, mantendo controle total sobre seu patrimônio.</p>
            </article>
            <article className="doc-panel">
              <code>04 / PROTEÇÃO</code>
              <h3>Monitoramento Contínuo</h3>
              <p>Sistemas de proteção em tempo real monitoram a integridade das transações e garantem a máxima disponibilidade das aplicações.</p>
            </article>
            <article className="doc-panel">
              <code>05 / REDES</code>
              <h3>Conectividade Multi-chain</h3>
              <p>Arbitrum, Base, Polygon, Ethereum e principais redes integradas para oferecer as melhores rotas de liquidez e taxas do mercado.</p>
            </article>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
