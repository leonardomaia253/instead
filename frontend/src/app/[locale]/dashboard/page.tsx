"use client";
import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Link } from "@/navigation";
import { HealthGauge } from "@/components/HealthGauge";
import { PositionCardSkeleton, TokenCardSkeleton } from "@/components/Skeleton";
import { supabase, getAuditsByWallet, type GeneratedToken, type Audit, type RevenueEntitlement, type LendingAutomationIntent, type LendingAlertEvent } from "@/lib/supabase";
import { CHAIN_META } from "@/lib/wagmi";
import { useTranslations } from "next-intl";

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
  const [audits, setAudits] = useState<Audit[]>([]);
  const [entitlements, setEntitlements] = useState<RevenueEntitlement[]>([]);
  const [intents, setIntents] = useState<LendingAutomationIntent[]>([]);
  const [alerts, setAlerts] = useState<LendingAlertEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [auditFilter, setAuditFilter] = useState<"all" | "lending" | "staking" | "tokens">("all");

  useEffect(() => {
    if (!address) { setLoading(false); return; }
    const wallet = address.toLowerCase();

    Promise.all([
      supabase.from("lending_positions").select("*").eq("wallet_address", wallet),
      supabase.from("generated_tokens").select("*").eq("creator_wallet", wallet).order("created_at", { ascending: false }).limit(6),
      getAuditsByWallet(wallet),
      fetch(`/api/revenue/me?wallet=${encodeURIComponent(wallet)}`).then((res) => res.json()).catch(() => ({ entitlements: [], intents: [] }))
    ]).then(([{ data: pos }, { data: tok }, auditData, revenueData]) => {
      setPositions((pos ?? []) as LendingPosition[]);
      setTokens((tok ?? []) as GeneratedToken[]);
      setAudits(auditData ?? []);
      setEntitlements((revenueData.entitlements ?? []) as RevenueEntitlement[]);
      setIntents((revenueData.intents ?? []) as LendingAutomationIntent[]);
      setAlerts((revenueData.alerts ?? []) as LendingAlertEvent[]);
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

  const filteredAudits = audits.filter(audit => {
    if (auditFilter === "all") return true;
    if (auditFilter === "lending") return ["DEPOSIT", "BORROW", "REPAY"].includes(audit.action);
    if (auditFilter === "staking") return ["STAKE", "UNSTAKE", "CLAIM"].includes(audit.action);
    if (auditFilter === "tokens") return ["CREATE_TOKEN"].includes(audit.action);
    return true;
  });

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
    <main style={{ minHeight: "100vh", padding: "32px clamp(16px, 5vw, 24px)" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 36, flexWrap: "wrap", gap: 16 }}>
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
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 200px), 1fr))", gap: 16, marginBottom: 36 }}>
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

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))", gap: 24, marginBottom: 40 }}>
          <div className="card" style={{ padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", marginBottom: 16 }}>
              <div>
                <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 20, margin: 0 }}>Meu plano Instead</h2>
                <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 6 }}>Produtos premium ativos e benefícios liberados.</p>
              </div>
              <Link href="/lending" style={{ color: "var(--accent-1)", textDecoration: "none", fontSize: 13 }}>Upgrade</Link>
            </div>
            {entitlements.length === 0 ? (
              <div style={{ color: "var(--text-muted)", fontSize: 14 }}>
                Nenhum plano premium ativo. Ative alertas, risk shield ou Lending Pro quando quiser proteção mais robusta.
              </div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {entitlements.map((item) => (
                  <div key={item.id} style={{ border: "1px solid var(--border)", padding: 14, background: "rgba(255,255,255,0.02)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                      <strong>{item.revenue_sources?.label ?? item.source_code}</strong>
                      <span style={{ color: item.status === "active" ? "var(--green)" : "var(--text-muted)", fontWeight: 800 }}>{item.status}</span>
                    </div>
                    <div style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 6 }}>
                      {item.expires_at ? `Renova/expira em ${new Date(item.expires_at).toLocaleDateString("pt-BR")}` : "Compra pontual / serviço assistido"}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card" style={{ padding: 24 }}>
            <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 20, margin: 0 }}>Timeline operacional</h2>
            <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 6, marginBottom: 16 }}>Deleverage, rebalance, risk shield, estratégias e solicitações B2B.</p>
            {intents.length === 0 ? (
              <div style={{ color: "var(--text-muted)", fontSize: 14 }}>Nenhuma intenção premium criada ainda.</div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {intents.slice(0, 5).map((intent) => (
                  <div key={intent.id} style={{ display: "grid", gridTemplateColumns: "12px 1fr auto", gap: 12, alignItems: "start" }}>
                    <span style={{ width: 10, height: 10, borderRadius: 99, background: statusColor(intent.status), marginTop: 5 }} />
                    <div>
                      <strong style={{ fontSize: 14 }}>{intent.revenue_sources?.label ?? intent.source_code}</strong>
                      <div style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 4 }}>{intent.recommendation ?? "Aguardando próxima ação."}</div>
                    </div>
                    <span style={{ fontSize: 11, color: statusColor(intent.status), fontWeight: 800, textTransform: "uppercase" }}>{intent.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card" style={{ padding: 24 }}>
            <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 20, margin: 0 }}>Alertas de risco</h2>
            <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 6, marginBottom: 16 }}>Liquidação, risk shield e recomendações geradas por automação.</p>
            {alerts.length === 0 ? (
              <div style={{ color: "var(--text-muted)", fontSize: 14 }}>Nenhum alerta recente.</div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {alerts.slice(0, 5).map((alert) => (
                  <div key={alert.id} style={{ border: "1px solid var(--border)", padding: 12, background: "rgba(255,255,255,0.02)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                      <strong style={{ color: alertSeverityColor(alert.severity), textTransform: "uppercase", fontSize: 12 }}>{alert.severity}</strong>
                      <span style={{ color: "var(--text-muted)", fontSize: 11 }}>{new Date(alert.created_at).toLocaleString("pt-BR")}</span>
                    </div>
                    <div style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 6, lineHeight: 1.45 }}>{alert.message}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))", gap: 24, marginBottom: 40 }}>
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
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12, gap: 12, flexWrap: "wrap" }}>
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
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
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

        {/* Histórico de Atividades e Auditoria */}
        <div className="card" style={{ padding: 32 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 16 }}>
            <div>
              <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 22, fontWeight: 700 }}>🛡️ Histórico de Atividades & Auditoria</h2>
              <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 4 }}>Todas as suas ações on-chain registradas e auditadas com segurança.</p>
            </div>
            
            {/* Filtros */}
            <div style={{ display: "flex", gap: 8, background: "var(--bg-surface)", padding: 4, borderRadius: 10, flexWrap: "wrap", width: "min(100%, max-content)" }}>
              {[
                { id: "all", label: "Todos" },
                { id: "lending", label: "Lending" },
                { id: "staking", label: "Staking" },
                { id: "tokens", label: "Tokens" }
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setAuditFilter(f.id as any)}
                  style={{
                    background: auditFilter === f.id ? "var(--accent-grad)" : "transparent",
                    color: auditFilter === f.id ? "white" : "var(--text-muted)",
                    border: "none", borderRadius: 8, padding: "6px 14px",
                    fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.15s"
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <PositionCardSkeleton />
            </div>
          ) : filteredAudits.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-muted)", fontSize: 14 }}>
              Nenhuma atividade registrada para este filtro.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {filteredAudits.map((audit) => {
                const date = new Date(audit.created_at).toLocaleString("pt-BR");
                const isLending = ["DEPOSIT", "BORROW", "REPAY"].includes(audit.action);
                const isStaking = ["STAKE", "UNSTAKE", "CLAIM"].includes(audit.action);
                const actionColor = isLending ? "#3b82f6" : isStaking ? "#10b981" : "#7c3aed";

                return (
                  <div key={audit.id} style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "16px 20px", background: "rgba(255,255,255,0.015)",
                    border: "1px solid var(--border)", borderRadius: 12, flexWrap: "wrap", gap: 12
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", minWidth: 0 }}>
                      <span style={{
                        fontSize: 11, fontWeight: 800, padding: "4px 10px", borderRadius: 6,
                        background: `${actionColor}15`, color: actionColor, textTransform: "uppercase"
                      }}>
                        {audit.action}
                      </span>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>
                          {audit.action === "CREATE_TOKEN" ? `Criou o token ${audit.metadata?.name || ""}` : 
                           audit.action === "STAKE" ? `Realizou stake de ${audit.metadata?.amount || ""} INST` :
                           `${audit.action === "DEPOSIT" ? "Depositou" : "Tomou"} ${audit.metadata?.amount || ""} no Lending`}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{date}</div>
                      </div>
                    </div>

                    {audit.metadata?.tx_hash && (
                      <a
                        href={`https://arbiscan.io/tx/${audit.metadata.tx_hash}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          fontSize: 12, color: "var(--accent-1)", textDecoration: "none",
                          fontWeight: 600, background: "rgba(124,58,237,0.08)",
                          padding: "6px 12px", borderRadius: 8, border: "1px solid rgba(124,58,237,0.15)"
                        }}
                      >
                        Ver Transação ↗
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          )}
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

function statusColor(status: string) {
  if (["executed", "active", "paid"].includes(status)) return "var(--green)";
  if (["failed", "cancelled"].includes(status)) return "var(--red)";
  if (["awaiting_payment", "signed"].includes(status)) return "var(--accent-1)";
  return "var(--text-muted)";
}

function alertSeverityColor(severity: string) {
  if (severity === "critical") return "var(--red)";
  if (severity === "warning") return "var(--accent-1)";
  return "var(--green)";
}
