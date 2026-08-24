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
            <span>COMO PROTEGEMOS VOCÊ</span>
            <h1>Segurança em cada operação.</h1>
            <p>
              A Instead protege seu acesso com assinatura pela carteira, mantém os dados de cada conta separados e só libera novos contratos após testes de segurança.
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
              <p>Limitamos tentativas excessivas, validamos as informações recebidas e bloqueamos ações automatizadas suspeitas.</p>
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
              <p>Acompanhamos continuamente as conexões com as redes e as condições de liquidez para identificar instabilidades.</p>
            </article>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
