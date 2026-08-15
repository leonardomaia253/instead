"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { AdminPage, AdminSection } from "@/components/ui/Admin";

type TokenRow = {
  id: string;
  name: string;
  symbol: string;
  chain_id: number;
  token_address: string | null;
  token_template: string | null;
  launch_mode: string | null;
  taxable: boolean | null;
  burn_tax: boolean | null;
  max_wallet_bps: number | null;
  liquidity_eth: number | null;
  lp_recipient: string | null;
  created_at: string;
};

export default function AdminTokensPage() {
  const [tokens, setTokens] = useState<TokenRow[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    supabase
      .from("generated_tokens")
      .select("id,name,symbol,chain_id,token_address,token_template,launch_mode,taxable,burn_tax,max_wallet_bps,liquidity_eth,lp_recipient,created_at")
      .order("created_at", { ascending: false })
      .limit(100)
      .then(({ data, error: queryError }) => {
        if (queryError) setError(queryError.message);
        setTokens((data ?? []) as TokenRow[]);
      });
  }, []);

  return (
    <AdminPage title="Ativos emitidos" description="Deploys criados pela plataforma e disponíveis para acompanhamento operacional.">
      {error ? <p style={{ color: "var(--red)" }}>{error}</p> : null}
      <AdminSection title="Registro de contratos">
        <table>
          <thead><tr>{["Token", "Template", "Liquidity", "Chain", "Contract", "Created"].map((header) => <th key={header}>{header}</th>)}</tr></thead>
          <tbody>
            {tokens.map((token) => (
              <tr key={token.id}>
                <td>{token.name} ({token.symbol})</td>
                <td>
                  {token.token_template ?? "standard"}
                  {token.burn_tax ? " / burn" : ""}
                  {token.max_wallet_bps ? ` / max ${token.max_wallet_bps / 100}%` : ""}
                </td>
                <td>{token.liquidity_eth ? `${token.liquidity_eth} ETH` : "n/a"}</td><td>{token.chain_id}</td><td>{token.token_address ?? "Pending"}</td><td>{new Date(token.created_at).toLocaleString()}</td>
              </tr>
            ))}
            {tokens.length === 0 ? <tr><td colSpan={6}>Sem registros.</td></tr> : null}
          </tbody>
        </table>
      </AdminSection>
    </AdminPage>
  );
}
