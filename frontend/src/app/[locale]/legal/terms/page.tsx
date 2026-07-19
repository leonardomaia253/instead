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
              Ao usar a Instead, voce interage com software nao custodiante e redes publicas. Transacoes on-chain sao definitivas, auditaveis e de responsabilidade da carteira que assina.
            </p>
          </header>

          <section className="doc-grid">
            <article className="doc-panel doc-panel--wide">
              <code>01 / NATURE</code>
              <h3>Interface nao custodiante</h3>
              <p>A Instead nao guarda fundos, nao reverte transacoes e nao controla chaves privadas. A interface facilita interacao com contratos e dados do protocolo.</p>
            </article>
            <article className="doc-panel">
              <code>02 / RISK</code>
              <h3>Liquidacao</h3>
              <p>Posicoes de lending podem ser liquidadas quando o colateral cai abaixo dos parametros de seguranca.</p>
            </article>
            <article className="doc-panel">
              <code>03 / CODE</code>
              <h3>Smart contracts</h3>
              <p>Mesmo contratos auditados podem conter falhas. Deploy de contratos novos exige testes e auditoria antes de producao.</p>
            </article>
            <article className="doc-panel">
              <code>04 / ACCESS</code>
              <h3>Jurisdicao</h3>
              <p>O usuario deve verificar se pode acessar protocolos DeFi e ativos digitais conforme as regras do seu territorio.</p>
            </article>
            <article className="doc-panel doc-panel--wide">
              <code>05 / CHANGE</code>
              <h3>Parametros podem mudar</h3>
              <p>Taxas, colaterais aceitos, redes suportadas e incentivos podem ser alterados por manutencao, seguranca, governanca ou estrategia de liquidez.</p>
            </article>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
