"use client";

import React from "react";
import Link from "next/link";
import { 
  Twitter, 
  Github, 
  Linkedin, 
  MessageSquare, 
  ShieldCheck, 
  Cpu, 
  Globe, 
  Lock
} from "lucide-react";

export function Footer() {
  return (
    <footer style={{ 
      padding: "100px 24px 60px", 
      borderTop: "1px solid var(--border)", 
      background: "var(--bg-base)",
      position: "relative",
      overflow: "hidden" 
    }}>
      {/* Dynamic Background Element */}
      <div style={{
        position: "absolute",
        bottom: "-10%",
        left: "50%",
        transform: "translateX(-50%)",
        width: "80%",
        height: "300px",
        background: "radial-gradient(circle, rgba(124,58,237,0.05) 0%, transparent 70%)",
        filter: "blur(60px)",
        pointerEvents: "none",
        zIndex: 0
      }} />

      <div className="container" style={{ position: "relative", zIndex: 1 }}>
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", 
          gap: "60px 48px", 
          marginBottom: 80 
        }}>
          {/* Brand Column */}
          <div style={{ gridColumn: "span min(2, 4)" }}>
            <Link href="/" style={{ textDecoration: "none" }}>
              <span className="gradient-text" style={{ fontSize: 32, fontWeight: 800, fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-1px" }}>
                Instead DeFi
              </span>
            </Link>
            <p style={{ color: "var(--text-muted)", fontSize: 16, marginTop: 20, maxWidth: 360, lineHeight: 1.7 }}>
              A infraestrutura definitiva para a economia descentralizada em escala global. 
              Transformando colaterais em liquidez instantânea através de algoritmos avançados.
            </p>
            <div style={{ display: "flex", gap: 16, marginTop: 32 }}>
              <SocialIcon href="https://twitter.com" icon={<Twitter className="w-5 h-5" />} />
              <SocialIcon href="https://github.com" icon={<Github className="w-5 h-5" />} />
              <SocialIcon href="https://linkedin.com" icon={<Linkedin className="w-5 h-5" />} />
              <SocialIcon href="#" icon={<MessageSquare className="w-5 h-5" />} />
            </div>
          </div>

          {/* Protocol Column */}
          <div>
            <h4 style={styles.columnTitle}>Protocolo</h4>
            <ul style={styles.list}>
              <FooterLink href="/lending">Lending Hub</FooterLink>
              <FooterLink href="/factory">Token Factory</FooterLink>
              <FooterLink href="/staking">Staking Pool</FooterLink>
              <FooterLink href="/simulator">Simulador Pro</FooterLink>
              <FooterLink href="/dashboard">Analytics</FooterLink>
            </ul>
          </div>

          {/* Resources Column */}
          <div>
            <h4 style={styles.columnTitle}>Recursos</h4>
            <ul style={styles.list}>
              <FooterLink href="/docs">Documentação</FooterLink>
              <FooterLink href="/security">Auditorias</FooterLink>
              <FooterLink href="#">Status da Rede</FooterLink>
              <FooterLink href="#">Whitepaper</FooterLink>
              <FooterLink href="#">Blog</FooterLink>
            </ul>
          </div>

          {/* Legal Column */}
          <div>
            <h4 style={styles.columnTitle}>Legal</h4>
            <ul style={styles.list}>
              <FooterLink href="/legal/terms">Termos de Uso</FooterLink>
              <FooterLink href="/legal/privacy">Política de Privacidade</FooterLink>
              <FooterLink href="/legal/cookies">Cookies</FooterLink>
              <FooterLink href="/legal/compliance">Compliance</FooterLink>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div style={{ 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center", 
          borderTop: "1px solid var(--border)", 
          paddingTop: 40, 
          flexWrap: "wrap", 
          gap: 24 
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
            <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
              © 2026 Instead Finance. Built for the future of finance.
            </p>
          </div>
          
          <div style={{ display: "flex", gap: 32, alignItems: "center" }}>
            <div style={styles.trustBadge}>
              <ShieldCheck className="w-4 h-4 text-green-500" />
              <span>Certik Audited</span>
            </div>
            <div style={styles.trustBadge}>
              <Cpu className="w-4 h-4 text-blue-500" />
              <span>Multi-Chain</span>
            </div>
            <div style={styles.trustBadge}>
              <Globe className="w-4 h-4 text-purple-500" />
              <span>Global Protocol</span>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .footer-link-item {
          color: var(--text-muted);
          font-size: 15px;
          text-decoration: none;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          display: inline-block;
        }
        .footer-link-item:hover {
          color: var(--text-primary);
          transform: translateX(4px);
        }
        .social-icon-btn {
          width: 42px;
          height: 42px;
          border-radius: 12px;
          background: var(--bg-surface);
          border: 1px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-muted);
          transition: all 0.2s ease;
        }
        .social-icon-btn:hover {
          background: var(--accent-1);
          color: white;
          transform: translateY(-3px);
          border-color: transparent;
          box-shadow: 0 8px 16px rgba(124,58,237,0.2);
        }
      `}</style>
    </footer>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li style={{ marginBottom: 12 }}>
      <Link href={href} className="footer-link-item">
        {children}
      </Link>
    </li>
  );
}

function SocialIcon({ href, icon }: { href: string; icon: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="social-icon-btn">
      {icon}
    </a>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  columnTitle: { 
    fontSize: 16, 
    fontWeight: 700, 
    marginBottom: 28, 
    color: "var(--text-primary)",
    fontFamily: "'Space Grotesk', sans-serif",
    textTransform: "uppercase" as const,
    letterSpacing: "1px"
  },
  list: { 
    listStyle: "none", 
    display: "flex", 
    flexDirection: "column", 
    padding: 0 
  },
  trustBadge: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 12,
    fontWeight: 600,
    color: "var(--text-muted)",
    background: "rgba(255,255,255,0.02)",
    padding: "6px 12px",
    borderRadius: "100px",
    border: "1px solid var(--border)"
  }
};
