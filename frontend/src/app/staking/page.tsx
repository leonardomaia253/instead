"use client";

import React, { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { motion } from "framer-motion";
import { useAccount } from "wagmi";
import { 
  Zap, 
  Coins, 
  TrendingUp, 
  ShieldCheck, 
  Clock, 
  ArrowRightLeft,
  Info,
  ChevronRight,
  Loader2
} from "lucide-react";
import { 
  getStakingPools, 
  getPlatformStats, 
  insertAudit, 
  type StakingPool, 
  type PlatformStat 
} from "@/lib/supabase";

// Mapper para ícones do Lucide baseado no banco de dados
const IconMapper: Record<string, React.ReactNode> = {
  "Coins": <Coins className="w-8 h-8 text-blue-500" />,
  "Zap": <Zap className="w-8 h-8 text-purple-500" />,
  "TrendingUp": <TrendingUp className="w-8 h-8 text-green-500" />
};

export default function StakingPage() {
  const { address, isConnected } = useAccount();
  const [pools, setPools] = useState<StakingPool[]>([]);
  const [stats, setStats] = useState<PlatformStat[]>([]);
  const [selectedPool, setSelectedPool] = useState<StakingPool | null>(null);
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [poolsData, statsData] = await Promise.all([
          getStakingPools(),
          getPlatformStats()
        ]);
        setPools(poolsData);
        setStats(statsData);
        if (poolsData.length > 0) setSelectedPool(poolsData[1] || poolsData[0]);
      } catch (error) {
        console.error("Erro ao carregar dados de staking:", error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleStake = async () => {
    if (!address || !selectedPool || !amount) return;
    
    setIsSubmitting(true);
    try {
      // Simulação de transação on-chain seguida de auditoria
      await new Promise(r => setTimeout(r, 1500));
      
      await insertAudit({
        user_wallet: address,
        action: "STAKE",
        metadata: {
          pool_id: selectedPool.id,
          pool_name: selectedPool.name,
          amount: amount,
          symbol: "INST"
        }
      });
      
      alert(`Stake de ${amount} INST realizado com sucesso no pool ${selectedPool.name}! (Auditado no Supabase)`);
      setAmount("");
    } catch (error) {
      console.error("Erro ao realizar stake:", error);
      alert("Erro ao realizar stake. Verifique o console.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStat = (key: string) => stats.find(s => s.key === key)?.value || "---";

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-base)" }}>
        <Loader2 className="w-12 h-12 text-purple-500 animate-spin" />
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "var(--bg-base)" }}>
      <Navbar />
      
      <main className="container" style={{ flex: 1, padding: "120px 24px" }}>
        {/* Hero Section */}
        <section style={{ textAlign: "center", marginBottom: 80 }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span style={styles.badge}>Dê utilidade aos seus ativos</span>
            <h1 className="gradient-text" style={styles.heroTitle}>
              Instead Staking
            </h1>
            <p style={styles.heroSubtitle}>
              Ajude a garantir a liquidez do protocolo e receba recompensas em tempo real. 
              Sua estratégia, seu rendimento.
            </p>
          </motion.div>
        </section>

        {/* Stats Grid */}
        <div style={styles.statsGrid}>
          <StatCard icon={<Coins className="w-5 h-5" />} label="Total Value Locked" value={getStat("total_value_locked")} />
          <StatCard icon={<TrendingUp className="w-5 h-5" />} label="Average APR" value={getStat("average_apr")} />
          <StatCard icon={<ShieldCheck className="w-5 h-5" />} label="Protocol Security" value={getStat("protocol_security")} />
        </div>

        <div style={styles.mainGrid}>
          {/* Pools Sidebar */}
          <section style={{ gridColumn: pools.length > 0 ? "span 2" : "span 3" }}>
            <h3 style={styles.sectionTitle}>Escolha seu Pool</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {pools.map((pool) => (
                <button 
                  key={pool.id}
                  onClick={() => setSelectedPool(pool)}
                  style={{
                    ...styles.poolCard,
                    borderColor: selectedPool?.id === pool.id ? pool.color : "var(--border)",
                    background: selectedPool?.id === pool.id ? `${pool.color}08` : "var(--bg-card)"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 20, flex: 1 }}>
                    <div style={styles.poolIconWrapper}>{IconMapper[pool.icon_name] || <Coins className="w-8 h-8" />}</div>
                    <div style={{ textAlign: "left" }}>
                      <h4 style={styles.poolName}>{pool.name}</h4>
                      <p style={styles.poolDesc}>{pool.description}</p>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ ...styles.poolApr, color: pool.color }}>{pool.apr} APR</div>
                    <div style={styles.poolTvl}>TVL: {pool.tvl}</div>
                  </div>
                  <ChevronRight 
                    className="w-5 h-5 text-gray-500" 
                    style={{ 
                      marginLeft: 10,
                      transform: selectedPool?.id === pool.id ? "rotate(90deg)" : "none",
                      transition: "transform 0.3s"
                    }} 
                  />
                </button>
              ))}
            </div>
          </section>

          {/* Staking Form */}
          {selectedPool && (
            <section style={{ gridColumn: "span 1" }}>
              <div className="card" style={styles.stakingCard}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
                  <div style={{ ...styles.formHeaderIcon, background: selectedPool.color }}>
                    {IconMapper[selectedPool.icon_name]}
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 18, color: "white" }}>Stake em {selectedPool.name}</h3>
                    <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Token: $INST</span>
                  </div>
                </div>

                <div style={styles.inputWrapper}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Quantidade</span>
                    <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Saldo: 0.00 INST</span>
                  </div>
                  <div style={styles.inputContainer}>
                    <input 
                      type="number" 
                      placeholder="0.0" 
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      style={styles.input} 
                    />
                    <button style={styles.maxBtn}>MAX</button>
                  </div>
                </div>

                <div style={styles.infoBox}>
                  <div style={styles.infoRow}>
                    <span>Rendimento Estimado</span>
                    <span style={{ color: "var(--green)" }}>+ {(parseFloat(amount || "0") * parseFloat(selectedPool.apr) / 100).toFixed(2)} INST/ano</span>
                  </div>
                  <div style={styles.infoRow}>
                    <span>Período de Lock</span>
                    <span>{selectedPool.lock_period}</span>
                  </div>
                  <div style={styles.infoRow}>
                    <span>Taxa de Saída</span>
                    <span>0.5%</span>
                  </div>
                </div>

                <button 
                  className="btn-primary" 
                  onClick={handleStake}
                  disabled={!isConnected || !amount || isSubmitting}
                  style={{ width: "100%", marginTop: 24, padding: "16px", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
                >
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Aprovar & Depositar"}
                </button>

                {!isConnected && (
                  <p style={{ textAlign: "center", fontSize: 12, color: "#ef4444", marginTop: 12 }}>
                    Conecte sua carteira para realizar stake.
                  </p>
                )}

                <p style={{ textAlign: "center", fontSize: 11, color: "var(--text-muted)", marginTop: 16 }}>
                  <Info className="w-3 h-3 inline mr-1" />
                  Ao fazer o staking, você concorda com os riscos de custódia em smart contracts. Todas as ações são auditadas.
                </p>
              </div>
            </section>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="card" style={styles.statCard}>
      <div style={styles.statIcon}>{icon}</div>
      <div>
        <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 4 }}>{label}</div>
        <div style={{ fontSize: 24, fontWeight: 700, color: "white" }}>{value}</div>
      </div>
    </div>
  );
}

