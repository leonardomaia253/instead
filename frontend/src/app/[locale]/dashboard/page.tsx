"use client";

import { WalletConnectButton } from "@/components/WalletConnectButton";
import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { Link } from "@/navigation";
import { HealthGauge } from "@/components/HealthGauge";
import { PositionCardSkeleton, TokenCardSkeleton } from "@/components/Skeleton";
import { supabase, getAuditsByWallet, type GeneratedToken, type Audit, type RevenueEntitlement, type AssistedTokenDeployment, type LendingAutomationIntent, type LendingAlertEvent } from "@/lib/supabase";
import { CHAIN_META } from "@/lib/wagmi";
import { useTranslations } from "next-intl";
import { WalletHelpCard } from "@/components/ElderFriendly";
import { MetricCard, MetricGrid, PageHeader, PanelHeader, ProductShell } from "@/components/ui/Institutional";

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
  const [assistedDeployments, setAssistedDeployments] = useState<AssistedTokenDeployment[]>([]);
  const [intents, setIntents] = useState<LendingAutomationIntent[]>([]);
  const [alerts, setAlerts] = useState<LendingAlertEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [revenueAuthRequired, setRevenueAuthRequired] = useState(false);
  const [auditFilter, setAuditFilter] = useState<"all" | "lending" | "staking" | "tokens">("all");

  useEffect(() => {
    if (!address) { setLoading(false); return; }
    const wallet = address.toLowerCase();
    setRevenueAuthRequired(false);

    Promise.all([
      supabase.from("lending_positions").select("*").eq("wallet_address", wallet),
      supabase.from("generated_tokens").select("*").eq("creator_wallet", wallet).order("created_at", { ascending: false }).limit(6),
      getAuditsByWallet(wallet),
      fetch(`/api/revenue/me?wallet=${encodeURIComponent(wallet)}`).then(async (res) => {
        if (res.status === 401) return { authRequired: true, entitlements: [], assistedDeployments: [], intents: [], alerts: [] };
        return res.json();
      }).catch(() => ({ entitlements: [], assistedDeployments: [], intents: [], alerts: [] }))
    ]).then(([{ data: pos }, { data: tok }, auditData, revenueData]) => {
      setPositions((pos ?? []) as LendingPosition[]);
      setTokens((tok ?? []) as GeneratedToken[]);
      setAudits(auditData ?? []);
      setRevenueAuthRequired(Boolean(revenueData.authRequired));
      setEntitlements((revenueData.entitlements ?? []) as RevenueEntitlement[]);
      setAssistedDeployments((revenueData.assistedDeployments ?? []) as AssistedTokenDeployment[]);
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
      <ProductShell width="narrow" className="dashboard-connect">
        <PageHeader
          eyebrow="Área privada"
          title="Seu patrimônio, em uma visão"
          description="Conecte a carteira para consultar posições de crédito, ativos emitidos, alertas e histórico. A conexão apenas identifica a conta."
        />
        <div className="dashboard-connect__wallet">
          <WalletHelpCard compact />
        </div>
      </ProductShell>
    );
  }

  return (
    <ProductShell width="standard" className="dashboard-shell">

        {/* Header */}
        <PageHeader
          eyebrow={`Conta ${address?.slice(0, 6)}...${address?.slice(-4)}`}
          title="Visão patrimonial"
          description="Posições, ativos, benefícios e eventos operacionais reunidos em uma leitura verificável."
          backHref="/"
          backLabel="Início"
          action={<WalletConnectButton />}
        />

        {/* Stats Row */}
        <MetricGrid>
          <MetricCard label="Posições abertas" value={positions.length} />
          <MetricCard label="Ativos emitidos" value={totalTokens} />
          <MetricCard label="Posições em risco" value={positions.filter(p => p.health_factor < 1.2).length} tone={positions.some(p => p.health_factor < 1.2) ? "critical" : "default"} />
          <MetricCard label="Menor fator de saúde" value={lowestHF >= 999 ? "—" : lowestHF.toFixed(2)} tone={lowestHF < 1.2 ? "critical" : lowestHF < 1.5 ? "warning" : "positive"} />
        </MetricGrid>

        <div className="dashboard-ops-grid">
          <div className="card dashboard-panel">
            <PanelHeader title="Meu plano Instead" description="Planos ativos e benefícios liberados." action={<Link href="/solutions">Ver planos</Link>} />
            {revenueAuthRequired ? (
              <div className="dashboard-message" data-tone="accent">
                Entre com sua wallet para assinar a sessao e carregar planos, pagamentos e automacoes premium.
              </div>
            ) : entitlements.length === 0 ? (
              <div className="dashboard-message">
                Nenhum plano premium ativo. Ative alertas, risk shield ou Lending Pro quando quiser proteção mais robusta.
              </div>
            ) : (
              <div className="dashboard-list">
                {entitlements.map((item) => (
                  <div key={item.id} className="dashboard-list__item">
                    <div className="dashboard-list__header">
                      <strong>{item.revenue_sources?.label ?? item.source_code}</strong>
                      <span style={{ color: item.status === "active" ? "var(--green)" : "var(--text-muted)" }}>{item.status}</span>
                    </div>
                    <div className="dashboard-list__meta">
                      {item.expires_at ? `Renova/expira em ${new Date(item.expires_at).toLocaleDateString("pt-BR")}` : "Compra pontual / serviço assistido"}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card dashboard-panel">
            <PanelHeader title="Deploys assistidos" description="Ativos pagos em moeda fiduciária e executados pelo relayer." />
            {revenueAuthRequired ? (
              <div className="dashboard-message" data-tone="accent">Assine a sessão para carregar suas emissões assistidas.</div>
            ) : assistedDeployments.length === 0 ? (
              <div className="dashboard-message">Nenhuma emissão assistida em andamento.</div>
            ) : (
              <div className="dashboard-list">
                {assistedDeployments.slice(0, 5).map((deployment) => {
                  const chain = CHAIN_META[deployment.chain_id];
                  return (
                    <div key={deployment.id} className="dashboard-list__item">
                      <div className="dashboard-list__header">
                        <div>
                          <strong>{deployment.token_name} <span className="dashboard-symbol">${deployment.token_symbol}</span></strong>
                          <div className="dashboard-list__meta">{chain?.name ?? `Chain ${deployment.chain_id}`} · {new Date(deployment.created_at).toLocaleString("pt-BR")}</div>
                        </div>
                        <span className="dashboard-status" style={{ color: statusColor(deployment.status) }}>{deployment.status}</span>
                      </div>
                      {deployment.error_message && (
                        <div className="dashboard-error">{deployment.error_message}</div>
                      )}
                      <div className="dashboard-links">
                        {deployment.token_address && (
                          <Link href={`/token/${deployment.token_address}?chain=${deployment.chain_id}`}>Ver ativo</Link>
                        )}
                        {deployment.tx_hash && (
                          <a href={explorerTxUrl(deployment.chain_id, deployment.tx_hash)} target="_blank" rel="noreferrer">Ver transação</a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="card dashboard-panel">
            <PanelHeader title="Timeline operacional" description="Proteção, rebalanceamento, estratégias e solicitações B2B." />
            {revenueAuthRequired ? (
              <div className="dashboard-message" data-tone="accent">Assine a sessão para carregar a timeline.</div>
            ) : intents.length === 0 ? (
              <div className="dashboard-message">Nenhuma intenção operacional criada.</div>
            ) : (
              <div className="timeline-list">
                {intents.slice(0, 5).map((intent) => (
                  <div key={intent.id}>
                    <span style={{ background: statusColor(intent.status) }} />
                    <div>
                      <strong>{intent.revenue_sources?.label ?? intent.source_code}</strong>
                      <div>{intent.recommendation ?? "Aguardando próxima ação."}</div>
                    </div>
                    <span className="dashboard-status" style={{ color: statusColor(intent.status) }}>{intent.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card dashboard-panel">
            <PanelHeader title="Alertas de risco" description="Liquidação, proteção e recomendações operacionais." />
            {revenueAuthRequired ? (
              <div className="dashboard-message" data-tone="accent">Assine a sessão para carregar alertas privados.</div>
            ) : alerts.length === 0 ? (
              <div className="dashboard-message">Nenhum alerta recente.</div>
            ) : (
              <div className="dashboard-list">
                {alerts.slice(0, 5).map((alert) => (
                  <div key={alert.id} className="dashboard-list__item">
                    <div className="dashboard-list__header">
                      <strong className="dashboard-status" style={{ color: alertSeverityColor(alert.severity) }}>{alert.severity}</strong>
                      <span className="dashboard-list__meta">{new Date(alert.created_at).toLocaleString("pt-BR")}</span>
                    </div>
                    <div className="dashboard-list__meta">{alert.message}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="dashboard-assets-grid">
          {/* Posições de Lending */}
          <div>
            <PanelHeader title="Posições de crédito" description="Garantias, dívida e saúde por rede." action={<Link href="/lending">Nova posição</Link>} />
            {loading ? (
              <div className="dashboard-stack">
                <PositionCardSkeleton /><PositionCardSkeleton />
              </div>
            ) : positions.length === 0 ? (
              <div className="card dashboard-empty">
                Nenhuma posição aberta. <Link href="/lending">Abrir uma posição</Link>
              </div>
            ) : (
              <div className="dashboard-stack">
                {positions.map((p, i) => {
                  const hf = p.health_factor ?? 999;
                  const hfColor = hf >= 1.5 ? "#10b981" : hf >= 1.2 ? "#f59e0b" : "#ef4444";
                  const chain = CHAIN_META[p.chain_id];
                  return (
                    <div key={i} className={`card dashboard-position${p.is_liquidatable ? " dashboard-position--risk" : ""}`}>
                      {p.is_liquidatable && (
                        <div className="dashboard-risk-label">
                          Risco de liquidação
                        </div>
                      )}
                      <div className="dashboard-position__header">
                        <div>
                          <div className="dashboard-position__network">
                            {chain?.name}
                          </div>
                          <div className="dashboard-position__pair">
                            {p.borrow_asset.slice(0, 8)}... / {p.collateral_asset.slice(0, 8)}...
                          </div>
                        </div>
                        <HealthGauge healthFactor={hf} size={70} />
                      </div>
                      <div className="dashboard-position__values">
                        <div>
                          <span>Colateral</span>
                          <strong>{p.collateral_amount.toFixed(4)}</strong>
                        </div>
                        <div>
                          <span>Dívida</span>
                          <strong>{p.borrowed_amount.toFixed(4)}</strong>
                        </div>
                      </div>
                      {/* HF progress bar */}
                      <div className="dashboard-health-track">
                        <div style={{
                          width: `${Math.min(100, (hf / 3) * 100)}%`,
                          background: hfColor,
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
            <PanelHeader title="Ativos emitidos" description="Instrumentos criados e seus registros on-chain." action={<Link href="/factory">Emitir ativo</Link>} />
            {loading ? (
              <div className="dashboard-stack">
                <TokenCardSkeleton /><TokenCardSkeleton />
              </div>
            ) : tokens.length === 0 ? (
              <div className="card dashboard-empty">
                Nenhum ativo emitido. <Link href="/factory">Iniciar emissão</Link>
              </div>
            ) : (
              <div className="dashboard-stack">
                {tokens.map((t) => {
                  const chain = CHAIN_META[t.chain_id];
                  return (
                    <Link key={t.id} href={`/token/${t.token_address}?chain=${t.chain_id}`} className="dashboard-asset-link">
                      <div className="card dashboard-asset-card">
                        <div className="dashboard-asset-card__header">
                          <div>
                            <div className="dashboard-asset-card__name">{t.name}</div>
                            <div className="dashboard-symbol">${t.symbol}</div>
                          </div>
                          <div className="dashboard-asset-card__meta">
                            {chain?.name}<br />
                            {new Date(t.created_at).toLocaleDateString("pt-BR")}
                          </div>
                        </div>
                        <div className="dashboard-badges">
                          {t.mintable && <Badge color="var(--accent-2)">Mintable</Badge>}
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
        <div className="card dashboard-audit">
          <div className="dashboard-audit__header">
            <PanelHeader title="Histórico e auditoria" description="Ações on-chain registradas em ordem cronológica." />
            
            {/* Filtros */}
            <div className="dashboard-filter" role="tablist" aria-label="Filtrar histórico">
              {[
                { id: "all", label: "Todos" },
                { id: "lending", label: "Lending" },
                { id: "staking", label: "Staking" },
                { id: "tokens", label: "Tokens" }
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setAuditFilter(f.id as any)}
                  className={auditFilter === f.id ? "is-active" : ""}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="dashboard-stack">
              <PositionCardSkeleton />
            </div>
          ) : filteredAudits.length === 0 ? (
            <div className="dashboard-empty dashboard-empty--bare">
              Nenhuma atividade registrada para este filtro.
            </div>
          ) : (
            <div className="dashboard-stack">
              {filteredAudits.map((audit) => {
                const date = new Date(audit.created_at).toLocaleString("pt-BR");
                const isLending = ["DEPOSIT", "BORROW", "REPAY"].includes(audit.action);
                const isStaking = ["STAKE", "UNSTAKE", "CLAIM"].includes(audit.action);
                const actionColor = isLending ? "var(--accent-2)" : isStaking ? "var(--risk-healthy)" : "var(--text-secondary)";

                return (
                  <div key={audit.id} className="dashboard-audit-row">
                    <div className="dashboard-audit-row__main">
                      <span style={{
                        background: `${actionColor}15`, color: actionColor, borderColor: `${actionColor}30`
                      }}>
                        {audit.action}
                      </span>
                      <div>
                        <div className="dashboard-audit-row__title">
                          {audit.action === "CREATE_TOKEN" ? `Criou o token ${audit.metadata?.name || ""}` : 
                           audit.action === "STAKE" ? `Realizou stake de ${audit.metadata?.amount || ""} INST` :
                           `${audit.action === "DEPOSIT" ? "Depositou" : "Tomou"} ${audit.metadata?.amount || ""} no Lending`}
                        </div>
                        <div className="dashboard-audit-row__date">{date}</div>
                      </div>
                    </div>

                    {audit.metadata?.tx_hash && (
                      <a
                        href={`https://arbiscan.io/tx/${audit.metadata.tx_hash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="dashboard-audit-row__link"
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

    </ProductShell>
  );
}

function Badge({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <span className="dashboard-badge" style={{ background: `${color}20`, color, borderColor: `${color}30` }}>
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
  if (["executed", "active", "paid", "confirmed"].includes(status)) return "var(--green)";
  if (["failed", "cancelled"].includes(status)) return "var(--red)";
  if (["awaiting_payment", "signed", "executing", "queued"].includes(status)) return "var(--accent-1)";
  return "var(--text-muted)";
}

function alertSeverityColor(severity: string) {
  if (severity === "critical") return "var(--red)";
  if (severity === "warning") return "var(--accent-1)";
  return "var(--green)";
}

function explorerTxUrl(chainId: number, txHash: string) {
  if (chainId === 1) return `https://etherscan.io/tx/${txHash}`;
  if (chainId === 10) return `https://optimistic.etherscan.io/tx/${txHash}`;
  if (chainId === 137) return `https://polygonscan.com/tx/${txHash}`;
  if (chainId === 42161) return `https://arbiscan.io/tx/${txHash}`;
  if (chainId === 8453) return `https://basescan.org/tx/${txHash}`;
  if (chainId === 11155111) return `https://sepolia.etherscan.io/tx/${txHash}`;
  return `https://etherscan.io/tx/${txHash}`;
}
