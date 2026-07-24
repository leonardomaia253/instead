"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type UserRow = {
  id: string;
  wallet_address: string;
  is_admin: boolean;
  created_at: string;
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    supabase
      .from("users")
      .select("id,wallet_address,is_admin,created_at")
      .order("created_at", { ascending: false })
      .limit(100)
      .then(({ data, error: queryError }) => {
        if (queryError) setError(queryError.message);
        setUsers((data ?? []) as UserRow[]);
      });
  }, []);

  return (
    <AdminTablePage
      title="Users"
      subtitle="Carteiras autenticadas e administradores registrados."
      error={error}
      headers={["Wallet", "Role", "Created"]}
      rows={users.map((user) => [
        user.wallet_address,
        user.is_admin ? "Admin" : "User",
        new Date(user.created_at).toLocaleString(),
      ])}
    />
  );
}

function AdminTablePage({ title, subtitle, error, headers, rows }: { title: string; subtitle: string; error: string; headers: string[]; rows: string[][] }) {
  return (
    <main style={{ padding: 32 }}>
      <h1 style={{ margin: 0, fontSize: 32 }}>{title}</h1>
      <p style={{ color: "var(--text-muted)", marginTop: 8 }}>{subtitle}</p>
      {error ? <p style={{ color: "var(--red)" }}>{error}</p> : null}
      <div className="card" style={{ overflowX: "auto", marginTop: 24 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>{headers.map((header) => <th key={header} style={th}>{header}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index}>{row.map((cell, cellIndex) => <td key={cellIndex} style={td}>{cell}</td>)}</tr>
            ))}
            {rows.length === 0 ? <tr><td colSpan={headers.length} style={td}>Sem registros.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </main>
  );
}

const th = { padding: "14px 12px", textAlign: "left" as const, color: "var(--text-muted)", borderBottom: "1px solid var(--border)" };
const td = { padding: "14px 12px", borderBottom: "1px solid var(--border)", fontSize: 14 };