const styles = {
  heroTitle: { 
    fontSize: "clamp(32px, 5vw, 56px)", 
    fontWeight: 800, 
    fontFamily: "'Space Grotesk', sans-serif",
    marginTop: 12
  },
  heroSubtitle: {
    color: "var(--text-muted)",
    fontSize: 18,
    maxWidth: 600,
    margin: "20px auto 0",
    lineHeight: 1.6
  },
  badge: {
    background: "rgba(124,58,237,0.1)",
    color: "var(--accent-1)",
    padding: "6px 16px",
    borderRadius: "100px",
    fontSize: 13,
    fontWeight: 700,
    textTransform: "uppercase" as const,
    letterSpacing: 1.5
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: 24,
    marginBottom: 60
  },
  statCard: {
    display: "flex",
    alignItems: "center",
    gap: 20,
    padding: "24px 32px"
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    background: "rgba(255,255,255,0.03)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "var(--accent-1)"
  },
  mainGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
    gap: 40,
    alignItems: "start"
  },
  sectionTitle: {
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: 22,
    fontWeight: 700,
    marginBottom: 24,
    color: "white"
  },
  poolCard: {
    width: "100%",
    padding: "24px",
    borderRadius: 20,
    border: "2px solid var(--border)",
    display: "flex",
    alignItems: "center",
    cursor: "pointer",
    transition: "all 0.2s ease"
  },
  poolIconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 16,
    background: "rgba(0,0,0,0.2)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  },
  poolName: { fontSize: 18, fontWeight: 700, color: "white", marginBottom: 4 },
  poolDesc: { fontSize: 13, color: "var(--text-muted)" },
  poolApr: { fontSize: 20, fontWeight: 800, marginBottom: 4 },
  poolTvl: { fontSize: 12, color: "var(--text-muted)" },
  stakingCard: {
    padding: 32,
    background: "var(--bg-surface)",
    position: "relative" as const
  },
  formHeaderIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 8,
    color: "white"
  },
  inputWrapper: {
    marginTop: 24
  },
  inputContainer: {
    position: "relative" as const,
    display: "flex",
    alignItems: "center"
  },
  input: {
    width: "100%",
    padding: "16px",
    paddingRight: 80,
    fontSize: 20,
    fontWeight: 700,
    background: "rgba(0,0,0,0.2)"
  },
  maxBtn: {
    position: "absolute" as const,
    right: 12,
    background: "var(--accent-1)",
    border: "none",
    borderRadius: 8,
    color: "white",
    fontSize: 10,
    fontWeight: 800,
    padding: "6px 10px",
    cursor: "pointer"
  },
  infoBox: {
    marginTop: 24,
    padding: "16px",
    background: "rgba(255,255,255,0.02)",
    borderRadius: 16,
    display: "flex",
    flexDirection: "column" as const,
    gap: 12
  },
  infoRow: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: 13,
    color: "var(--text-muted)"
  }
};
