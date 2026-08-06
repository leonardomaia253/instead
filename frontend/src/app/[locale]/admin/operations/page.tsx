"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, AlertTriangle, CheckCircle2, RefreshCw, RotateCcw, ShieldCheck, Siren, WalletCards, Webhook, XCircle } from "lucide-react";

type BalanceCheck = { id: string; label: string; symbol: string; address?: string; balance?: string; threshold?: string; status: "ok" | "low" | "error" | "skipped"; error?: string; reason?: string };
type KycRow = { id: string; provider: string; status: string; wallet_address: string | null; email: string | null; provider_session_id: string | null; last_error: string | null; created_at: string; updated_at: string };
type WebhookRow = { id: string; provider: string; event_type: string; provider_event_id: string | null; status: string; related_wallet_address: string | null; error_message: string | null; created_at: string; updated_at: string };
type IncidentRow = { id: string; scope: string; status: string; severity: string; reason: string; created_by: string | null; resolved_by: string | null; created_at: string; resolved_at: string | null };
type AuditRow = { id: string; admin_wallet: string; action: string; target_resource: string | null; created_at: string };
type QueueRow = { id: string; operation_id?: string; wallet_address?: string; user_wallet?: string; source_code?: string; vertical?: string; action?: string; status: string; chain_id: number; last_error?: string | null; recommendation?: string | null; created_at: string; updated_at: string };

type OperationsData = {
  balances: BalanceCheck[];
  kyc: KycRow[];
  webhooks: WebhookRow[];
  incidents: IncidentRow[];
  audits: AuditRow[];
  queues: { reconciliation: QueueRow[]; lendingIntents: QueueRow[] };
};

const emptyData: OperationsData = { balances: [], kyc: [], webhooks: [], incidents: [], audits: [], queues: { reconciliation: [], lendingIntents: [] } };

