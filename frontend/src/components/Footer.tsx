"use client";

import React from "react";
import Link from "next/link";

export function Footer() {
  return (
    <footer style={{ padding: "80px 24px", borderTop: "1px solid var(--border)", background: "var(--bg-base)" }}>
      <div className="container">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 48, marginBottom: 64 }}>
          <div style={{ gridColumn: "span 2" }}>
            <span className="gradient-text" style={{ fontSize: 28, fontWeight: 800, fontFamily: "'Space Grotesk', sans-serif" }}>
              Instead DeFi
            </span>
            <p style={{ color: "var(--text-muted)", fontSize: 16, marginTop: 16, maxWidth: 400, lineHeight: 1.6 }}>
              A infraestrutura definitiva para a economia descentralizada. Empréstimos, tokenização e liquidez em uma única plataforma multichain.
            </p>
          </div>

          <div>
            <h4 style={{ fontSize: 16, fontWeight: 700, marginBottom: 24, color: "var(--text-primary)" }}>Protocolo</h4>
            <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 12 }}>
              <li><Link href="/lending" className="hover-link">Lending</Link></li>
              <li><Link href="/factory" className="hover-link">Token Factory</Link></li>
              <li><Link href="/simulator" className="hover-link">Simulador</Link></li>
              <li><Link href="/dashboard" className="hover-link">Dashboard</Link></li>
            </ul>
          </div>

          <div>
            <h4 style={{ fontSize: 16, fontWeight: 700, marginBottom: 24, color: "var(--text-primary)" }}>Suporte</h4>
            <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 12 }}>
              <li><Link href="/docs" className="hover-link">Documentação</Link></li>
              <li><a href="https://github.com" target="_blank" rel="noopener noreferrer" className="hover-link">GitHub</a></li>
              <li><a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="hover-link">Twitter</a></li>
              <li><Link href="/security" className="hover-link">Segurança</Link></li>
            </ul>
          </div>

          <div>
            <h4 style={{ fontSize: 16, fontWeight: 700, marginBottom: 24, color: "var(--text-primary)" }}>Legal</h4>
            <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 12 }}>
              <li><Link href="/legal/terms" className="hover-link">Termos de Uso</Link></li>
              <li><Link href="/legal/privacy" className="hover-link">Privacidade</Link></li>
            </ul>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--border)", paddingTop: 32, flexWrap: "wrap", gap: 16 }}>
          <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
            © 2026 Instead Finance. Todos os direitos reservados.
          </p>
          <div style={{ display: "flex", gap: 24 }}>
             <span style={{ fontSize: 14, color: "var(--text-muted)" }}>Auditado por Certik</span>
             <span style={{ fontSize: 14, color: "var(--text-muted)" }}>Hospedado no IPFS</span>
          </div>
        </div>
      </div>

      <style jsx>{`
        .hover-link {
          color: var(--text-muted);
          font-size: 15px;
          text-decoration: none;
          transition: all 0.2s ease;
        }
        .hover-link:hover {
          color: var(--accent-1);
          padding-left: 4px;
        }
      `}</style>
    </footer>
  );
}
