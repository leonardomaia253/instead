"use client";
import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import Link from "next/link";
import { HealthGauge } from "@/components/HealthGauge";
import { PositionCardSkeleton, TokenCardSkeleton } from "@/components/Skeleton";
import { supabase, type GeneratedToken } from "@/lib/supabase";
import { CHAIN_META } from "@/lib/wagmi";

type LendingPosition = {
  collateral_asset: string;
  borrow_asset: string;
  collateral_amount: number;
  borrowed_amount: number;
  health_factor: number;
  chain_id: number;
  is_liquidatable: boolean;
};

export default function DashboardPage() {
  const { isConnected, address } = useAccount();
  const [positions, setPositions] = useState<LendingPosition[]>([]);
  const [tokens, setTokens] = useState<GeneratedToken[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!address) { setLoading(false); return; }
    const wallet = address.toLowerCase();

    Promise.all([
      supabase.from("lending_positions").select("*").eq("wallet_address", wallet),
      supabase.from("generated_tokens").select("*").eq("creator_wallet", wallet).order("created_at", { ascending: false }).limit(6),
    ]).then(([{ data: pos }, { data: tok }]) => {
      setPositions((pos ?? []) as LendingPosition[]);
      setTokens((tok ?? []) as GeneratedToken[]);
      setLoading(false);
    });

    // Realtime: escuta mudanças em lending_positions
    const channel = supabase
      .channel("dashboard-positions")
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "lending_positions",
        filter: `wallet_address=eq.${wallet}`,
      }, (payload: any) => {
        setPositions((prev) =>
          prev.map((p) => p.borrow_asset === (payload.new as LendingPosition).borrow_asset ? (payload.new as LendingPosition) : p)
        );
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [address]);

  const lowestHF = positions.reduce((min, p) => Math.min(min, p.health_factor ?? 999), 999);
  const totalTokens = tokens.length;

  if (!isConnected) {
    return (
      <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 24 }}>
        <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 28, textAlign: "center" }}>
          Conecte sua carteira para ver o dashboard
        </h1>
        <ConnectButton />
      </main>
    );
  }

  return (
    <main style={{ minHeight: "100vh", padding: "32px 24px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 36 }}>
          <div>
            <Link href="/" style={{ color: "var(--text-muted)", fontSize: 13, textDecoration: "none" }}>← Início</Link>
            <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 28, fontWeight: 700, marginTop: 8 }}>
              📊 Dashboard
            </h1>
            <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 4 }}>
              {address?.slice(0, 6)}...{address?.slice(-4)}
            </p>
          </div>
          <ConnectButton />
        </div>

        {/* Stats Row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 36 }}>
          {[
            { label: "Posições Abertas", value: positions.length, icon: "🏦" },
            { label: "Tokens Criados", value: totalTokens, icon: "🏭" },
            { label: "Posições em Risco", value: positions.filter(p => p.health_factor < 1.2).length, icon: "⚠️" },
          ].map((s) => (
            <div key={s.label} className="card" style={{ textAlign: "center" }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>{s.icon}</div>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 32, fontWeight: 700 }}>{s.value}</div>
              <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
          {/* Health Factor Gauge Card */}
          <div className="card" style={{ textAlign: "center" }}>
            <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 8 }}>Health Factor Mínimo</div>
            <HealthGauge healthFactor={lowestHF} size={120} />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          {/* Posições de Lending */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 20, fontWeight: 700 }}>Posições de Lending</h2>
              <Link href="/lending" style={{ fontSize: 13, color: "var(--accent-1)", textDecoration: "none" }}>+ Nova posição</Link>
            </div>
            {loading ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <PositionCardSkeleton /><PositionCardSkeleton />
              </div>
            ) : positions.length === 0 ? (
              <div className="card" style={{ textAlign: "center", padding: "40px 24px", color: "var(--text-muted)" }}>
                Nenhuma posição aberta. <Link href="/lending" style={{ color: "var(--accent-1)" }}>Começar agora</Link>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {positions.map((p, i) => {
                  const hf = p.health_factor ?? 999;
                  const hfColor = hf >= 1.5 ? "#10b981" : hf >= 1.2 ? "#f59e0b" : "#ef4444";
                  const chain = CHAIN_META[p.chain_id];
                  return (
                    <div key={i} className="card" style={{ borderColor: p.is_liquidatable ? "rgba(239,68,68,0.4)" : undefined }}>
                      {p.is_liquidatable && (
                        <div style={{ color: "#ef4444", fontSize: 12, fontWeight: 700, marginBottom: 8 }}>
                          🚨 RISCO DE LIQUIDAÇÃO
                        </div>
                      )}
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 700 }}>
                            {chain?.icon} {chain?.name}
                          </div>
                          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                            {p.borrow_asset.slice(0, 8)}... / {p.collateral_asset.slice(0, 8)}...
                          </div>
                        </div>
                        <HealthGauge healthFactor={hf} size={70} />
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 13 }}>
                        <div>
                          <div style={{ color: "var(--text-muted)" }}>Colateral</div>
                          <div style={{ fontWeight: 600 }}>{p.collateral_amount.toFixed(4)}</div>
                        </div>
                        <div>
                          <div style={{ color: "var(--text-muted)" }}>Dívida</div>
                          <div style={{ fontWeight: 600 }}>{p.borrowed_amount.toFixed(4)}</div>
                        </div>
                      </div>
                      {/* HF progress bar */}
                      <div style={{ marginTop: 12, height: 6, borderRadius: 999, background: "var(--border)", overflow: "hidden" }}>
                        <div style={{
                          width: `${Math.min(100, (hf / 3) * 100)}%`,
                          height: "100%", background: hfColor, borderRadius: 999,
                          transition: "width 0.5s",
                        }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Tokens Criados */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 20, fontWeight: 700 }}>Meus Tokens</h2>
              <Link href="/factory" style={{ fontSize: 13, color: "var(--accent-1)", textDecoration: "none" }}>+ Criar token</Link>
            </div>
            {loading ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <TokenCardSkeleton /><TokenCardSkeleton />
              </div>
            ) : tokens.length === 0 ? (
              <div className="card" style={{ textAlign: "center", padding: "40px 24px", color: "var(--text-muted)" }}>
                Nenhum token criado ainda. <Link href="/factory" style={{ color: "var(--accent-1)" }}>Criar meu primeiro token</Link>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {tokens.map((t) => {
                  const chain = CHAIN_META[t.chain_id];
                  return (
                    <Link key={t.id} href={`/token/${t.token_address}?chain=${t.chain_id}`} style={{ textDecoration: "none" }}>
                      <div className="card" style={{ cursor: "pointer" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 16 }}>{t.name}</div>
                            <div style={{ color: "var(--accent-1)", fontSize: 13, fontWeight: 600 }}>${t.symbol}</div>
                          </div>
                          <div style={{ fontSize: 12, color: "var(--text-muted)", textAlign: "right" }}>
                            {chain?.icon} {chain?.name}<br />
                            {new Date(t.created_at).toLocaleDateString("pt-BR")}
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                          {t.mintable && <Badge color="#7c3aed">Mintable</Badge>}
                          <Badge color="#64748b">Supply: {formatNum(t.initial_supply)}</Badge>
                          <Badge color="#334155">Chain {t.chain_id}</Badge>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

function Badge({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, padding: "3px 10px",
      borderRadius: 999, background: `${color}20`, color, border: `1px solid ${color}30`,
    }}>
      {children}
    </span>
  );
}

function formatNum(n: number) {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return String(n);
}
