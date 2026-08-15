"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { LENDING_PROTOCOLS } from "@/lib/lendingProtocols";
import { AdminPage, AdminSection, AdminStatus } from "@/components/ui/Admin";

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
    <AdminPage title="Crédito" description="Posições e adaptadores registrados para auditoria operacional e suporte.">
      <AdminSection title="Adaptadores de protocolo" description="Rotas disponíveis para originação e gestão de posições.">
        <div className="admin-adapter-grid">
          {LENDING_PROTOCOLS.map((protocol) => (
            <article key={protocol.id} className="admin-adapter">
              <div>
                <strong>{protocol.name}</strong>
                <AdminStatus tone={protocol.status === "active" ? "positive" : "neutral"}>{protocol.status}</AdminStatus>
              </div>
              <small>{protocol.runtime} / {protocol.adapterKind}</small>
            </article>
          ))}
        </div>
      </AdminSection>
      {error ? <p style={{ color: "var(--red)" }}>{error}</p> : null}
      <AdminSection title="Posições registradas">
        <table>
          <thead><tr>{["Wallet", "Pair", "Collateral", "Borrowed", "Health", "Updated"].map((header) => <th key={header}>{header}</th>)}</tr></thead>
          <tbody>
            {positions.map((position) => (
              <tr key={position.id}>
                <td>{position.wallet_address}</td><td>{position.collateral_asset} / {position.borrow_asset}</td><td>{position.collateral_amount}</td><td>{position.borrowed_amount}</td><td>{position.health_factor ?? "n/a"}</td><td>{new Date(position.updated_at).toLocaleString()}</td>
              </tr>
            ))}
            {positions.length === 0 ? <tr><td colSpan={6}>Sem registros.</td></tr> : null}
          </tbody>
        </table>
      </AdminSection>
    </AdminPage>
  );
}
