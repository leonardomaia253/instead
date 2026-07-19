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
            <h1>Privacidade compativel com blockchain.</h1>
            <p>
              O protocolo reduz coleta off-chain, mas blockchains publicas sao permanentes por natureza. A politica abaixo separa o que a interface coleta do que a rede publica expõe.
            </p>
          </header>

          <section className="doc-grid">
            <article className="doc-panel">
              <code>01 / WALLET</code>
              <h3>Identidade minima</h3>
              <p>Login por wallet usa endereco publico e assinatura SIWE. Nome, documento e endereco residencial nao fazem parte do fluxo base.</p>
            </article>
            <article className="doc-panel doc-panel--wide">
              <code>02 / CHAIN</code>
              <h3>Dados publicos e permanentes</h3>
              <p>Transacoes, valores, carteiras e interacoes com contratos podem ser vistas em exploradores de bloco. A Instead nao pode apagar esse historico.</p>
            </article>
            <article className="doc-panel">
              <code>03 / LOCAL</code>
              <h3>Preferencias locais</h3>
              <p>Tema, modo performance e sessao wallet podem usar local storage ou cookie de sessao para manter a experiencia funcional.</p>
            </article>
            <article className="doc-panel">
              <code>04 / OBS</code>
              <h3>Telemetria tecnica</h3>
              <p>Web Vitals e erros client-side ajudam a manter disponibilidade. Quando Supabase nao esta configurado, o envio e desativado.</p>
            </article>
            <article className="doc-panel">
              <code>05 / TERMS</code>
              <h3>Base de uso</h3>
              <p><Link href="/legal/terms" style={{ color: "var(--accent-1)" }}>Leia tambem os termos</Link> para entender riscos de contratos, liquidacao e jurisdicao.</p>
            </article>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
