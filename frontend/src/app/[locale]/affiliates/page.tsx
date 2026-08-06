"use client";

import { useEffect, useMemo, useState } from "react";
import { Copy, RefreshCw, WalletCards } from "lucide-react";
import { useAccount } from "wagmi";
import { WalletConnectButton } from "@/components/WalletConnectButton";

type AffiliateData = {
  profile?: { referral_code: string; status: string; default_commission_bps: number; payout_wallet: string | null };
  metrics?: { clicks: number; conversions: number; pendingCents: number; availableCents: number; requestedCents: number; paidCents: number };
  conversions?: Array<{ id: string; product_code: string; vertical: string; amount_cents: number; currency: string; status: string; created_at: string }>;
  commissions?: Array<{ id: string; amount_cents: number; currency: string; commission_bps: number; status: string; created_at: string }>;
  payouts?: Array<{ id: string; amount_cents: number; currency: string; status: string; requested_at: string; tx_hash: string | null }>;
};

export default function AffiliatesPage() {
  const { address, isConnected } = useAccount();
  const [data, setData] = useState<AffiliateData>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    if (!address) return;
    setError(null);
    const res = await fetch(`/api/affiliates/me?wallet=${encodeURIComponent(address.toLowerCase())}`, { cache: "no-store" });
    const body = await res.json();
    if (!res.ok) {
      setError(body?.error ?? "Falha ao carregar painel de afiliado");
      return;
    }
    setData(body);
  }

  async function requestPayout(currency: "usd" | "brl") {
    setBusy(true);
    const res = await fetch("/api/affiliates/payouts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currency }),
    });
    const body = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(body?.error ?? "Falha ao solicitar saque");
      return;
    }
    await load();
  }

  useEffect(() => {
    load().catch((err) => setError(err instanceof Error ? err.message : "Erro inesperado"));
  }, [address]);

  const referralUrl = useMemo(() => {
    if (!data.profile?.referral_code) return "";
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/?ref=${data.profile.referral_code}`;
  }, [data.profile?.referral_code]);

  if (!isConnected) {
    return (
      <main style={styles.center}>
        <h1>Painel de afiliado</h1>
        <p style={styles.muted}>Conecte sua wallet para criar e gerenciar seu link de indicação.</p>
        <WalletConnectButton />
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <div>
          <div style={styles.kicker}>Afiliados</div>
          <h1 style={styles.title}>Painel de comissões</h1>
          <p style={styles.muted}>Acompanhe cliques, conversões, comissões e solicitações de saque.</p>
        </div>
        <button onClick={() => load()} style={styles.button}><RefreshCw size={16} /> Atualizar</button>
      </header>

      {error && <div style={styles.error}>{error}</div>}

      <section className="card" style={styles.card}>
        <div style={styles.rowBetween}>
          <div>
            <h2 style={styles.sectionTitle}>Seu link</h2>
            <p style={styles.muted}>Status: {data.profile?.status ?? "carregando"} · Comissão padrão: {((data.profile?.default_commission_bps ?? 0) / 100).toFixed(2)}%</p>
          </div>
          <button onClick={() => navigator.clipboard.writeText(referralUrl)} style={styles.button}><Copy size={16} /> Copiar</button>
        </div>
        <code style={styles.linkBox}>{referralUrl || "Gerando link..."}</code>
      </section>

      <section style={styles.metricGrid}>
        <Metric label="Cliques" value={String(data.metrics?.clicks ?? 0)} />
        <Metric label="Conversões" value={String(data.metrics?.conversions ?? 0)} />
        <Metric label="Pendente" value={money(data.metrics?.pendingCents ?? 0, "usd")} />
        <Metric label="Disponível" value={money(data.metrics?.availableCents ?? 0, "usd")} />
        <Metric label="Pago" value={money(data.metrics?.paidCents ?? 0, "usd")} />
      </section>

      <section className="card" style={styles.card}>
        <div style={styles.rowBetween}>
          <h2 style={styles.sectionTitle}>Saque</h2>
          <button disabled={busy} onClick={() => requestPayout("usd")} style={styles.primaryButton}><WalletCards size={16} /> Solicitar USD</button>
        </div>
        <Table headers={["Valor", "Status", "Solicitado", "Tx"]}>
          {(data.payouts ?? []).map((row) => <tr key={row.id}><Td>{money(row.amount_cents, row.currency)}</Td><Td>{row.status}</Td><Td>{date(row.requested_at)}</Td><Td>{row.tx_hash ?? "n/a"}</Td></tr>)}
        </Table>
      </section>

      <section className="card" style={styles.card}>
        <h2 style={styles.sectionTitle}>Comissões</h2>
        <Table headers={["Valor", "Fee", "Status", "Data"]}>
          {(data.commissions ?? []).map((row) => <tr key={row.id}><Td>{money(row.amount_cents, row.currency)}</Td><Td>{(row.commission_bps / 100).toFixed(2)}%</Td><Td>{row.status}</Td><Td>{date(row.created_at)}</Td></tr>)}
        </Table>
      </section>

      <section className="card" style={styles.card}>
        <h2 style={styles.sectionTitle}>Conversões</h2>
        <Table headers={["Produto", "Vertical", "Valor", "Status", "Data"]}>
          {(data.conversions ?? []).map((row) => <tr key={row.id}><Td>{row.product_code}</Td><Td>{row.vertical}</Td><Td>{money(row.amount_cents, row.currency)}</Td><Td>{row.status}</Td><Td>{date(row.created_at)}</Td></tr>)}
        </Table>
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="card" style={styles.metric}><span style={styles.muted}>{label}</span><strong style={styles.metricValue}>{value}</strong></div>;
}

function Table({ headers, children }: { headers: string[]; children: React.ReactNode }) {
  return <div style={styles.tableWrap}><table style={styles.table}><thead><tr>{headers.map((h) => <th key={h} style={styles.th}>{h}</th>)}</tr></thead><tbody>{children}</tbody></table></div>;
}

function Td({ children }: { children?: React.ReactNode }) {
  return <td style={styles.td}>{children}</td>;
}

function money(cents: number, currency: string) {
  return new Intl.NumberFormat(currency === "brl" ? "pt-BR" : "en-US", { style: "currency", currency: currency.toUpperCase() }).format(cents / 100);
}

function date(value: string) {
  return new Date(value).toLocaleString("pt-BR");
}

const styles = {
  center: { minHeight: "100vh", display: "grid", placeItems: "center", alignContent: "center", gap: 16, padding: 24, textAlign: "center" as const },
  page: { minHeight: "100vh", padding: "32px clamp(16px, 5vw, 40px)", display: "grid", gap: 24 },
  header: { display: "flex", justifyContent: "space-between", gap: 20, alignItems: "start", flexWrap: "wrap" as const },
  kicker: { color: "var(--accent-1)", fontSize: 12, fontWeight: 800, textTransform: "uppercase" as const },
  title: { fontFamily: "'Space Grotesk', sans-serif", fontSize: "clamp(32px, 5vw, 54px)", margin: "8px 0 0" },
  muted: { color: "var(--text-muted)", lineHeight: 1.5 },
  error: { border: "1px solid rgba(255,80,80,0.35)", background: "rgba(255,80,80,0.08)", padding: 14, color: "#ffb4b4" },
  card: { display: "grid", gap: 14 },
  rowBetween: { display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center", flexWrap: "wrap" as const },
  sectionTitle: { margin: 0, fontSize: 22 },
  button: { display: "inline-flex", alignItems: "center", gap: 8, border: "1px solid var(--border)", background: "var(--bg-card)", color: "var(--text-primary)", fontWeight: 800, padding: "10px 14px", cursor: "pointer" },
  primaryButton: { display: "inline-flex", alignItems: "center", gap: 8, border: 0, background: "var(--accent-grad)", color: "#000", fontWeight: 900, padding: "10px 14px", cursor: "pointer" },
  linkBox: { display: "block", padding: 14, border: "1px solid var(--border)", color: "var(--accent-1)", overflowX: "auto" as const },
  metricGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 16 },
  metric: { display: "grid", gap: 10, minHeight: 110 },
  metricValue: { fontSize: 30 },
  tableWrap: { overflowX: "auto" as const },
  table: { width: "100%", minWidth: 720, borderCollapse: "collapse" as const },
  th: { textAlign: "left" as const, padding: "12px 10px", borderBottom: "1px solid var(--border)", color: "var(--text-muted)", fontSize: 12, textTransform: "uppercase" as const },
  td: { padding: "12px 10px", borderBottom: "1px solid var(--border)", fontSize: 13 },
};
