"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Banknote, CheckCircle2, CircleDollarSign, RefreshCw, TrendingUp } from "lucide-react";
import { REVENUE_SOURCE_COUNT } from "@/lib/revenueCatalog";

type RevenueRow = {
  source_code: string;
  label: string;
  vertical: string;
  category: string;
  revenue_model: string;
  billing_interval: string;
  status: string;
  production_ready: boolean;
  amount_usd_cents: number | null;
  amount_brl_cents: number | null;
  take_rate_bps: number | null;
  notes: string;
};

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export default function AdminRevenuePage() {
  const [sources, setSources] = useState<RevenueRow[]>([]);
  const [operations, setOperations] = useState({ entitlements: 0, automationIntents: 0, b2bClients: 0, alerts: 0, b2bEvents: 0 });
  const [source, setSource] = useState<"supabase" | "fallback" | "loading">("loading");
  const [error, setError] = useState<string | null>(null);
  const [b2bForm, setB2bForm] = useState({ name: "", domain: "", contactEmail: "" });
  const [b2bResult, setB2bResult] = useState<{ domain: string; apiKey: string } | null>(null);

  async function loadRevenue() {
    setError(null);
    const res = await fetch("/api/admin/revenue", { cache: "no-store" });
    const body = await res.json();
    if (!res.ok) {
      setError(body?.error ?? "Falha ao carregar fontes de receita");
      return;
    }
    setSources(body.sources ?? []);
    setOperations(body.operations ?? { entitlements: 0, automationIntents: 0, b2bClients: 0, alerts: 0, b2bEvents: 0 });
    setSource(body.source ?? "supabase");
  }

  useEffect(() => {
    loadRevenue().catch((err) => setError(err instanceof Error ? err.message : "Erro inesperado"));
  }, []);

  const metrics = useMemo(() => {
    const active = sources.filter((item) => item.status === "active").length;
    const ready = sources.filter((item) => item.production_ready).length;
    const checkoutProducts = sources.filter((item) => item.amount_usd_cents && item.amount_brl_cents).length;
    const feeBased = sources.filter((item) => item.take_rate_bps !== null).length;
    return { active, ready, checkoutProducts, feeBased };
  }, [sources]);

  async function createB2bClient() {
    setError(null);
    setB2bResult(null);
    const res = await fetch("/api/admin/b2b-clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(b2bForm),
    });
    const body = await res.json();
    if (!res.ok) {
      setError(body?.error ?? "Falha ao provisionar cliente B2B");
      return;
    }
    setB2bResult({ domain: body.client.domain, apiKey: body.apiKey });
    setB2bForm({ name: "", domain: "", contactEmail: "" });
    await loadRevenue();
  }

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <div style={styles.kicker}>Catálogo comercial</div>
          <h1 style={styles.title}>Planos e serviços da Instead</h1>
          <p style={styles.subtitle}>
            Inventário auditável de planos: produtos cobrados via Stripe/Pagar.me, taxas on-chain, assinaturas,
            serviços premium e B2B disponíveis para ativação e acompanhamento.
          </p>
        </div>
        <button onClick={() => loadRevenue()} style={styles.refreshButton}>
          <RefreshCw size={16} />
          Atualizar
        </button>
      </header>

      {error && <div style={styles.error}>{error}</div>}
      {source === "fallback" && (
        <div style={styles.warning}>Supabase indisponível para revenue_sources; exibindo catálogo local de fallback.</div>
      )}

      <section style={styles.metricGrid}>
        <Metric icon={<TrendingUp size={20} />} label="Planos ativos" value={String(sources.length || REVENUE_SOURCE_COUNT)} />
        <Metric icon={<CheckCircle2 size={20} />} label="Production ready" value={String(metrics.ready)} />
        <Metric icon={<Banknote size={20} />} label="Checkout fiat" value={String(metrics.checkoutProducts)} />
        <Metric icon={<CircleDollarSign size={20} />} label="Taxas on-chain" value={String(metrics.feeBased)} />
        <Metric icon={<CheckCircle2 size={20} />} label="Entitlements" value={String(operations.entitlements)} />
        <Metric icon={<RefreshCw size={20} />} label="Intenções lending" value={String(operations.automationIntents)} />
        <Metric icon={<Banknote size={20} />} label="Clientes B2B" value={String(operations.b2bClients)} />
        <Metric icon={<RefreshCw size={20} />} label="Alertas risco" value={String(operations.alerts)} />
        <Metric icon={<Banknote size={20} />} label="Eventos B2B" value={String(operations.b2bEvents)} />
      </section>

      <section className="card" style={styles.tableCard}>
        <div style={styles.sectionHeader}>
          <div>
            <h2 style={styles.sectionTitle}>Provisionar Widget/API B2B</h2>
            <p style={styles.model}>Cria cliente parceiro, gera API key e habilita embed de lending/risk dashboard.</p>
          </div>
          <span style={styles.badge}>B2B ready</span>
        </div>
        <div style={styles.formGrid}>
          <input placeholder="Nome do parceiro" value={b2bForm.name} onChange={(event) => setB2bForm((prev) => ({ ...prev, name: event.target.value }))} />
          <input placeholder="dominio.com" value={b2bForm.domain} onChange={(event) => setB2bForm((prev) => ({ ...prev, domain: event.target.value }))} />
          <input placeholder="contato@dominio.com" value={b2bForm.contactEmail} onChange={(event) => setB2bForm((prev) => ({ ...prev, contactEmail: event.target.value }))} />
          <button onClick={createB2bClient} style={styles.primaryButton}>Gerar API key</button>
        </div>
        {b2bResult && (
          <div style={styles.secretBox}>
            <strong>API key criada. Copie agora — ela não será exibida novamente.</strong>
            <code style={styles.secretCode}>{b2bResult.apiKey}</code>
            <code style={styles.embedCode}>{`fetch("/api/b2b/widget?domain=${b2bResult.domain}", { headers: { "x-instead-widget-key": "${b2bResult.apiKey}" } })`}</code>
          </div>
        )}
      </section>

      <section className="card" style={styles.tableCard}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>Mapa de planos</h2>
          <span style={styles.badge}>{metrics.active} ativas hoje</span>
        </div>
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Fonte</th>
                <th style={styles.th}>Vertical</th>
                <th style={styles.th}>Modelo</th>
                <th style={styles.th}>Preço/Fee</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Nota operacional</th>
              </tr>
            </thead>
            <tbody>
              {sources.map((item) => (
                <tr key={item.source_code}>
                  <td style={styles.td}>
                    <strong>{item.label}</strong>
                    <small style={styles.code}>{item.source_code}</small>
                  </td>
                  <td style={styles.td}>{item.vertical}</td>
                  <td style={styles.td}>
                    <span style={styles.category}>{item.category}</span>
                    <p style={styles.model}>{item.revenue_model}</p>
                  </td>
                  <td style={styles.td}>
                    {item.amount_usd_cents && item.amount_brl_cents
                      ? `${usd.format(item.amount_usd_cents / 100)} / ${brl.format(item.amount_brl_cents / 100)}`
                      : `${item.take_rate_bps ?? 0} bps`}
                    <small style={styles.code}>{item.billing_interval}</small>
                  </td>
                  <td style={styles.td}>
                    <span style={{ ...styles.status, ...(item.status === "active" ? styles.statusActive : styles.statusReady) }}>
                      {item.status}
                    </span>
                    {item.production_ready && <small style={styles.ready}>produção</small>}
                  </td>
                  <td style={styles.td}>{item.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="card" style={styles.metricCard}>
      <div style={styles.metricIcon}>{icon}</div>
      <span style={styles.metricLabel}>{label}</span>
      <strong style={styles.metricValue}>{value}</strong>
    </div>
  );
}

const styles = {
  page: { padding: 32, display: "grid", gap: 24 },
  header: { display: "flex", justifyContent: "space-between", gap: 20, alignItems: "start" },
  kicker: { color: "var(--accent-1)", fontSize: 12, fontWeight: 800, textTransform: "uppercase" as const },
  title: { fontFamily: "'Space Grotesk', sans-serif", fontSize: "clamp(32px, 5vw, 54px)", margin: "8px 0 0" },
  subtitle: { color: "var(--text-muted)", fontSize: 16, lineHeight: 1.6, maxWidth: 880 },
  refreshButton: { display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 14px", border: "1px solid var(--border)", background: "var(--bg-card)", color: "var(--text-primary)", cursor: "pointer", fontWeight: 700 },
  warning: { border: "1px solid rgba(255,200,0,0.35)", background: "rgba(255,200,0,0.08)", padding: 14, color: "var(--text-primary)" },
  error: { border: "1px solid rgba(255,80,80,0.35)", background: "rgba(255,80,80,0.08)", padding: 14, color: "#ffb4b4" },
  metricGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 16 },
  metricCard: { display: "grid", gap: 8, minHeight: 130 },
  metricIcon: { width: 40, height: 40, display: "grid", placeItems: "center", color: "var(--accent-1)", background: "rgba(220,255,69,0.1)", border: "1px solid rgba(220,255,69,0.25)" },
  metricLabel: { color: "var(--text-muted)", fontSize: 12, fontWeight: 800, textTransform: "uppercase" as const },
  metricValue: { fontSize: 34, lineHeight: 1 },
  tableCard: { display: "grid", gap: 14 },
  sectionHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 },
  sectionTitle: { margin: 0, fontSize: 22 },
  badge: { color: "var(--accent-1)", border: "1px solid rgba(220,255,69,0.28)", background: "rgba(220,255,69,0.08)", padding: "8px 10px", fontWeight: 800 },
  tableWrap: { overflowX: "auto" as const },
  table: { width: "100%", borderCollapse: "collapse" as const, minWidth: 1050 },
  th: { textAlign: "left" as const, padding: "12px 10px", borderBottom: "1px solid var(--border)", color: "var(--text-muted)", fontSize: 12, textTransform: "uppercase" as const },
  td: { padding: "14px 10px", borderBottom: "1px solid var(--border)", verticalAlign: "top" as const, color: "var(--text-primary)", fontSize: 14 },
  code: { display: "block", color: "var(--text-muted)", fontFamily: "monospace", fontSize: 12, marginTop: 4 },
  category: { color: "var(--accent-1)", fontSize: 12, fontWeight: 800, textTransform: "uppercase" as const },
  model: { margin: "4px 0 0", color: "var(--text-muted)", lineHeight: 1.45 },
  status: { display: "inline-block", padding: "4px 8px", fontSize: 12, fontWeight: 800, textTransform: "uppercase" as const },
  statusActive: { background: "rgba(85,240,192,0.12)", color: "var(--green)" },
  statusReady: { background: "rgba(220,255,69,0.1)", color: "var(--accent-1)" },
  ready: { display: "block", color: "var(--green)", marginTop: 6, fontWeight: 700 },
  formGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 },
  primaryButton: { border: 0, background: "var(--accent-grad)", color: "#000", fontWeight: 900, padding: "12px 14px", cursor: "pointer" },
  secretBox: { display: "grid", gap: 10, border: "1px solid rgba(85,240,192,0.28)", background: "rgba(85,240,192,0.08)", padding: 14 },
  secretCode: { color: "var(--green)", wordBreak: "break-all" as const },
  embedCode: { color: "var(--text-muted)", whiteSpace: "pre-wrap" as const, wordBreak: "break-word" as const },
};
