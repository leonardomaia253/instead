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
            <h1>Segurança como arquitetura, não selo.</h1>
            <p>
              A Instead prioriza controles verificáveis: autenticação por assinatura, isolamento de dados, edge functions restritas e deploy de contratos somente depois da fase de auditoria.
            </p>
          </header>

          <section className="doc-grid">
            <article className="doc-panel">
              <code>AUTENTICAÇÃO</code>
              <h3>Assinatura Criptográfica</h3>
              <p>Autenticação via assinatura de mensagem em carteira Web3 sem exposição de chaves privadas ou dados pessoais.</p>
            </article>
            <article className="doc-panel">
              <code>PRIVACIDADE</code>
              <h3>Isolamento de Dados</h3>
              <p>Políticas estritas de controle de acesso garantem a confidencialidade das operações e dados de cada usuário.</p>
            </article>
            <article className="doc-panel">
              <code>FIREWALL</code>
              <h3>Proteção de Aplicação</h3>
              <p>Rate limiting, sanitização de payloads e proteção contra ataques automatizados em todas as APIs do ecossistema.</p>
            </article>
            <article className="doc-panel doc-panel--wide">
              <code>CONTRATOS</code>
              <h3>Segurança Não-Custodial</h3>
              <p>
                Os contratos inteligentes da plataforma operam de forma 100% não-custodial, com liquidez mantida diretamente nas contas dos investidores e verificações rigorosas de segurança.
              </p>
            </article>
            <article className="doc-panel">
              <code>MONITORAMENTO</code>
              <h3>Alertas em Tempo Real</h3>
              <p>Infraestrutura de monitoramento ativo monitora a saúde das conexões blockchain e liquidez em tempo real.</p>
            </article>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
