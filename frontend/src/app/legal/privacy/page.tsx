"use client";

import React from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { motion } from "framer-motion";
import Link from "next/link";
import { EyeOff, Database, ShieldCheck, Cpu, Fingerprint } from "lucide-react";

export default function PrivacyPage() {
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
              color: "var(--accent-2)", 
              fontSize: 14, 
              fontWeight: 700, 
              textTransform: "uppercase", 
              letterSpacing: 2 
            }}>
              Privacidade Web3
            </span>
            <h1 className="gradient-text" style={{ 
              fontSize: "clamp(32px, 5vw, 48px)", 
              fontWeight: 800, 
              marginTop: 12,
              fontFamily: "'Space Grotesk', sans-serif" 
            }}>
              Política de Privacidade & Dados
            </h1>
            <p style={{ color: "var(--text-muted)", marginTop: 16 }}>
              Última atualização: 16 de Março de 2026 • Foco em Transparência On-chain
            </p>
          </div>
          
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 32, maxWidth: 900, margin: "0 auto" }}>
            <section className="card" style={{ padding: "48px" }}>
              <div style={styles.sectionHeader}>
                <EyeOff className="w-6 h-6 text-blue-500" />
                <h3 style={styles.sectionTitle}>1. Filosofia de Dados Zero-Knowledge</h3>
              </div>
              <p style={styles.paragraph}>
                A Instead Finance não solicita nem armazena nomes, e-mails, endereços residenciais ou qualquer dado de identificação pessoal (PII). Nossa interação ocorre estritamente via sua carteira pública (wallet address).
              </p>
              
              <div style={styles.sectionHeader}>
                <Database className="w-6 h-6 text-green-500" />
                <h3 style={styles.sectionTitle}>2. Natureza Pública da Blockchain</h3>
              </div>
              <p style={styles.paragraph}>
                Ao realizar transações na rede (Ethereum, Arbitrum, Base, etc.), seus dados de transação tornam-se públicos, permanentes e imutáveis. Isso inclui o endereço da sua carteira, valores transferidos e interações com smart contracts. A Instead não tem poder para apagar esses registros.
              </p>

              <div style={styles.sectionHeader}>
                <ShieldCheck className="w-6 h-6 text-purple-500" />
                <h3 style={styles.sectionTitle}>3. Uso de Metadados e Cookies</h3>
              </div>
              <p style={styles.paragraph}>
                Utilizamos tecnologias locais (Local Storage) para lembrar suas preferências de tema (Dark/Light) e a última rede conectada. Não rastreamos seu comportamento fora desta plataforma para fins publicitários.
              </p>

              <div style={styles.sectionHeader}>
                <Cpu className="w-6 h-6 text-yellow-500" />
                <h3 style={styles.sectionTitle}>4. Terceiros e Infraestrutura</h3>
              </div>
              <p style={styles.paragraph}>
                Interagimos com provedores de RPC (como Infura ou Alchemy) e indexadores de blockchain. Esses serviços podem ver o seu endereço IP durante a requisição, mas não possuem vínculo com sua identidade real através da nossa plataforma.
              </p>

              <div style={styles.sectionHeader}>
                <Fingerprint className="w-6 h-6 text-red-500" />
                <h3 style={styles.sectionTitle}>5. Segurança da Informação</h3>
              </div>
              <p style={styles.paragraph}>
                Embora não guardemos seus fundos, nossa infraestrutura de frontend e backend é protegida por camadas de criptografia para garantir que os dados de metadados dos tokens (salvos no nosso DB) permaneçam íntegros.
              </p>
            </section>

            <div style={{ textAlign: "center", padding: "24px", color: "var(--text-muted)", fontSize: 14 }}>
              Sua soberania digital é nossa prioridade. <br />
              <Link href="/legal/terms" style={{ color: "var(--accent-1)", textDecoration: "none" }}>Consulte também nossos Termos de Uso →</Link>
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
  }
};
