"use client";

import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Link } from "@/navigation";

export default function PrivacyPage() {
  return (
    <div className="site-shell">
      <Navbar />
      <main className="doc-shell">
        <div className="container">
          <header className="doc-hero">
            <span>LEGAL / PRIVACY</span>
            <h1>Privacidade compatível com blockchain.</h1>
            <p>
              O protocolo reduz coleta off-chain, mas blockchains públicas são permanentes por natureza. A política abaixo separa o que a interface coleta do que a rede pública expõe.
            </p>
          </header>

          <section className="doc-grid">
            <article className="doc-panel">
              <code>01 / WALLET</code>
              <h3>Identidade mínima</h3>
              <p>Login por wallet usa endereço público e assinatura SIWE. Nome, documento e endereço residencial não fazem parte do fluxo base.</p>
            </article>
            <article className="doc-panel doc-panel--wide">
              <code>02 / CHAIN</code>
              <h3>Dados públicos e permanentes</h3>
              <p>Transações, valores, carteiras e interações com contratos podem ser vistas em exploradores de bloco. A Instead não pode apagar esse histórico.</p>
            </article>
            <article className="doc-panel">
              <code>03 / LOCAL</code>
              <h3>Preferências locais</h3>
              <p>Tema, modo performance e sessão wallet podem usar local storage ou cookie de sessão para manter a experiência funcional.</p>
            </article>
            <article className="doc-panel">
              <code>04 / OBS</code>
              <h3>Telemetria técnica</h3>
              <p>Web Vitals e relatórios anônimos de performance ajudam a manter a estabilidade e disponibilidade da aplicação.</p>
            </article>
            <article className="doc-panel">
              <code>05 / TERMS</code>
              <h3>Base de uso</h3>
              <p><Link href="/legal/terms" style={{ color: "var(--accent-1)" }}>Leia também os termos</Link> para entender riscos de contratos, liquidação e jurisdição.</p>
            </article>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
