"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Link } from "@/navigation";
import { supabase, type GeneratedToken } from "@/lib/supabase";
import { CHAIN_META } from "@/lib/wagmi";
import { Skeleton } from "@/components/Skeleton";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { EmptyState, PageHeader, ProductShell } from "@/components/ui/Institutional";
import { Check, Copy, ExternalLink, Star, Wallet } from "lucide-react";

export default function TokenPage() {
  const params       = useParams();
  const searchParams = useSearchParams();
  const address      = params.address as string;
  const chainId      = parseInt(searchParams.get("chain") ?? "42161");

  const [token, setToken]     = useState<GeneratedToken | null>(null);
  const [loading, setLoading] = useState(true);
  const [favorited, setFavorited] = useState(false);
  const [copied, setCopied]   = useState(false);

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

  function handleCopy() {
    if (!token) return;
    navigator.clipboard.writeText(token.token_address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) return (
    <div className="public-page-frame">
      <Navbar />
      <ProductShell width="narrow" className="token-detail-shell">
        <div className="token-detail-loading">
          <Skeleton height={32} width="60%" />
          <Skeleton height={20} width="40%" />
          <div className="card token-detail-loading__card">
            {[...Array(6)].map((_, i) => <Skeleton key={i} height={18} />)}
          </div>
        </div>
      </ProductShell>
    </div>
  );

  if (!token) return (
    <div className="public-page-frame">
      <Navbar />
      <ProductShell width="narrow" className="token-detail-shell">
        <EmptyState
          title="Ativo não encontrado"
          description="O contrato pode ainda não ter sido indexado ou não pertencer à rede informada."
          action={<Link href="/tokens" className="btn-primary">Voltar ao registro</Link>}
        />
      </ProductShell>
      <Footer />
    </div>
  );

  const explorerUrl = chain?.explorer ? `${chain.explorer}/address/${token.token_address}` : "#";

  return (
    <div className="public-page-frame">
      <Navbar />
      <ProductShell width="narrow" className="token-detail-shell">
        <PageHeader
          eyebrow={`${chain?.name ?? `Rede ${chainId}`} · $${token.symbol}`}
          title={token.name}
          description="Registro do contrato, parâmetros de emissão e referências para verificação independente."
          backHref="/tokens"
          backLabel="Registro de ativos"
          action={
          <button
            className={`token-favorite${favorited ? " is-active" : ""}`}
            onClick={() => setFavorited(!favorited)}
            aria-pressed={favorited}
            aria-label={favorited ? "Remover dos favoritos" : "Adicionar aos favoritos"}
          >
            <Star size={16} fill={favorited ? "currentColor" : "none"} />
            {favorited ? "Acompanhando" : "Acompanhar"}
          </button>
          }
        />

        <section className="card token-record">
          <div className="token-record__grid">
            {[
              ["Endereço", `${token.token_address.slice(0, 10)}...${token.token_address.slice(-6)}`],
              ["Criador",  `${token.creator_wallet.slice(0, 10)}...${token.creator_wallet.slice(-6)}`],
              ["Supply Inicial", Number(token.initial_supply).toLocaleString()],
              ["Supply Máximo", Number(token.max_supply).toLocaleString()],
              ["Criado em", new Date(token.created_at).toLocaleDateString("pt-BR")],
              ["Chain ID", chainId],
            ].map(([label, value]) => (
              <div key={String(label)} className="token-record__field">
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>

          <div className="token-record__badges">
            {token.mintable && <Badge color="var(--accent-2)">Mintable</Badge>}
            <Badge color="#10b981">Burnable</Badge>
            <Badge color="#334155">ERC-20</Badge>
          </div>
        </section>

        {/* Actions */}
        <div className="token-record__actions">
          <a href={explorerUrl} target="_blank" rel="noreferrer" className="btn-outline">
            <ExternalLink size={14} /> Ver no explorer
          </a>
          <button className="btn-outline" onClick={addToMetaMask}>
            <Wallet size={14} /> Adicionar à carteira
          </button>
          <button
            className="btn-outline"
            onClick={handleCopy}
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? "Endereço copiado" : "Copiar endereço"}
          </button>
        </div>
      </ProductShell>
      <Footer />
    </div>
  );
}

function Badge({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <span className="token-record__badge" style={{ background: `${color}18`, color, borderColor: `${color}30` }}>
      {children}
    </span>
  );
}
