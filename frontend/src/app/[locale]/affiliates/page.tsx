"use client";

import { useEffect, useMemo, useState } from "react";
import { Copy, RefreshCw, WalletCards } from "lucide-react";
import { useAccount } from "wagmi";
import { WalletConnectButton } from "@/components/WalletConnectButton";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { MetricCard, MetricGrid, PageHeader, PanelHeader, ProductShell } from "@/components/ui/Institutional";

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
      <div className="public-page-frame">
        <Navbar />
        <ProductShell width="narrow" className="affiliate-shell affiliate-shell--connect">
          <PageHeader eyebrow="Programa de indicação" title="Painel de afiliado" description="Conecte sua carteira para criar e gerenciar seu link de indicação." />
          <WalletConnectButton />
        </ProductShell>
        <Footer />
      </div>
    );
  }

  return (
    <div className="public-page-frame">
      <Navbar />
      <ProductShell width="wide" className="affiliate-shell">
      <PageHeader eyebrow="Programa de indicação" title="Painel de comissões" description="Acompanhe cliques, conversões, comissões e solicitações de saque." action={<button onClick={() => load()} className="btn-outline affiliate-action"><RefreshCw size={14} /> Atualizar</button>} />

      {error && <div className="risk-disclosure affiliate-error">{error}</div>}

      <section className="card affiliate-link-panel">
        <PanelHeader title="Seu link" description={`Status: ${data.profile?.status ?? "carregando"} · Comissão padrão: ${((data.profile?.default_commission_bps ?? 0) / 100).toFixed(2)}%`} action={<button onClick={() => navigator.clipboard.writeText(referralUrl)} className="btn-outline affiliate-action"><Copy size={14} /> Copiar</button>} />
        <code>{referralUrl || "Gerando link..."}</code>
      </section>

      <MetricGrid>
        <MetricCard label="Cliques" value={data.metrics?.clicks ?? 0} />
        <MetricCard label="Conversões" value={data.metrics?.conversions ?? 0} />
        <MetricCard label="Pendente" value={money(data.metrics?.pendingCents ?? 0, "usd")} tone="warning" />
        <MetricCard label="Disponível" value={money(data.metrics?.availableCents ?? 0, "usd")} tone="positive" />
        <MetricCard label="Pago" value={money(data.metrics?.paidCents ?? 0, "usd")} />
      </MetricGrid>

      <section className="card affiliate-table-panel">
        <PanelHeader title="Saques" action={<button disabled={busy} onClick={() => requestPayout("usd")} className="btn-primary affiliate-action"><WalletCards size={14} /> Solicitar USD</button>} />
        <Table headers={["Valor", "Status", "Solicitado", "Tx"]}>
          {(data.payouts ?? []).map((row) => <tr key={row.id}><Td>{money(row.amount_cents, row.currency)}</Td><Td>{row.status}</Td><Td>{date(row.requested_at)}</Td><Td>{row.tx_hash ?? "n/a"}</Td></tr>)}
        </Table>
      </section>

      <section className="card affiliate-table-panel">
        <PanelHeader title="Comissões" />
        <Table headers={["Valor", "Fee", "Status", "Data"]}>
          {(data.commissions ?? []).map((row) => <tr key={row.id}><Td>{money(row.amount_cents, row.currency)}</Td><Td>{(row.commission_bps / 100).toFixed(2)}%</Td><Td>{row.status}</Td><Td>{date(row.created_at)}</Td></tr>)}
        </Table>
      </section>

      <section className="card affiliate-table-panel">
        <PanelHeader title="Conversões" />
        <Table headers={["Produto", "Vertical", "Valor", "Status", "Data"]}>
          {(data.conversions ?? []).map((row) => <tr key={row.id}><Td>{row.product_code}</Td><Td>{row.vertical}</Td><Td>{money(row.amount_cents, row.currency)}</Td><Td>{row.status}</Td><Td>{date(row.created_at)}</Td></tr>)}
        </Table>
      </section>
      </ProductShell>
      <Footer />
    </div>
  );
}

function Table({ headers, children }: { headers: string[]; children: React.ReactNode }) {
  return <div className="affiliate-table-wrap"><table className="affiliate-table"><thead><tr>{headers.map((h) => <th key={h}>{h}</th>)}</tr></thead><tbody>{children}</tbody></table></div>;
}

function Td({ children }: { children?: React.ReactNode }) {
  return <td>{children}</td>;
}

function money(cents: number, currency: string) {
  return new Intl.NumberFormat(currency === "brl" ? "pt-BR" : "en-US", { style: "currency", currency: currency.toUpperCase() }).format(cents / 100);
}

function date(value: string) {
  return new Date(value).toLocaleString("pt-BR");
}
