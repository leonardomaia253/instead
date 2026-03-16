"use client";

import React from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { motion } from "framer-motion";

export default function SecurityPage() {
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
            Segurança do Protocolo
          </h1>
          
          <div className="card" style={{ padding: "40px", lineHeight: "1.8" }}>
            <h2 style={{ fontSize: "24px", marginBottom: "20px" }}>Compromisso com a Segurança</h2>
            <p style={{ color: "var(--text-muted)", marginBottom: "24px" }}>
              Nossos contratos são auditados por empresas líderes do setor e protegidos por mecanismos de governança multicamadas.
            </p>
            
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "24px" }}>
              <div className="card" style={{ borderLeft: "4px solid var(--green)" }}>
                <h4>Auditado por Certik</h4>
                <p style={{ fontSize: "14px", color: "var(--text-muted)" }}>Templates de tokens validados on-chain.</p>
              </div>
              <div className="card" style={{ borderLeft: "4px solid var(--accent-1)" }}>
                <h4>Gnosis Safe</h4>
                <p style={{ fontSize: "14px", color: "var(--text-muted)" }}>Tesouraria protegida por multi-sig.</p>
              </div>
              <div className="card" style={{ borderLeft: "4px solid var(--accent-2)" }}>
                <h4>Bug Bounty</h4>
                <p style={{ fontSize: "14px", color: "var(--text-muted)" }}>Programa aberto para caçadores de bugs.</p>
              </div>
            </div>
          </div>
        </motion.div>
      </main>
      <Footer />
    </div>
  );
}
