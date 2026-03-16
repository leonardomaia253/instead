"use client";

import React from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { motion } from "framer-motion";

export default function TermsPage() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "var(--bg-base)" }}>
      <Navbar />
      <main className="container" style={{ flex: 1, padding: "120px 24px" }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="gradient-text" style={{ fontSize: "40px", fontWeight: 800, marginBottom: "32px", fontFamily: "'Space Grotesk', sans-serif" }}>
            Termos de Uso
          </h1>
          
          <div className="card" style={{ padding: "40px", lineHeight: "1.8", color: "var(--text-muted)" }}>
            <p style={{ marginBottom: "20px" }}>Última atualização: 16 de Março de 2026</p>
            <p style={{ marginBottom: "16px" }}>Ao utilizar a plataforma Instead DeFi, você concorda em cumprir estes termos e todas as leis e regulamentos aplicáveis.</p>
            <h3 style={{ color: "var(--text-primary)", marginTop: "32px", marginBottom: "16px" }}>1. Uso da Plataforma</h3>
            <p>A Instead fornece serviços de infraestrutura descentralizada. O usuário é o único responsável pela gestão de suas chaves privadas e transações.</p>
            <h3 style={{ color: "var(--text-primary)", marginTop: "32px", marginBottom: "16px" }}>2. Riscos de Mercado</h3>
            <p>O mercado de criptoativos é volátil. O uso de serviços de lending envolve riscos de liquidação baseados em flutuações de preços de mercado.</p>
          </div>
        </motion.div>
      </main>
      <Footer />
    </div>
  );
}
