"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type TokenRow = {
  id: string;
  name: string;
  symbol: string;
  chain_id: number;
  token_address: string | null;
  created_at: string;
};

export default function AdminTokensPage() {
  const [tokens, setTokens] = useState<TokenRow[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    supabase
      .from("generated_tokens")
      .select("id,name,symbol,chain_id,token_address,created_at")
      .order("created_at", { ascending: false })
      .limit(100)
      .then(({ data, error: queryError }) => {
        if (queryError) setError(queryError.message);
        setTokens((data ?? []) as TokenRow[]);
      });
  }, []);

  return (
    <main style={{ padding: 32 }}>
      <h1 style={{ margin: 0, fontSize: 32 }}>Tokens</h1>
      <p style={{ color: "var(--text-muted)", marginTop: 8 }}>Deploys criados pela factory e prontos para follow-up comercial.</p>
      {error ? <p style={{ color: "var(--red)" }}>{error}</p> : null}
      <div className="card" style={{ overflowX: "auto", marginTop: 24 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr>{["Token", "Chain", "Contract", "Created"].map((header) => <th key={header} style={th}>{header}</th>)}</tr></thead>
          <tbody>
            {tokens.map((token) => (
              <tr key={token.id}>
                <td style={td}>{token.name} ({token.symbol})</td>
                <td style={td}>{token.chain_id}</td>
                <td style={td}>{token.token_address ?? "Pending"}</td>
                <td style={td}>{new Date(token.created_at).toLocaleString()}</td>
              </tr>
            ))}
            {tokens.length === 0 ? <tr><td colSpan={4} style={td}>Sem registros.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </main>
  );
}

const th = { padding: "14px 12px", textAlign: "left" as const, color: "var(--text-muted)", borderBottom: "1px solid var(--border)" };
const td = { padding: "14px 12px", borderBottom: "1px solid var(--border)", fontSize: 14 };