export default function AdminOperationsPage() {
  const [data, setData] = useState<OperationsData>(emptyData);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [incidentForm, setIncidentForm] = useState({ scope: "assisted_deployments", severity: "warning", reason: "" });

  async function load() {
    setError(null);
    const res = await fetch("/api/admin/operations", { cache: "no-store" });
    const body = await res.json();
    if (!res.ok) {
      setError(body?.error ?? "Falha ao carregar operacao");
      return;
    }
    setData(body);
  }

  async function action(payload: Record<string, string>) {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/admin/operations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(body?.error ?? "Falha ao executar acao");
      return;
    }
    setIncidentForm((prev) => ({ ...prev, reason: "" }));
    await load();
  }

  useEffect(() => {
    load().catch((err) => setError(err instanceof Error ? err.message : "Erro inesperado"));
  }, []);

  const metrics = useMemo(() => ({
    lowBalances: data.balances.filter((item) => item.status === "low" || item.status === "error").length,
    activeIncidents: data.incidents.filter((item) => item.status === "active").length,
    kycPending: data.kyc.filter((item) => ["pending", "in_review", "created"].includes(item.status)).length,
    webhookIssues: data.webhooks.filter((item) => ["failed", "reprocess_requested"].includes(item.status)).length,
    queueIssues: [...data.queues.reconciliation, ...data.queues.lendingIntents].filter((item) => ["failed", "mismatch"].includes(item.status)).length,
  }), [data]);

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <div style={styles.kicker}>Operacao</div>
          <h1 style={styles.title}>Centro de controle administrativo</h1>
          <p style={styles.subtitle}>Saldos, incidentes, KYC, webhooks, filas e auditoria em uma visao operacional.</p>
        </div>
        <button onClick={() => load()} style={styles.refreshButton}><RefreshCw size={16} /> Atualizar</button>
      </header>

      {error && <div style={styles.error}>{error}</div>}

      <section style={styles.metricGrid}>
        <Metric icon={<WalletCards size={20} />} label="Saldos em risco" value={String(metrics.lowBalances)} />
        <Metric icon={<Siren size={20} />} label="Incidentes ativos" value={String(metrics.activeIncidents)} />
        <Metric icon={<ShieldCheck size={20} />} label="KYC pendente" value={String(metrics.kycPending)} />
        <Metric icon={<Webhook size={20} />} label="Webhooks com acao" value={String(metrics.webhookIssues)} />
        <Metric icon={<Activity size={20} />} label="Filas com acao" value={String(metrics.queueIssues)} />
      </section>

      <section className="card" style={styles.card}>
        <SectionTitle title="Saldos operacionais por rede" badge="relayer / multisig" />
        <div style={styles.gridCards}>
          {data.balances.map((item) => (
            <div key={item.id} style={styles.balanceCard}>
              <div style={styles.rowBetween}>
                <strong>{item.label}</strong>
                <Status status={item.status} />
              </div>
              <div style={styles.bigValue}>{item.balance ?? "n/a"} {item.symbol}</div>
              <small style={styles.muted}>minimo {item.threshold ?? "n/a"} · {item.address ? short(item.address) : item.reason ?? item.error}</small>
            </div>
          ))}
        </div>
      </section>

      <section className="card" style={styles.card}>
        <SectionTitle title="Pausas e incidentes" badge={`${metrics.activeIncidents} ativos`} />
        <div style={styles.formGrid}>
          <select value={incidentForm.scope} onChange={(event) => setIncidentForm((prev) => ({ ...prev, scope: event.target.value }))}>
            {["global", "checkout", "token_factory", "assisted_deployments", "lending", "staking", "kyc", "webhooks"].map((scope) => <option key={scope} value={scope}>{scope}</option>)}
          </select>
          <select value={incidentForm.severity} onChange={(event) => setIncidentForm((prev) => ({ ...prev, severity: event.target.value }))}>
            <option value="info">Info</option>
            <option value="warning">Warning</option>
            <option value="critical">Critical</option>
          </select>
          <input placeholder="Motivo da pausa/incidente" value={incidentForm.reason} onChange={(event) => setIncidentForm((prev) => ({ ...prev, reason: event.target.value }))} />
          <button disabled={busy} onClick={() => action({ action: "open_incident", ...incidentForm })} style={styles.primaryButton}>Abrir pausa</button>
        </div>
        <Table headers={["Escopo", "Severidade", "Status", "Motivo", "Criado", "Acao"]}>
          {data.incidents.map((item) => (
            <tr key={item.id}>
              <Td>{item.scope}</Td><Td>{item.severity}</Td><Td><Status status={item.status} /></Td><Td>{item.reason}</Td><Td>{date(item.created_at)}</Td>
              <Td>{item.status === "active" && <button disabled={busy} onClick={() => action({ action: "resolve_incident", id: item.id })} style={styles.smallButton}><XCircle size={14} /> Resolver</button>}</Td>
            </tr>
          ))}
        </Table>
      </section>

      <section className="card" style={styles.card}>
        <SectionTitle title="KYC / Didit" badge={`${data.kyc.length} recentes`} />
        <Table headers={["Status", "Wallet", "Email", "Sessao", "Erro", "Atualizado"]}>
          {data.kyc.map((item) => <tr key={item.id}><Td><Status status={item.status} /></Td><Td>{item.wallet_address ? short(item.wallet_address) : "n/a"}</Td><Td>{item.email ?? "n/a"}</Td><Td>{item.provider_session_id ?? "n/a"}</Td><Td>{item.last_error ?? "Sem erro"}</Td><Td>{date(item.updated_at)}</Td></tr>)}
        </Table>
      </section>

      <section className="card" style={styles.card}>
        <SectionTitle title="Webhooks e reprocessamento" badge={`${data.webhooks.length} eventos`} />
        <Table headers={["Provider", "Evento", "Status", "Wallet", "Erro", "Criado", "Acao"]}>
          {data.webhooks.map((item) => (
            <tr key={item.id}>
              <Td>{item.provider}</Td><Td>{item.event_type}</Td><Td><Status status={item.status} /></Td><Td>{item.related_wallet_address ? short(item.related_wallet_address) : "n/a"}</Td><Td>{item.error_message ?? "Sem erro"}</Td><Td>{date(item.created_at)}</Td>
              <Td><button disabled={busy || item.status === "reprocess_requested"} onClick={() => action({ action: "reprocess_webhook", id: item.id })} style={styles.smallButton}><RotateCcw size={14} /> Reprocessar</button></Td>
            </tr>
          ))}
        </Table>
      </section>

      <section className="card" style={styles.card}>
        <SectionTitle title="Filas e reconciliação" badge="jobs internos" />
        <Table headers={["Fila", "Status", "Wallet", "Rede", "Detalhe", "Atualizado", "Acao"]}>
          {data.queues.reconciliation.map((item) => (
            <tr key={item.id}><Td>reconciliation</Td><Td><Status status={item.status} /></Td><Td>{item.user_wallet ? short(item.user_wallet) : "n/a"}</Td><Td>{item.chain_id}</Td><Td>{item.last_error ?? item.action ?? "n/a"}</Td><Td>{date(item.updated_at)}</Td><Td><button disabled={busy} onClick={() => action({ action: "retry_reconciliation", id: item.id })} style={styles.smallButton}><RotateCcw size={14} /> Retry</button></Td></tr>
          ))}
          {data.queues.lendingIntents.map((item) => (
            <tr key={item.id}><Td>lending intent</Td><Td><Status status={item.status} /></Td><Td>{item.wallet_address ? short(item.wallet_address) : "n/a"}</Td><Td>{item.chain_id}</Td><Td>{item.recommendation ?? item.source_code ?? "n/a"}</Td><Td>{date(item.updated_at)}</Td><Td /></tr>
          ))}
        </Table>
      </section>

      <section className="card" style={styles.card}>
        <SectionTitle title="Auditoria administrativa" badge={`${data.audits.length} eventos`} />
        <Table headers={["Admin", "Acao", "Recurso", "Data"]}>
          {data.audits.map((item) => <tr key={item.id}><Td>{short(item.admin_wallet)}</Td><Td>{item.action}</Td><Td>{item.target_resource ?? "n/a"}</Td><Td>{date(item.created_at)}</Td></tr>)}
        </Table>
      </section>
    </div>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="card" style={styles.metric}><div style={styles.metricIcon}>{icon}</div><span style={styles.muted}>{label}</span><strong style={styles.metricValue}>{value}</strong></div>;
}

