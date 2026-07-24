"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { LENDING_PROTOCOLS } from "@/lib/lendingProtocols";

type LendingRow = {
  id: string;
  wallet_address: string;
  collateral_asset: string;
  borrow_asset: string;
  collateral_amount: number;
  borrowed_amount: number;
  health_factor: number | null;
  updated_at: string;
};

export default function AdminLendingPage() {
  const [positions, setPositions] = useState<LendingRow[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    supabase
      .from("lending_positions")
      .select("id,wallet_address,collateral_asset,borrow_asset,collateral_amount,borrowed_amount,health_factor,updated_at")
      .order("updated_at", { ascending: false })
      .limit(100)
      .then(({ data, error: queryError }) => {
        if (queryError) setError(queryError.message);
        setPositions((data ?? []) as LendingRow[]);
      });
  }, []);

  return (
    <main style={{ padding: 32 }}>
      <h1 style={{ margin: 0, fontSize: 32 }}>Lending</h1>
      <p style={{ color: "var(--text-muted)", marginTop: 8 }}>Posicoes registradas para auditoria operacional e suporte.</p>
      <section className="card" style={{ marginTop: 24, marginBottom: 24 }}>
        <h2 style={{ marginTop: 0, fontSize: 20 }}>Protocol adapter map</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
          {LENDING_PROTOCOLS.map((protocol) => (
            <article key={protocol.id} style={{ border: "1px solid var(--border)", borderRadius: 8, padding: 14, background: "var(--bg-card)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
                <strong>{protocol.name}</strong>
                <span style={{ color: protocol.status === "active" ? "var(--green)" : "var(--text-muted)", fontSize: 12 }}>{protocol.status}</span>
              </div>
              <div style={{ color: "var(--text-muted)", fontSize: 12, marginBottom: 8 }}>{protocol.runtime} / {protocol.adapterKind}</div>
              <p style={{ color: "var(--text-muted)", fontSize: 12, lineHeight: 1.5, margin: 0 }}>{protocol.notes}</p>
            </article>
          ))}
        </div>
      </section>
      {error ? <p style={{ color: "var(--red)" }}>{error}</p> : null}
      <div className="card" style={{ overflowX: "auto", marginTop: 24 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr>{["Wallet", "Pair", "Collateral", "Borrowed", "Health", "Updated"].map((header) => <th key={header} style={th}>{header}</th>)}</tr></thead>
          <tbody>
            {positions.map((position) => (
              <tr key={position.id}>
                <td style={td}>{position.wallet_address}</td>
                <td style={td}>{position.collateral_asset} / {position.borrow_asset}</td>
                <td style={td}>{position.collateral_amount}</td>
                <td style={td}>{position.borrowed_amount}</td>
                <td style={td}>{position.health_factor ?? "n/a"}</td>
                <td style={td}>{new Date(position.updated_at).toLocaleString()}</td>
              </tr>
            ))}
            {positions.length === 0 ? <tr><td colSpan={6} style={td}>Sem registros.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </main>
  );
}

const th = { padding: "14px 12px", textAlign: "left" as const, color: "var(--text-muted)", borderBottom: "1px solid var(--border)" };
const td = { padding: "14px 12px", borderBottom: "1px solid var(--border)", fontSize: 14 };
