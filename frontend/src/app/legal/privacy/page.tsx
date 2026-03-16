"use client";

import React from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { motion } from "framer-motion";

export default function PrivacyPage() {
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
            Política de Privacidade
          </h1>
          
          <div className="card" style={{ padding: "40px", lineHeight: "1.8", color: "var(--text-muted)" }}>
            <p style={{ marginBottom: "20px" }}>Última atualização: 16 de Março de 2026</p>
            <p style={{ marginBottom: "16px" }}>Sua privacidade é importante para nós. Esta política descreve como tratamos informações na rede Rather Finance.</p>
            <h3 style={{ color: "var(--text-primary)", marginTop: "32px", marginBottom: "16px" }}>1. Coleta de Dados</h3>
            <p>Nossa plataforma é baseada em blockchain. Não coletamos dados pessoais como e-mail ou nome, apenas endereços de carteira pública vinculados a transações.</p>
            <h3 style={{ color: "var(--text-primary)", marginTop: "32px", marginBottom: "16px" }}>2. Cookies</h3>
            <p>Utilizamos cookies locais estritamente necessários para manter a sessão da carteira e preferências de tema.</p>
          </div>
        </motion.div>
      </main>
      <Footer />
    </div>
  );
}
