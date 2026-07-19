"use client";

import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export default function SecurityPage() {
  return (
    <div className="site-shell">
      <Navbar />
      <main className="doc-shell">
        <div className="container">
          <header className="doc-hero">
            <span>SECURITY / THREAT SURFACE</span>
            <h1>Seguranca como arquitetura, nao selo.</h1>
            <p>
              A Instead prioriza controles verificaveis: autenticacao por assinatura, isolamento de dados, edge functions restritas e deploy de contratos somente depois da fase de auditoria.
            </p>
          </header>

          <section className="doc-grid">
            <article className="doc-panel">
              <code>AUTH</code>
              <h3>SIWE nonce</h3>
              <p>Nonce persistido, consumo unico, expiracao curta e JWT com claims operacionais.</p>
            </article>
            <article className="doc-panel">
              <code>RLS</code>
              <h3>Data boundary</h3>
              <p>Politicas por tabela para reduzir leitura publica indevida e proteger posicoes de lending.</p>
            </article>
            <article className="doc-panel">
              <code>EDGE</code>
              <h3>AI guardrails</h3>
              <p>CORS restrito, bearer token, payload limit, sanitizacao e rate limit nas funcoes de IA.</p>
            </article>
            <article className="doc-panel doc-panel--wide">
              <code>CONTRACTS</code>
              <h3>Deploy fica por ultimo</h3>
              <p>
                O contrato de lending ainda exige refatoracao de isolamento de posicoes, testes unitarios, fuzz/invariant e auditoria externa antes de mainnet.
              </p>
            </article>
            <article className="doc-panel">
              <code>OPS</code>
              <h3>Alerting</h3>
              <p>Web Vitals e erros client-side ja entram na base; Sentry/OpenTelemetry e uptime checks seguem como proxima camada.</p>
            </article>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
