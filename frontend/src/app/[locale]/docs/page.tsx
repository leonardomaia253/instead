"use client";

import React from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { motion } from "framer-motion";

export default function DocsPage() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "var(--bg-base)" }}>
      <Navbar />
      <main className="container" style={{ flex: 1, padding: "120px 24px" }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="gradient-text" style={{ fontSize: "48px", fontWeight: 800, marginBottom: "32px", fontFamily: "'Space Grotesk', sans-serif" }}>
            Documentação do Protocolo
          </h1>
          
          <div className="card" style={{ padding: "40px", lineHeight: "1.8" }}>
            <h2 style={{ fontSize: "24px", marginBottom: "20px" }}>Bem-vindo ao Instead DeFi</h2>
            <p style={{ color: "var(--text-muted)", marginBottom: "24px" }}>
              Explore nossa documentação para entender como funciona o sistema de empréstimos (Lending) e a fábrica de tokens (Token Factory).
            </p>
            
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "24px", marginTop: "40px" }}>
              <div className="card" style={{ background: "rgba(124,58,237,0.05)" }}>
                <h3 style={{ marginBottom: "12px" }}>🏦 Lending & Borrowing</h3>
                <p style={{ fontSize: "14px", color: "var(--text-muted)" }}>Aprenda sobre colaterais, taxas de juros e o fator de saúde.</p>
              </div>
              <div className="card" style={{ background: "rgba(37,99,235,0.05)" }}>
                <h3 style={{ marginBottom: "12px" }}>🏭 Token Factory</h3>
                <p style={{ fontSize: "14px", color: "var(--text-muted)" }}>Guia passo a passo para lançar seu token em múltiplas redes.</p>
              </div>
              <div className="card" style={{ background: "rgba(16,185,129,0.05)" }}>
                <h3 style={{ marginBottom: "12px" }}>🛡️ Segurança</h3>
                <p style={{ fontSize: "14px", color: "var(--text-muted)" }}>Nossas práticas de auditoria e proteção de contratos.</p>
              </div>
            </div>
          </div>
        </motion.div>
      </main>
      <Footer />
    </div>
  );
}
