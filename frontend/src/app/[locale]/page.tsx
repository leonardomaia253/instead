"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/navigation";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import Scene3D from "@/components/Scene3D";
import { motion } from "framer-motion";

export default function LandingPage() {
  const t = useTranslations("Index");
  const tc = useTranslations("Common");

  return (
    <div style={{ minHeight: "100vh", position: "relative", background: "var(--bg-base)", overflow: "hidden" }}>
      <Navbar />
      
      {/* 3D Background */}
      <Scene3D />

      {/* Hero Section */}
      <main className="container" style={{ position: "relative", zIndex: 1, padding: "80px 24px 120px" }}>
        <section style={{ 
          minHeight: "75vh", 
          display: "flex", 
          flexDirection: "column", 
          justifyContent: "center", 
          alignItems: "center", 
          textAlign: "center",
          maxWidth: "900px",
          margin: "0 auto"
        }}>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <h1 className="gradient-text" style={{ 
              fontSize: "clamp(48px, 8vw, 84px)", 
              lineHeight: 1.1, 
              fontWeight: 800, 
              marginBottom: "24px", 
              fontFamily: "'Space Grotesk', sans-serif" 
            }}>
              {t("hero_title")}
            </h1>
            <p style={{ 
              fontSize: "clamp(18px, 4vw, 22px)", 
              color: "var(--text-muted)", 
              maxWidth: "680px", 
              margin: "0 auto 40px",
              lineHeight: 1.6
            }}>
              {t("hero_subtitle")}
            </p>
            
            <div style={{ display: "flex", gap: "16px", justifyContent: "center", flexWrap: "wrap" }}>
              <Link href="/lending" className="btn-primary" style={{ padding: "16px 36px", fontSize: "17px", fontWeight: 600 }}>
                {t("get_started")}
              </Link>
              <Link href="/docs" className="btn-outline" style={{ padding: "16px 36px", fontSize: "17px", fontWeight: 600 }}>
                {t("view_docs")}
              </Link>
            </div>
          </motion.div>
        </section>

        {/* Feature Sections */}
        <section style={{ 
          display: "grid", 
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", 
          gap: "32px", 
          marginTop: "60px" 
        }}>
          {/* Lending Card */}
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="card" 
            style={{ padding: "48px", position: "relative", overflow: "hidden" }}
          >
            <div style={{ fontSize: "40px", marginBottom: "24px" }}>🏦</div>
            <h2 style={{ fontSize: "28px", fontWeight: 700, marginBottom: "16px", fontFamily: "'Space Grotesk', sans-serif" }}>
              {t("lending_title")}
            </h2>
            <p style={{ color: "var(--text-muted)", fontSize: "16px", lineHeight: 1.7, marginBottom: "32px" }}>
              {t("lending_desc")}
            </p>
            <Link href="/lending" style={{ 
              color: "var(--accent-1)", 
              textDecoration: "none", 
              fontWeight: 600, 
              display: "flex", 
              alignItems: "center", 
              gap: "8px" 
            }}>
              {tc("lending")} <span style={{ fontSize: "18px" }}>→</span>
            </Link>
            <div style={{ 
              position: "absolute", 
              top: "-20%", 
              right: "-10%", 
              width: "200px", 
              height: "200px", 
              background: "radial-gradient(circle, rgba(124,58,237,0.1) 0%, transparent 70%)",
              zIndex: 0
            }} />
          </motion.div>

          {/* Factory Card */}
          <motion.div 
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="card" 
            style={{ padding: "48px", position: "relative", overflow: "hidden" }}
          >
            <div style={{ fontSize: "40px", marginBottom: "24px" }}>🏭</div>
            <h2 style={{ fontSize: "28px", fontWeight: 700, marginBottom: "16px", fontFamily: "'Space Grotesk', sans-serif" }}>
              {t("factory_title")}
            </h2>
            <p style={{ color: "var(--text-muted)", fontSize: "16px", lineHeight: 1.7, marginBottom: "32px" }}>
              {t("factory_desc")}
            </p>
            <Link href="/factory" style={{ 
              color: "var(--accent-1)", 
              textDecoration: "none", 
              fontWeight: 600, 
              display: "flex", 
              alignItems: "center", 
              gap: "8px" 
            }}>
              {tc("factory")} <span style={{ fontSize: "18px" }}>→</span>
            </Link>
            <div style={{ 
              position: "absolute", 
              top: "-20%", 
              right: "-10%", 
              width: "200px", 
              height: "200px", 
              background: "radial-gradient(circle, rgba(37,99,235,0.1) 0%, transparent 70%)",
              zIndex: 0
            }} />
          </motion.div>
        </section>

        {/* Stats Section */}
        <section style={{ 
          marginTop: "120px", 
          textAlign: "center",
          padding: "60px",
          background: "var(--bg-surface)",
          borderRadius: "32px",
          border: "1px solid var(--border)"
        }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "40px" }}>
            <div>
              <div style={{ fontSize: "36px", fontWeight: 800, color: "var(--text-primary)", marginBottom: "8px" }}>10k+</div>
              <div style={{ color: "var(--text-muted)", fontSize: "14px", textTransform: "uppercase", letterSpacing: "1px" }}>{t("stats_users")}</div>
            </div>
            <div>
              <div style={{ fontSize: "36px", fontWeight: 800, color: "var(--text-primary)", marginBottom: "8px" }}>$42M</div>
              <div style={{ color: "var(--text-muted)", fontSize: "14px", textTransform: "uppercase", letterSpacing: "1px" }}>{t("stats_tvl")}</div>
            </div>
            <div>
              <div style={{ fontSize: "36px", fontWeight: 800, color: "var(--text-primary)", marginBottom: "8px" }}>1.5k</div>
              <div style={{ color: "var(--text-muted)", fontSize: "14px", textTransform: "uppercase", letterSpacing: "1px" }}>{t("stats_tokens")}</div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}