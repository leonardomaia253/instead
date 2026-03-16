"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase, type GeneratedToken } from "@/lib/supabase";
import { CHAIN_META } from "@/lib/wagmi";
import { Skeleton } from "@/components/Skeleton";

export default function TokenPage() {
  const params       = useParams();
  const searchParams = useSearchParams();
  const address      = params.address as string;
  const chainId      = parseInt(searchParams.get("chain") ?? "42161");

  const [token, setToken]     = useState<GeneratedToken | null>(null);
  const [loading, setLoading] = useState(true);
  const [favorited, setFavorited] = useState(false);

  const chain = CHAIN_META[chainId];

  useEffect(() => {
    supabase
      .from("generated_tokens")
      .select("*")
      .eq("token_address", address.toLowerCase())
      .eq("chain_id", chainId)
      .single()
      .then(({ data }) => { setToken(data as GeneratedToken | null); setLoading(false); });
  }, [address, chainId]);

  function addToMetaMask() {
    if (!token || !window.ethereum) return;
    window.ethereum.request({
      method: "wallet_watchAsset",
      params: { type: "ERC20", options: { address: token.token_address, symbol: token.symbol, decimals: 18 } },
    });
  }

  if (loading) return (
    <main style={{ minHeight: "100vh", padding: "40px 24px" }}>
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <Skeleton height={32} width="60%" style={{ marginBottom: 16 }} />
        <Skeleton height={20} width="40%" style={{ marginBottom: 32 }} />
        <div className="card">
          {[...Array(6)].map((_, i) => <Skeleton key={i} height={18} style={{ marginBottom: 16 }} />)}
        </div>
      </div>
    </main>
  );

  if (!token) return (
    <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
      <div style={{ fontSize: 48 }}>🔍</div>
      <h2>Token não encontrado</h2>
      <p style={{ color: "var(--text-muted)" }}>Esse token pode não ter sido indexado ainda.</p>
      <Link href="/factory" className="btn-primary" style={{ textDecoration: "none" }}>Criar um Token</Link>
    </main>
  );

  const explorerUrl = chain?.explorer ? `${chain.explorer}/address/${token.token_address}` : "#";

  return (
    <main style={{ minHeight: "100vh", padding: "40px 24px" }}>
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <Link href="/factory" style={{ color: "var(--text-muted)", fontSize: 13, textDecoration: "none" }}>← Token Factory</Link>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginTop: 12, marginBottom: 28 }}>
          <div>
            <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 32, fontWeight: 800, marginBottom: 4 }}>
              {token.name}
            </h1>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <span style={{ color: "var(--accent-1)", fontWeight: 700, fontSize: 18 }}>${token.symbol}</span>
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{chain?.icon} {chain?.name}</span>
            </div>
          </div>
          <button
            onClick={() => setFavorited(!favorited)}
            style={{ background: "none", border: "none", fontSize: 28, cursor: "pointer" }}
          >
            {favorited ? "❤️" : "🤍"}
          </button>
        </div>

        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            {[
              ["Endereço", `${token.token_address.slice(0, 10)}...${token.token_address.slice(-6)}`],
              ["Criador",  `${token.creator_wallet.slice(0, 10)}...${token.creator_wallet.slice(-6)}`],
              ["Supply Inicial", Number(token.initial_supply).toLocaleString()],
              ["Supply Máximo", Number(token.max_supply).toLocaleString()],
              ["Criado em", new Date(token.created_at).toLocaleDateString("pt-BR")],
              ["Chain ID", chainId],
            ].map(([label, value]) => (
              <div key={String(label)}>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: 14, fontWeight: 600, wordBreak: "break-all" }}>{value}</div>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 20, flexWrap: "wrap" }}>
            {token.mintable && <Badge color="#7c3aed">Mintable</Badge>}
            <Badge color="#10b981">Burnable</Badge>
            <Badge color="#334155">ERC-20</Badge>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <a href={explorerUrl} target="_blank" rel="noreferrer" className="btn-outline" style={{ textDecoration: "none", fontSize: 14 }}>
            🔍 Ver no Explorer
          </a>
          <button className="btn-outline" onClick={addToMetaMask} style={{ fontSize: 14 }}>
            🦊 Adicionar à MetaMask
          </button>
          <button
            className="btn-outline"
            style={{ fontSize: 14 }}
            onClick={() => navigator.clipboard.writeText(token.token_address)}
          >
            📋 Copiar Endereço
          </button>
        </div>
      </div>
    </main>
  );
}

function Badge({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <span style={{
      fontSize: 12, fontWeight: 600, padding: "4px 12px",
      borderRadius: 999, background: `${color}18`, color, border: `1px solid ${color}30`,
    }}>
      {children}
    </span>
  );
}
