"use client";

import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export default function TermsPage() {
  return (
    <div className="site-shell">
      <Navbar />
      <main className="doc-shell">
        <div className="container">
          <header className="doc-hero">
            <span>LEGAL / TERMS</span>
            <h1>Termos para operadores soberanos.</h1>
            <p>
              Ao usar a Instead, você interage com software não custodiante e redes públicas. Transações on-chain são definitivas, auditáveis e de responsabilidade da carteira que assina.
            </p>
          </header>

          <section className="doc-grid">
            <article className="doc-panel doc-panel--wide">
              <code>01 / NATURE</code>
              <h3>Interface não custodiante</h3>
              <p>A Instead não guarda fundos, não reverte transações e não controla chaves privadas. A interface facilita interação com contratos e dados do protocolo.</p>
            </article>
            <article className="doc-panel">
              <code>02 / RISK</code>
              <h3>Liquidação</h3>
              <p>Posições de lending podem ser liquidadas quando o colateral cai abaixo dos parâmetros de segurança.</p>
            </article>
            <article className="doc-panel">
              <code>03 / CODE</code>
              <h3>Smart contracts</h3>
              <p>Mesmo contratos auditados podem conter falhas. Deploy de contratos novos exige testes e auditoria antes de produção.</p>
            </article>
            <article className="doc-panel">
              <code>04 / ACCESS</code>
              <h3>Jurisdição</h3>
              <p>O usuário deve verificar se pode acessar protocolos DeFi e ativos digitais conforme as regras do seu território.</p>
            </article>
            <article className="doc-panel doc-panel--wide">
              <code>05 / CHANGE</code>
              <h3>Parâmetros podem mudar</h3>
              <p>Taxas, colaterais aceitos, redes suportadas e incentivos podem ser alterados por manutenção, segurança, governança ou estratégia de liquidez.</p>
            </article>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
