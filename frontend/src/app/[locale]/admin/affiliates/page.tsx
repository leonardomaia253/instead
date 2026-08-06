"use client";

import { useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";

type Profile = { id: string; wallet_address: string; referral_code: string; status: string; default_commission_bps: number; email: string | null; created_at: string };
type Commission = { id: string; affiliate_id: string; amount_cents: number; currency: string; commission_bps: number; status: string; created_at: string };
type Conversion = { id: string; affiliate_id: string; product_code: string; amount_cents: number; currency: string; status: string; created_at: string };
type Payout = { id: string; affiliate_id: string; amount_cents: number; currency: string; status: string; payout_wallet: string | null; requested_at: string; tx_hash: string | null };

export default function AdminAffiliatesPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [conversions, setConversions] = useState<Conversion[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    const res = await fetch("/api/admin/affiliates", { cache: "no-store" });
    const body = await res.json();
    if (!res.ok) {
      setError(body?.error ?? "Falha ao carregar afiliados");
      return;
    }
    setProfiles(body.profiles ?? []);
    setCommissions(body.commissions ?? []);
    setConversions(body.conversions ?? []);
    setPayouts(body.payouts ?? []);
  }

  async function update(payload: Record<string, unknown>) {
    const res = await fetch("/api/admin/affiliates", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = await res.json();
    if (!res.ok) {
      setError(body?.error ?? "Falha ao atualizar afiliado");
      return;
    }
    await load();
  }

  useEffect(() => {
    load().catch((err) => setError(err instanceof Error ? err.message : "Erro inesperado"));
  }, []);

  const metrics = useMemo(() => ({
    active: profiles.filter((item) => item.status === "active").length,
    pending: profiles.filter((item) => item.status === "pending").length,
    pendingCommission: commissions.filter((item) => item.status === "pending").reduce((sum, item) => sum + item.amount_cents, 0),
    requestedPayout: payouts.filter((item) => item.status === "requested").reduce((sum, item) => sum + item.amount_cents, 0),
  }), [profiles, commissions, payouts]);

  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <div><div style={styles.kicker}>Afiliados</div><h1 style={styles.title}>Gestão de afiliados</h1><p style={styles.muted}>Aprovação, comissão, conversões e payouts.</p></div>
        <button onClick={load} style={styles.button}><RefreshCw size={16} /> Atualizar</button>
      </header>
      {error && <div style={styles.error}>{error}</div>}
      <section style={styles.metricGrid}>
        <Metric label="Ativos" value={String(metrics.active)} />
        <Metric label="Pendentes" value={String(metrics.pending)} />
        <Metric label="Comissão pendente" value={money(metrics.pendingCommission, "usd")} />
        <Metric label="Payout solicitado" value={money(metrics.requestedPayout, "usd")} />
      </section>
      <Section title="Perfis">
        <Table headers={["Wallet", "Código", "Status", "Comissão", "Criado", "Ações"]}>
          {profiles.map((row) => <tr key={row.id}><Td>{short(row.wallet_address)}</Td><Td>{row.referral_code}</Td><Td>{row.status}</Td><Td>{(row.default_commission_bps / 100).toFixed(2)}%</Td><Td>{date(row.created_at)}</Td><Td><button style={styles.smallButton} onClick={() => update({ type: "profile", id: row.id, status: "active" })}>Aprovar</button><button style={styles.smallButton} onClick={() => update({ type: "profile", id: row.id, status: "suspended" })}>Suspender</button></Td></tr>)}
        </Table>
      </Section>
      <Section title="Comissões">
        <Table headers={["Afiliado", "Valor", "Fee", "Status", "Data", "Ações"]}>
          {commissions.map((row) => <tr key={row.id}><Td>{short(profileWallet(profiles, row.affiliate_id))}</Td><Td>{money(row.amount_cents, row.currency)}</Td><Td>{(row.commission_bps / 100).toFixed(2)}%</Td><Td>{row.status}</Td><Td>{date(row.created_at)}</Td><Td><button style={styles.smallButton} onClick={() => update({ type: "commission", id: row.id, status: "approved" })}>Aprovar</button><button style={styles.smallButton} onClick={() => update({ type: "commission", id: row.id, status: "available" })}>Liberar</button><button style={styles.smallButton} onClick={() => update({ type: "commission", id: row.id, status: "rejected" })}>Rejeitar</button></Td></tr>)}
        </Table>
      </Section>
      <Section title="Payouts">
        <Table headers={["Afiliado", "Valor", "Wallet", "Status", "Solicitado", "Ações"]}>
          {payouts.map((row) => <tr key={row.id}><Td>{short(profileWallet(profiles, row.affiliate_id))}</Td><Td>{money(row.amount_cents, row.currency)}</Td><Td>{row.payout_wallet ? short(row.payout_wallet) : "n/a"}</Td><Td>{row.status}</Td><Td>{date(row.requested_at)}</Td><Td><button style={styles.smallButton} onClick={() => update({ type: "payout", id: row.id, status: "approved" })}>Aprovar</button><button style={styles.smallButton} onClick={() => update({ type: "payout", id: row.id, status: "paid" })}>Marcar pago</button><button style={styles.smallButton} onClick={() => update({ type: "payout", id: row.id, status: "rejected" })}>Rejeitar</button></Td></tr>)}
        </Table>
      </Section>
      <Section title="Conversões">
        <Table headers={["Afiliado", "Produto", "Valor", "Status", "Data"]}>
          {conversions.map((row) => <tr key={row.id}><Td>{short(profileWallet(profiles, row.affiliate_id))}</Td><Td>{row.product_code}</Td><Td>{money(row.amount_cents, row.currency)}</Td><Td>{row.status}</Td><Td>{date(row.created_at)}</Td></tr>)}
        </Table>
      </Section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) { return <div className="card" style={styles.metric}><span style={styles.muted}>{label}</span><strong style={styles.metricValue}>{value}</strong></div>; }
function Section({ title, children }: { title: string; children: React.ReactNode }) { return <section className="card" style={styles.card}><h2 style={styles.sectionTitle}>{title}</h2>{children}</section>; }
function Table({ headers, children }: { headers: string[]; children: React.ReactNode }) { return <div style={styles.tableWrap}><table style={styles.table}><thead><tr>{headers.map((h) => <th key={h} style={styles.th}>{h}</th>)}</tr></thead><tbody>{children}</tbody></table></div>; }
function Td({ children }: { children?: React.ReactNode }) { return <td style={styles.td}>{children}</td>; }
function short(value: string) { return value && value.length > 12 ? `${value.slice(0, 6)}...${value.slice(-4)}` : value; }
function date(value: string) { return new Date(value).toLocaleString("pt-BR"); }
function money(cents: number, currency: string) { return new Intl.NumberFormat(currency === "brl" ? "pt-BR" : "en-US", { style: "currency", currency: currency.toUpperCase() }).format(cents / 100); }
function profileWallet(profiles: Profile[], id: string) { return profiles.find((profile) => profile.id === id)?.wallet_address ?? id; }

const styles = {
  page: { padding: 32, display: "grid", gap: 24 },
  header: { display: "flex", justifyContent: "space-between", gap: 20, alignItems: "start", flexWrap: "wrap" as const },
  kicker: { color: "var(--accent-1)", fontSize: 12, fontWeight: 800, textTransform: "uppercase" as const },
  title: { fontFamily: "'Space Grotesk', sans-serif", fontSize: "clamp(32px, 5vw, 54px)", margin: "8px 0 0" },
  muted: { color: "var(--text-muted)" },
  error: { border: "1px solid rgba(255,80,80,0.35)", background: "rgba(255,80,80,0.08)", padding: 14, color: "#ffb4b4" },
  button: { display: "inline-flex", alignItems: "center", gap: 8, border: "1px solid var(--border)", background: "var(--bg-card)", color: "var(--text-primary)", fontWeight: 800, padding: "10px 14px", cursor: "pointer" },
  smallButton: { marginRight: 8, border: "1px solid var(--border)", background: "var(--bg-card)", color: "var(--text-primary)", fontWeight: 800, padding: "8px 10px", cursor: "pointer" },
  metricGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 },
  metric: { display: "grid", gap: 10, minHeight: 110 },
  metricValue: { fontSize: 30 },
  card: { display: "grid", gap: 14 },
  sectionTitle: { margin: 0, fontSize: 22 },
  tableWrap: { overflowX: "auto" as const },
  table: { width: "100%", minWidth: 900, borderCollapse: "collapse" as const },
  th: { textAlign: "left" as const, padding: "12px 10px", borderBottom: "1px solid var(--border)", color: "var(--text-muted)", fontSize: 12, textTransform: "uppercase" as const },
  td: { padding: "12px 10px", borderBottom: "1px solid var(--border)", fontSize: 13 },
};