function SectionTitle({ title, badge }: { title: string; badge: string }) {
  return <div style={styles.rowBetween}><h2 style={styles.sectionTitle}>{title}</h2><span style={styles.badge}>{badge}</span></div>;
}

function Table({ headers, children }: { headers: string[]; children: React.ReactNode }) {
  return <div style={styles.tableWrap}><table style={styles.table}><thead><tr>{headers.map((header) => <th key={header} style={styles.th}>{header}</th>)}</tr></thead><tbody>{children}</tbody></table></div>;
}

function Td({ children }: { children?: React.ReactNode }) {
  return <td style={styles.td}>{children}</td>;
}

function Status({ status }: { status: string }) {
  const color = ["ok", "approved", "processed", "confirmed", "resolved"].includes(status) ? "var(--green)" : ["failed", "low", "error", "critical", "active", "reprocess_requested"].includes(status) ? "#ffb4b4" : "var(--accent-1)";
  return <span style={{ ...styles.status, color, borderColor: `${color}55` }}>{status}</span>;
}

function short(value: string) {
  return value.length > 12 ? `${value.slice(0, 6)}...${value.slice(-4)}` : value;
}

function date(value: string) {
  return new Date(value).toLocaleString("pt-BR");
}

const styles = {
  page: { padding: 32, display: "grid", gap: 24 },
  header: { display: "flex", justifyContent: "space-between", gap: 20, alignItems: "start" },
  kicker: { color: "var(--accent-1)", fontSize: 12, fontWeight: 800, textTransform: "uppercase" as const },
  title: { fontFamily: "'Space Grotesk', sans-serif", fontSize: "clamp(32px, 5vw, 54px)", margin: "8px 0 0" },
  subtitle: { color: "var(--text-muted)", fontSize: 16, lineHeight: 1.6 },
  refreshButton: { display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 14px", border: "1px solid var(--border)", background: "var(--bg-card)", color: "var(--text-primary)", cursor: "pointer", fontWeight: 700 },
  error: { border: "1px solid rgba(255,80,80,0.35)", background: "rgba(255,80,80,0.08)", padding: 14, color: "#ffb4b4" },
  metricGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 },
  metric: { display: "grid", gap: 8, minHeight: 120 },
  metricIcon: { color: "var(--accent-1)" },
  metricValue: { fontSize: 34, lineHeight: 1 },
  card: { display: "grid", gap: 14 },
  rowBetween: { display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center", flexWrap: "wrap" as const },
  sectionTitle: { margin: 0, fontSize: 22 },
  badge: { color: "var(--accent-1)", border: "1px solid rgba(220,255,69,0.28)", background: "rgba(220,255,69,0.08)", padding: "8px 10px", fontWeight: 800 },
  gridCards: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 },
  balanceCard: { border: "1px solid var(--border)", padding: 14, background: "rgba(255,255,255,0.02)" },
  bigValue: { fontSize: 24, fontWeight: 800, marginTop: 10 },
  muted: { color: "var(--text-muted)", fontSize: 12 },
  formGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 },
  primaryButton: { border: 0, background: "var(--accent-grad)", color: "#000", fontWeight: 900, padding: "12px 14px", cursor: "pointer" },
  smallButton: { display: "inline-flex", alignItems: "center", gap: 6, border: "1px solid var(--border)", background: "var(--bg-card)", color: "var(--text-primary)", fontWeight: 800, padding: "8px 10px", cursor: "pointer" },
  tableWrap: { overflowX: "auto" as const },
  table: { width: "100%", minWidth: 980, borderCollapse: "collapse" as const },
  th: { textAlign: "left" as const, padding: "12px 10px", borderBottom: "1px solid var(--border)", color: "var(--text-muted)", fontSize: 12, textTransform: "uppercase" as const },
  td: { padding: "12px 10px", borderBottom: "1px solid var(--border)", verticalAlign: "top" as const, fontSize: 13 },
  status: { display: "inline-block", border: "1px solid", padding: "4px 8px", fontSize: 11, fontWeight: 800, textTransform: "uppercase" as const },
};
