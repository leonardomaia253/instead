"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

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
