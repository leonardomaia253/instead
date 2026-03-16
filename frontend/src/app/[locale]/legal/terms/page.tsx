"use client";

import React from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { motion } from "framer-motion";
import { Shield, AlertTriangle, FileText, Gavel, Globe } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/navigation";

export default function TermsPage() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "var(--bg-base)" }}>
      <Navbar />
      <main className="container" style={{ flex: 1, padding: "120px 24px" }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div style={{ textAlign: "center", marginBottom: 60 }}>
            <span style={{ 
              color: "var(--accent-1)", 
              fontSize: 14, 
              fontWeight: 700, 
              textTransform: "uppercase", 
              letterSpacing: 2 
            }}>
              Base Legal
            </span>
            <h1 className="gradient-text" style={{ 
              fontSize: "clamp(32px, 5vw, 48px)", 
              fontWeight: 800, 
              marginTop: 12,
              fontFamily: "'Space Grotesk', sans-serif" 
            }}>
              Termos de Uso do Protocolo
            </h1>
            <p style={{ color: "var(--text-muted)", marginTop: 16 }}>
              Última atualização: 16 de Março de 2026 • Versão 2.1.0
            </p>
          </div>
          
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 32, maxWidth: 900, margin: "0 auto" }}>
            <section className="card" style={{ padding: "48px" }}>
              <div style={styles.sectionHeader}>
                <Shield className="w-6 h-6 text-purple-500" />
                <h3 style={styles.sectionTitle}>1. Aceitação e Natureza do Protocolo</h3>
              </div>
              <p style={styles.paragraph}>
                A Instead Finance opera como um protocolo de software descentralizado e não custodiante. Ao interagir com nossos smart contracts ou utilizar esta interface, você reconhece que está operando em uma rede blockchain pública, onde as transações são irreversíveis e autogovernadas por código.
              </p>
              
              <div style={styles.sectionHeader}>
                <AlertTriangle className="w-6 h-6 text-yellow-500" />
                <h3 style={styles.sectionTitle}>2. Riscos de DeFi e Volatilidade</h3>
              </div>
              <p style={styles.paragraph}>
                O uso de protocolos de empréstimo (lending) e staking envolve riscos significativos, incluindo, mas não se limitando a:
              </p>
              <ul style={styles.list}>
                <li><strong>Liquidação:</strong> Se o valor do seu colateral cair abaixo do limite de segurança, seus ativos podem ser liquidados automaticamente.</li>
                <li><strong>Falhas em Smart Contracts:</strong> Embora auditados, o software pode conter vulnerabilidades imprevistas.</li>
                <li><strong>Volatilidade de Preço:</strong> Criptoativos possuem variações extremas fora do controle da plataforma.</li>
              </ul>

              <div style={styles.sectionHeader}>
                <FileText className="w-6 h-6 text-blue-500" />
                <h3 style={styles.sectionTitle}>3. Responsabilidade do Usuário</h3>
              </div>
              <p style={styles.paragraph}>
                Você é o único detentor de suas chaves privadas. A Instead não possui acesso a seus fundos e não pode reverter transações, recuperar senhas ou intervir em liquidações executadas pelo código do protocolo.
              </p>

              <div style={styles.sectionHeader}>
                <Gavel className="w-6 h-6 text-red-500" />
                <h3 style={styles.sectionTitle}>4. Conformidade e Restrições Geográficas</h3>
              </div>
              <p style={styles.paragraph}>
                O usuário deve garantir que o uso de ferramentas DeFi é legal em sua jurisdição. Não oferecemos serviços a pessoas ou entidades em regiões sancionadas ou onde a negociação de ativos digitais é proibida.
              </p>

              <div style={styles.sectionHeader}>
                <Globe className="w-6 h-6 text-green-500" />
                <h3 style={styles.sectionTitle}>5. Modificações no Protocolo</h3>
              </div>
              <p style={styles.paragraph}>
                Como um sistema governado, parâmetros como taxas de juros, colaterais aceitos e incentivos de staking podem mudar conforme as necessidades de liquidez da rede e governança da comunidade.
              </p>
            </section>

            <div style={{ textAlign: "center", padding: "24px", color: "var(--text-muted)", fontSize: 14 }}>
              Dúvidas sobre os termos? Entre em contato via <a href="#" style={{ color: "var(--accent-1)", textDecoration: "none" }}>suporte@instead.finance</a>
            </div>
          </div>
        </motion.div>
      </main>
      <Footer />
    </div>
  );
}

const styles = {
  sectionHeader: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    marginTop: 40,
    marginBottom: 20
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 700,
    color: "var(--text-primary)",
    fontFamily: "'Space Grotesk', sans-serif",
    margin: 0
  },
  paragraph: {
    fontSize: 16,
    lineHeight: 1.8,
    color: "var(--text-muted)",
    marginBottom: 20
  },
  list: {
    paddingLeft: 20,
    color: "var(--text-muted)",
    fontSize: 15,
    lineHeight: 2,
    marginBottom: 32
  }
};
