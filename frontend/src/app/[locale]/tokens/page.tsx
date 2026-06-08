"use client";

import { useState, useEffect } from "react";
import { Link } from "@/navigation";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { supabase, type GeneratedToken } from "@/lib/supabase";
import { CHAIN_META } from "@/lib/wagmi";
import { TokenCardSkeleton } from "@/components/Skeleton";
import { Search, Filter, ExternalLink, Coins, ShieldCheck, ArrowUpDown } from "lucide-react";

export default function TokenExplorerPage() {
  const [tokens, setTokens] = useState<GeneratedToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedChain, setSelectedChain] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"newest" | "supply">("newest");

  useEffect(() => {
    async function fetchTokens() {
      try {
        const { data, error } = await supabase
          .from("generated_tokens")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) throw error;
        setTokens(data as GeneratedToken[]);
      } catch (err) {
        console.error("Erro ao buscar tokens:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchTokens();
  }, []);

  // Filtragem e Ordenação
  const filteredTokens = tokens
    .filter((t) => {
      const matchesSearch =
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        t.symbol.toLowerCase().includes(search.toLowerCase()) ||
        t.token_address.toLowerCase().includes(search.toLowerCase());
      
      const matchesChain = selectedChain === "all" || t.chain_id === parseInt(selectedChain);

      return matchesSearch && matchesChain;
    })
    .sort((a, b) => {
      if (sortBy === "newest") {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      } else {
        return b.initial_supply - a.initial_supply;
      }
    });

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "var(--bg-base)" }}>
      <Navbar />

      <main className="container" style={{ flex: 1, padding: "120px 24px" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 60 }}>
          <span style={{ 
            color: "var(--accent-1)", 
            fontSize: 14, 
            fontWeight: 700, 
            textTransform: "uppercase", 
            letterSpacing: 2 
          }}>
            Mapeamento On-Chain
          </span>
          <h1 className="gradient-text" style={{ 
            fontSize: "clamp(32px, 5vw, 48px)", 
            fontWeight: 800, 
            marginTop: 12,
            fontFamily: "'Space Grotesk', sans-serif" 
          }}>
            Token Hub Explorer
          </h1>
          <p style={{ color: "var(--text-muted)", marginTop: 16, maxWidth: 600, margin: "16px auto 0", lineHeight: 1.6 }}>
            Explore, pesquise e analise todos os ativos digitais e contratos inteligentes criados de forma no-code através da Instead Token Factory.
          </p>
        </div>

        {/* Controls Bar */}
        <div className="card" style={{ 
          padding: "20px 24px", 
          marginBottom: 40, 
          display: "flex", 
          gap: 16, 
          flexWrap: "wrap", 
          alignItems: "center",
          background: "var(--bg-surface)"
        }}>
          {/* Search Input */}
          <div style={{ flex: 1, minWidth: 260, position: "relative" }}>
            <Search size={18} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
            <input
              type="text"
              placeholder="Buscar por nome, símbolo ou contrato..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: 44, background: "rgba(0,0,0,0.2)" }}
            />
          </div>

          {/* Chain Filter */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 180 }}>
            <Filter size={16} style={{ color: "var(--text-muted)" }} />
            <select 
              value={selectedChain} 
              onChange={(e) => setSelectedChain(e.target.value)}
              style={{ background: "rgba(0,0,0,0.2)" }}
            >
              <option value="all">Todas as Redes</option>
              {Object.entries(CHAIN_META).map(([id, meta]) => (
                <option key={id} value={id}>{meta.name}</option>
              ))}
            </select>
          </div>

          {/* Sort Select */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 180 }}>
            <ArrowUpDown size={16} style={{ color: "var(--text-muted)" }} />
            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value as any)}
              style={{ background: "rgba(0,0,0,0.2)" }}
            >
              <option value="newest">Mais Recentes</option>
              <option value="supply">Maior Supply</option>
            </select>
          </div>
        </div>

        {/* Tokens Grid */}
        {loading ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 24 }}>
            {[...Array(6)].map((_, i) => (
              <TokenCardSkeleton key={i} />
            ))}
          </div>
        ) : filteredTokens.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: "80px 40px", color: "var(--text-muted)" }}>
            <Coins size={48} style={{ margin: "0 auto 20px", opacity: 0.4 }} />
            <h3 style={{ color: "white", marginBottom: 8 }}>Nenhum token encontrado</h3>
            <p>Tente ajustar seus filtros de busca ou rede.</p>
            <Link href="/factory" className="btn-primary" style={{ marginTop: 24, textDecoration: "none" }}>
              Criar Novo Token
            </Link>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 24 }}>
            {filteredTokens.map((token) => {
              const chain = CHAIN_META[token.chain_id];
              return (
                <Link 
                  key={token.id} 
                  href={`/token/${token.token_address}?chain=${token.chain_id}`}
                  style={{ textDecoration: "none" }}
                >
                  <div className="card" style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                    <div>
                      {/* Card Header */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                        <div>
                          <h3 style={{ fontSize: 18, fontWeight: 700, color: "white", marginBottom: 4 }}>{token.name}</h3>
                          <span style={{ color: "var(--accent-1)", fontWeight: 700, fontSize: 14 }}>${token.symbol}</span>
                        </div>
                        <span style={{ fontSize: 20 }} title={chain?.name}>
                          {chain?.icon}
                        </span>
                      </div>

                      {/* Token Info */}
                      <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13, color: "var(--text-muted)", marginBottom: 20 }}>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span>Contrato:</span>
                          <span style={{ fontFamily: "monospace", color: "var(--text-primary)" }}>
                            {token.token_address.slice(0, 6)}...{token.token_address.slice(-4)}
                          </span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span>Supply Inicial:</span>
                          <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>
                            {token.initial_supply.toLocaleString()}
                          </span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span>Rede:</span>
                          <span style={{ color: "var(--text-primary)" }}>{chain?.name || `Chain ${token.chain_id}`}</span>
                        </div>
                      </div>
                    </div>

                    {/* Card Footer */}
                    <div style={{ 
                      display: "flex", 
                      justifyContent: "space-between", 
                      alignItems: "center", 
                      paddingTop: 16, 
                      borderTop: "1px solid var(--border)" 
                    }}>
                      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                        {new Date(token.created_at).toLocaleDateString("pt-BR")}
                      </span>
                      <span style={{ 
                        display: "flex", 
                        alignItems: "center", 
                        gap: 6, 
                        fontSize: 12, 
                        color: "var(--accent-1)", 
                        fontWeight: 600 
                      }}>
                        Analisar Ativo <ExternalLink size={12} />
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}