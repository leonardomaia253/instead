"use client";

import { useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { AdminMetric, AdminMetrics, AdminPage, AdminSection } from "@/components/ui/Admin";

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
    <AdminPage eyebrow="Afiliados" title="Gestão de afiliados" description="Aprovação, comissões, conversões e pagamentos." action={<button onClick={load} className="admin-action admin-action--secondary"><RefreshCw size={15} /> Atualizar</button>}>
      {error && <div className="admin-notice" data-tone="critical">{error}</div>}
      <AdminMetrics>
        <AdminMetric label="Ativos" value={metrics.active} tone="positive" />
        <AdminMetric label="Pendentes" value={metrics.pending} tone={metrics.pending ? "warning" : "default"} />
        <AdminMetric label="Comissão pendente" value={money(metrics.pendingCommission, "usd")} />
        <AdminMetric label="Pagamento solicitado" value={money(metrics.requestedPayout, "usd")} tone={metrics.requestedPayout ? "warning" : "default"} />
      </AdminMetrics>
      <Section title="Perfis">
        <Table headers={["Wallet", "Código", "Status", "Comissão", "Criado", "Ações"]}>
          {profiles.map((row) => <tr key={row.id}><Td>{short(row.wallet_address)}</Td><Td>{row.referral_code}</Td><Td>{row.status}</Td><Td>{(row.default_commission_bps / 100).toFixed(2)}%</Td><Td>{date(row.created_at)}</Td><Td><div className="admin-row-actions"><button className="admin-action" onClick={() => update({ type: "profile", id: row.id, status: "active" })}>Aprovar</button><button className="admin-action admin-action--danger" onClick={() => update({ type: "profile", id: row.id, status: "suspended" })}>Suspender</button></div></Td></tr>)}
        </Table>
      </Section>
      <Section title="Comissões">
        <Table headers={["Afiliado", "Valor", "Fee", "Status", "Data", "Ações"]}>
          {commissions.map((row) => <tr key={row.id}><Td>{short(profileWallet(profiles, row.affiliate_id))}</Td><Td>{money(row.amount_cents, row.currency)}</Td><Td>{(row.commission_bps / 100).toFixed(2)}%</Td><Td>{row.status}</Td><Td>{date(row.created_at)}</Td><Td><div className="admin-row-actions"><button className="admin-action" onClick={() => update({ type: "commission", id: row.id, status: "approved" })}>Aprovar</button><button className="admin-action admin-action--secondary" onClick={() => update({ type: "commission", id: row.id, status: "available" })}>Liberar</button><button className="admin-action admin-action--danger" onClick={() => update({ type: "commission", id: row.id, status: "rejected" })}>Rejeitar</button></div></Td></tr>)}
        </Table>
      </Section>
      <Section title="Payouts">
        <Table headers={["Afiliado", "Valor", "Wallet", "Status", "Solicitado", "Ações"]}>
          {payouts.map((row) => <tr key={row.id}><Td>{short(profileWallet(profiles, row.affiliate_id))}</Td><Td>{money(row.amount_cents, row.currency)}</Td><Td>{row.payout_wallet ? short(row.payout_wallet) : "n/a"}</Td><Td>{row.status}</Td><Td>{date(row.requested_at)}</Td><Td><div className="admin-row-actions"><button className="admin-action" onClick={() => update({ type: "payout", id: row.id, status: "approved" })}>Aprovar</button><button className="admin-action admin-action--secondary" onClick={() => update({ type: "payout", id: row.id, status: "paid" })}>Marcar pago</button><button className="admin-action admin-action--danger" onClick={() => update({ type: "payout", id: row.id, status: "rejected" })}>Rejeitar</button></div></Td></tr>)}
        </Table>
      </Section>
      <Section title="Conversões">
        <Table headers={["Afiliado", "Produto", "Valor", "Status", "Data"]}>
          {conversions.map((row) => <tr key={row.id}><Td>{short(profileWallet(profiles, row.affiliate_id))}</Td><Td>{row.product_code}</Td><Td>{money(row.amount_cents, row.currency)}</Td><Td>{row.status}</Td><Td>{date(row.created_at)}</Td></tr>)}
        </Table>
      </Section>
    </AdminPage>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) { return <AdminSection title={title}>{children}</AdminSection>; }
function Table({ headers, children }: { headers: string[]; children: React.ReactNode }) { return <div className="admin-table-wrap"><table className="admin-data-table admin-data-table--wide"><thead><tr>{headers.map((h) => <th key={h}>{h}</th>)}</tr></thead><tbody>{children}</tbody></table></div>; }
function Td({ children }: { children?: React.ReactNode }) { return <td>{children}</td>; }
function short(value: string) { return value && value.length > 12 ? `${value.slice(0, 6)}...${value.slice(-4)}` : value; }
function date(value: string) { return new Date(value).toLocaleString("pt-BR"); }
function money(cents: number, currency: string) { return new Intl.NumberFormat(currency === "brl" ? "pt-BR" : "en-US", { style: "currency", currency: currency.toUpperCase() }).format(cents / 100); }
function profileWallet(profiles: Profile[], id: string) { return profiles.find((profile) => profile.id === id)?.wallet_address ?? id; }
