"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type PaymentRow = {
  id: string;
  provider: string;
  vertical: string;
  product_code: string;
  wallet_address: string | null;
  email: string | null;
  amount_cents: number;
  currency: string;
  status: string;
  paid_at: string | null;
  created_at: string;
};

function formatMoney(amountCents: number, currency: string) {
  return new Intl.NumberFormat(currency === "brl" ? "pt-BR" : "en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amountCents / 100);
}

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    supabase
      .from("payment_intents")
      .select("id,provider,vertical,product_code,wallet_address,email,amount_cents,currency,status,paid_at,created_at")
      .order("created_at", { ascending: false })
      .limit(100)
      .then(({ data, error: queryError }) => {
        if (queryError) setError(queryError.message);
        setPayments((data ?? []) as PaymentRow[]);
      });
  }, []);

  const totals = useMemo(() => {
    return payments.reduce(
      (acc, payment) => {
        if (payment.status === "paid") {
          const key = payment.currency.toLowerCase() === "brl" ? "brl" : "usd";
          acc[key] += payment.amount_cents;
        }
        return acc;
      },
      { brl: 0, usd: 0 },
    );
  }, [payments]);

  return (
    <main style={{ padding: 32 }}>
      <h1 style={{ margin: 0, fontSize: 32 }}>Payments</h1>
      <p style={{ color: "var(--text-muted)", marginTop: 8 }}>Checkout fiat para deploy assistido, PIX/cartao e follow-up comercial.</p>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginTop: 24 }}>
        <Metric label="Paid BRL" value={formatMoney(totals.brl, "brl")} />
        <Metric label="Paid USD" value={formatMoney(totals.usd, "usd")} />
        <Metric label="Pending" value={String(payments.filter((payment) => payment.status === "pending").length)} />
      </section>

      {error ? <p style={{ color: "var(--red)" }}>{error}</p> : null}
      <div className="card" style={{ overflowX: "auto", marginTop: 24 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>{["Status", "Provider", "Product", "Amount", "Wallet", "Contact", "Created", "Paid"].map((header) => <th key={header} style={th}>{header}</th>)}</tr>
          </thead>
          <tbody>
            {payments.map((payment) => (
              <tr key={payment.id}>
                <td style={td}><StatusBadge status={payment.status} /></td>
                <td style={td}>{payment.provider}</td>
                <td style={td}>{payment.product_code}</td>
                <td style={td}>{formatMoney(payment.amount_cents, payment.currency)}</td>
                <td style={{ ...td, fontFamily: "monospace", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis" }}>{payment.wallet_address ?? "n/a"}</td>
                <td style={td}>{payment.email ?? "n/a"}</td>
                <td style={td}>{new Date(payment.created_at).toLocaleString()}</td>
                <td style={td}>{payment.paid_at ? new Date(payment.paid_at).toLocaleString() : "n/a"}</td>
              </tr>
            ))}
            {payments.length === 0 ? <tr><td colSpan={8} style={td}>Sem registros.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="card" style={{ padding: 18 }}>
      <div style={{ color: "var(--text-muted)", fontSize: 12, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 800 }}>{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const color = status === "paid" ? "var(--green)" : status === "failed" || status === "canceled" ? "var(--red)" : "var(--text-muted)";
  return <span style={{ color, fontWeight: 700 }}>{status}</span>;
}

const th = { padding: "14px 12px", textAlign: "left" as const, color: "var(--text-muted)", borderBottom: "1px solid var(--border)" };
const td = { padding: "14px 12px", borderBottom: "1px solid var(--border)", fontSize: 14, whiteSpace: "nowrap" as const };
