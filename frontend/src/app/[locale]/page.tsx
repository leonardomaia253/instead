"use client";

import React, { useEffect, useRef } from "react";
import { Link } from "@/navigation";
import { motion, useScroll, useTransform } from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/dist/ScrollTrigger";
import dynamic from "next/dynamic";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { CHAIN_META } from "@/lib/wagmi";
import { getPlatformStats, type PlatformStat } from "@/lib/supabase";
import { useTranslations } from "next-intl";

const HealthGauge = dynamic(() => import("@/components/HealthGauge").then(mod => mod.HealthGauge), { ssr: false });
const Scene3D = dynamic(() => import("@/components/Scene3D"), { ssr: false });

gsap.registerPlugin(ScrollTrigger);

const fadeIn = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] }
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

export default function Home() {
  const t = useTranslations("Index");
  const common = useTranslations("Common");
  const statsRef = useRef(null);
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll();
  const opacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.2], [1, 0.95]);
  const [platformStats, setPlatformStats] = React.useState<PlatformStat[]>([]);

  useEffect(() => {
    async function loadStats() {
      try {
        const stats = await getPlatformStats();
        setPlatformStats(stats);
      } catch (error) {
        console.error("Erro ao carregar stats:", error);
      }
    }
    loadStats();

    // GSAP Animation for stats
    const ctx = gsap.context(() => {
      gsap.from(".stat-item", {
        scrollTrigger: {
          trigger: statsRef.current,
          start: "top 80%",
        },
        y: 50,
        opacity: 0,
        duration: 1,
        stagger: 0.2,
        ease: "power4.out"
      });
    }, statsRef);

    return () => ctx.revert();
  }, []);

  const getStat = (key: string, defaultValue: string) => 
    platformStats.find(s => s.key === key)?.value || defaultValue;

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "var(--bg-base)" }}>
      <Navbar />

      <main style={{ flex: 1 }}>
        {/* Hero Section */}
        <section className="hero" style={{ 
          padding: "160px 24px 100px", 
          textAlign: "center", 
          position: "relative",
          overflow: "hidden",
          minHeight: "90vh",
          display: "flex",
          alignItems: "center"
        }}>
          <Scene3D />
          
          <motion.div 
            className="container" 
            style={{ position: "relative", zIndex: 1, maxWidth: 900, opacity, scale }}
            initial="initial"
            animate="animate"
            variants={staggerContainer}
          >
            <motion.span 
              className="badge-premium" 
              style={{ marginBottom: 32 }}
              variants={fadeIn}
            >
              ✨ Nova Era do DeFi Multinível & Tokenização
            </motion.span>
            
            <motion.h1 
              style={{ 
                fontSize: "clamp(44px, 10vw, 84px)", 
                lineHeight: 1, 
                fontWeight: 800, 
                marginBottom: 32,
                fontFamily: "'Space Grotesk', sans-serif",
                letterSpacing: "-0.03em"
              }}
              variants={fadeIn}
            >
              {t("title").split("|")[0]} <br />
              <span className="gradient-text">Sem Complicação.</span>
            </motion.h1>
            
            <motion.p 
              style={{ 
                fontSize: "clamp(18px, 4vw, 22px)", 
                color: "var(--text-muted)", 
                maxWidth: 700, 
                margin: "0 auto 48px",
                lineHeight: 1.6
              }}
              variants={fadeIn}
            >
              {t("description")}
            </motion.p>

            <motion.div 
              style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}
              variants={fadeIn}
            >
              <Link href="/lending" className="btn-primary" style={{ padding: "18px 48px", fontSize: 18, textDecoration: "none" }}>
                {common("lending")}
              </Link>
              <Link href="/factory" className="btn-outline glass-morphism" style={{ padding: "18px 48px", fontSize: 18, textDecoration: "none" }}>
                {common("factory")}
              </Link>
            </motion.div>
          </motion.div>

          <div style={{
            position: "absolute", bottom: 0, left: 0, right: 0, height: "150px",
            background: "linear-gradient(to top, var(--bg-base), transparent)",
            zIndex: 1
          }} />
        </section>

        {/* Stats Bar */}
        <div ref={statsRef} className="stats-bar glass-morphism" style={{
          display: "flex", justifyContent: "center", gap: "clamp(40px, 8vw, 100px)", padding: "48px 40px",
          borderLeft: "none", borderRight: "none",
          flexWrap: "wrap", position: "relative", zIndex: 10,
          marginTop: -20
        }}>
          {[
            { label: "TVL Total", value: getStat("total_value_locked", "$4.2M+") },
            { label: "Tokens Criados", value: getStat("tokens_created", "1,240+") },
            { label: "Taxas Economizadas", value: getStat("fees_saved", "$850K") },
            { label: "Redes Ativas", value: getStat("active_networks", "7+") }
          ].map((s, i) => (
            <div key={i} className="stat-item" style={{ textAlign: "center" }}>
              <div style={{ fontSize: 32, fontWeight: 800, color: "var(--text-primary)", fontFamily: "'Space Grotesk', sans-serif" }}>{s.value}</div>
              <div style={{ fontSize: 13, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1.5, marginTop: 4, fontWeight: 600 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Features Blocks */}
        <section style={{ padding: "120px 24px", position: "relative" }}>
          <div className="container">
            <motion.div 
              className="md-grid-2"
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              {/* Lending Card */}
              <div className="card-premium">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32 }}>
                  <div>
                    <div style={{ fontSize: 44, marginBottom: 20 }}>🏦</div>
                    <h2 style={{ fontSize: 26, fontWeight: 700, marginBottom: 14, fontFamily: "'Space Grotesk', sans-serif" }}>{common("lending")}</h2>
                    <p style={{ color: "var(--text-muted)", fontSize: 16, lineHeight: 1.6 }}>
                      Deposite ativos Bluechip ou seus próprios tokens como colateral e retire liquidez imediata com taxas dinâmicas.
                    </p>
                  </div>
                  <HealthGauge healthFactor={1.85} size={110} />
                </div>
                <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 14, marginBottom: 40 }}>
                  {["LTV máximo de 70%", "Juros dinâmicos por utilização", "Simulador de liquidação integrado"].map(item => (
                    <li key={item} style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 15 }}>
                      <span style={{ color: "var(--green)", fontWeight: "bold" }}>✓</span> {item}
                    </li>
                  ))}
                </ul>
                <Link href="/lending" className="btn-outline" style={{ display: "block", textDecoration: "none" }}>Pools</Link>
              </div>

              {/* Factory Card */}
              <div className="card-premium">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32 }}>
                  <div>
                    <div style={{ fontSize: 44, marginBottom: 20 }}>🏭</div>
                    <h2 style={{ fontSize: 26, fontWeight: 700, marginBottom: 14, fontFamily: "'Space Grotesk', sans-serif" }}>{common("factory")}</h2>
                    <p style={{ color: "var(--text-muted)", fontSize: 16, lineHeight: 1.6 }}>
                      A maneira mais rápida de lançar seu projeto. Deploy em múltiplas chains simultâneas com funcionalidades avançadas.
                    </p>
                  </div>
                </div>
                
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 32 }}>
                  {Object.values(CHAIN_META).slice(0, 5).map(c => (
                    <div key={c.name} className="chain-tag" title={c.name}>{c.icon}</div>
                  ))}
                  <div className="chain-tag" style={{ fontSize: 14, fontWeight: 700 }}>+2</div>
                </div>

                <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 14, marginBottom: 40 }}>
                  {["Deploy instantâneo sem código", "Mintable, Burnable & Taxable", "Auditoria on-chain inclusa"].map(item => (
                    <li key={item} style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 15 }}>
                      <span style={{ color: "var(--green)", fontWeight: "bold" }}>✓</span> {item}
                    </li>
                  ))}
                </ul>
                <Link href="/factory" className="btn-outline" style={{ display: "block", textDecoration: "none" }}>{common("factory")}</Link>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Robustness: Trust & Security Section */}
        <section style={{ padding: "80px 24px", background: "rgba(255,255,255,0.01)", borderTop: "1px solid var(--border)" }}>
           <div className="container">
              <div className="md-grid-4">
                 {[
                   { icon: "🛡️", title: "Security First", desc: "Smart contracts auditados e multi-sig treasury." },
                   { icon: "⚡", title: "Fast Execution", desc: "Liquidez instantânea e deploys em segundos." },
                   { icon: "💎", title: "DeFi Yields", desc: "Maximize seus ganhos com taxas dinâmicas." },
                   { icon: "🌍", title: "Multi-Chain", desc: "Arbitrum, Polygon, BSC, Base e muito mais." }
                 ].map((feat, i) => (
                   <motion.div 
                     key={i} 
                     className="card" 
                     style={{ padding: 24 }}
                     initial={{ opacity: 0, scale: 0.9 }}
                     whileInView={{ opacity: 1, scale: 1 }}
                     viewport={{ once: true }}
                     transition={{ delay: i * 0.1, duration: 0.5 }}
                   >
                      <div style={{ fontSize: 32, marginBottom: 16 }}>{feat.icon}</div>
                      <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{feat.title}</h3>
                      <p style={{ fontSize: 14, color: "var(--text-muted)", lineHeight: 1.5 }}>{feat.desc}</p>
                   </motion.div>
                 ))}
              </div>
           </div>
        </section>

        {/* Dynamic Networks Ticker */}
        <section style={{ padding: "60px 0", background: "rgba(124,58,237,0.03)", overflow: "hidden" }}>
          <div className="ticker-wrapper">
             <div className="ticker">
                {Array(4).fill(Object.values(CHAIN_META)).flat().map((c, i) => (
                   <div key={i} className="ticker-item">
                    {c.icon} <span>{c.name}</span>
                  </div>
                ))}
             </div>
          </div>
        </section>
      </main>

      <Footer />

      <style jsx>{`
        .badge-premium {
          display: inline-block;
          padding: 8px 18px;
          background: rgba(124,58,237,0.08);
          border: 1px solid rgba(124,58,237,0.2);
          border-radius: 999px;
          color: var(--accent-1);
          font-size: 14px;
          font-weight: 600;
          letter-spacing: 0.5px;
        }

        .card-premium {
          background: linear-gradient(180deg, var(--bg-card) 0%, rgba(19,29,53,0.7) 100%);
          border: 1px solid var(--border);
          border-radius: 28px;
          padding: 48px;
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          position: relative;
          overflow: hidden;
        }
        .card-premium::before {
          content: "";
          position: absolute;
          top: 0; left: 0; right: 0; height: 1px;
          background: linear-gradient(90deg, transparent, rgba(124,58,237,0.3), transparent);
        }
        .card-premium:hover {
          border-color: rgba(124,58,237,0.4);
          transform: translateY(-10px);
          box-shadow: 0 30px 60px rgba(0,0,0,0.5);
        }

        .chain-tag {
          width: 40px;
          height: 40px;
          background: var(--bg-surface);
          border: 1px solid var(--border);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          transition: all 0.2s ease;
        }
        .chain-tag:hover {
          border-color: var(--accent-1);
          background: rgba(124,58,237,0.1);
          transform: scale(1.1);
        }

        .ticker-wrapper { width: 100%; display: flex; }
        .ticker { display: flex; gap: 60px; animation: ticker 50s linear infinite; white-space: nowrap; }
        .ticker-item { display: flex; alignItems: center; gap: 12px; font-weight: 600; color: var(--text-muted); font-size: 16px; opacity: 0.6; transition: opacity 0.3s; }
        .ticker-item:hover { opacity: 1; color: var(--text-primary); }
        
        @keyframes ticker {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }

        @media (max-width: 768px) {
          .card-premium { padding: 32px 24px; }
        }
      `}</style>
    </div>
  );
}
