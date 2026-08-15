"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { AdminPage, AdminSection } from "@/components/ui/Admin";

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
    <AdminPage title={title} description={subtitle}>
      {error ? <p style={{ color: "var(--red)" }}>{error}</p> : null}
      <AdminSection title="Contas registradas">
        <table>
          <thead>
            <tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>
            ))}
            {rows.length === 0 ? <tr><td colSpan={headers.length}>Sem registros.</td></tr> : null}
          </tbody>
        </table>
      </AdminSection>
    </AdminPage>
  );
}
