"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { usePathname, useRouter } from "@/navigation";
import { AdminMetric, AdminMetrics, AdminPage, AdminSection, AdminStatus } from "@/components/ui/Admin";

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
  const router = useRouter();
  const pathname = usePathname();
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    supabase
      .from("payment_intents")
      .select("id,provider,vertical,product_code,wallet_address,email,amount_cents,currency,status,paid_at,created_at")
      .order("created_at", { ascending: false })
      .limit(100)
      .then(({ data, error: queryError }) => {
        if (queryError) {
          const msg = (queryError.message || "").toLowerCase();
          const status = (queryError as any).status;
          const isAuthError =
            msg.includes("403") ||
            msg.includes("jwt") ||
            msg.includes("expired") ||
            msg.includes("unauthorized") ||
            status === 401 ||
            status === 403;

          if (isAuthError) {
            setError("Sessão expirada. Redirecionando para o login...");
            setTimeout(() => {
              router.push("/" + pathname.split("/")[1] + "/admin/login");
            }, 2000);
          } else {
            setError(queryError.message);
          }
        }
        setPayments((data ?? []) as PaymentRow[]);
      });
  }, [pathname, router]);

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
    <AdminPage title="Pagamentos" description="Checkout fiat, deploy assistido e conciliação comercial.">

      <AdminMetrics>
        <AdminMetric label="Recebido em BRL" value={formatMoney(totals.brl, "brl")} tone="positive" />
        <AdminMetric label="Recebido em USD" value={formatMoney(totals.usd, "usd")} tone="positive" />
        <AdminMetric label="Pendentes" value={String(payments.filter((payment) => payment.status === "pending").length)} tone="warning" />
      </AdminMetrics>

      {error && error.startsWith("Sessão expirada") && (
        <div style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)", borderRadius: 10, padding: "14px 18px", marginTop: 16, color: "#f59e0b", fontWeight: 600, fontSize: 14 }}>
          {error}
        </div>
      )}
      {error && !error.startsWith("Sessão expirada") ? <p style={{ color: "var(--red)" }}>{error}</p> : null}
      <AdminSection title="Transações recentes">
        <table>
          <thead>
            <tr>{["Status", "Provider", "Product", "Amount", "Wallet", "Contact", "Created", "Paid"].map((header) => <th key={header}>{header}</th>)}</tr>
          </thead>
          <tbody>
            {payments.map((payment) => (
              <tr key={payment.id}>
                <td><StatusBadge status={payment.status} /></td><td>{payment.provider}</td><td>{payment.product_code}</td><td>{formatMoney(payment.amount_cents, payment.currency)}</td><td className="admin-wallet-cell">{payment.wallet_address ?? "n/a"}</td><td>{payment.email ?? "n/a"}</td><td>{new Date(payment.created_at).toLocaleString()}</td><td>{payment.paid_at ? new Date(payment.paid_at).toLocaleString() : "n/a"}</td>
              </tr>
            ))}
            {payments.length === 0 ? <tr><td colSpan={8}>Sem registros.</td></tr> : null}
          </tbody>
        </table>
      </AdminSection>
    </AdminPage>
  );
}

function StatusBadge({ status }: { status: string }) {
  const tone = status === "paid" ? "positive" : status === "failed" || status === "canceled" ? "critical" : "warning";
  return <AdminStatus tone={tone}>{status}</AdminStatus>;
}
