"use client";

import { useState, useEffect } from "react";
import { Link } from "@/navigation";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { supabase, type GeneratedToken } from "@/lib/supabase";
import { CHAIN_META } from "@/lib/wagmi";
import { TokenCardSkeleton } from "@/components/Skeleton";
import { Search, Filter, ExternalLink, ArrowUpDown } from "lucide-react";
import { EmptyState, FilterBar, PageHeader, ProductShell } from "@/components/ui/Institutional";

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
    <div className="public-page-frame">
      <Navbar />

      <ProductShell width="wide" className="token-explorer">
        {/* Header */}
        <PageHeader
          eyebrow="Registro on-chain"
          title="Ativos emitidos pela Instead"
          description="Consulte contratos, oferta e rede de cada ativo publicado. Informação verificável, sem linguagem promocional."
        />

        {/* Controls Bar */}
        <FilterBar>
          {/* Search Input */}
          <div className="filter-field filter-field--search">
            <Search size={16} aria-hidden="true" />
            <input
              type="text"
              placeholder="Buscar por nome, símbolo ou contrato..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="filter-field__control"
            />
          </div>

          {/* Chain Filter */}
          <div className="filter-field">
            <Filter size={15} aria-hidden="true" />
            <select 
              value={selectedChain} 
              onChange={(e) => setSelectedChain(e.target.value)}
              className="filter-field__control"
            >
              <option value="all">Todas as Redes</option>
              {Object.entries(CHAIN_META).map(([id, meta]) => (
                <option key={id} value={id}>{meta.name}</option>
              ))}
            </select>
          </div>

          {/* Sort Select */}
          <div className="filter-field">
            <ArrowUpDown size={15} aria-hidden="true" />
            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value as any)}
              className="filter-field__control"
            >
              <option value="newest">Mais Recentes</option>
              <option value="supply">Maior Supply</option>
            </select>
          </div>
        </FilterBar>

        {/* Tokens Grid */}
        {loading ? (
          <div className="asset-grid">
            {[...Array(6)].map((_, i) => (
              <TokenCardSkeleton key={i} />
            ))}
          </div>
        ) : filteredTokens.length === 0 ? (
          <EmptyState
            title="Nenhum ativo encontrado"
            description="Ajuste a busca ou selecione outra rede. Você também pode iniciar uma nova emissão."
            action={<Link href="/factory" className="btn-primary">Iniciar emissão</Link>}
          />
        ) : (
          <div className="asset-grid">
            {filteredTokens.map((token) => {
              const chain = CHAIN_META[token.chain_id];
              return (
                <Link 
                  key={token.id} 
                  href={`/token/${token.token_address}?chain=${token.chain_id}`}
                  className="asset-card-link"
                >
                  <article className="card asset-card asset-card--registry">
                    <div>
                      {/* Card Header */}
                      <div className="asset-card__header">
                        <div>
                          <h3 className="asset-card__name">{token.name}</h3>
                          <span className="asset-card__symbol">${token.symbol}</span>
                        </div>
                        <span className="asset-card__chain" title={chain?.name}>{chain?.name}</span>
                      </div>

                      {/* Token Info */}
                      <dl className="asset-card__facts">
                        <div>
                          <span>Contrato:</span>
                          <code>
                            {token.token_address.slice(0, 6)}...{token.token_address.slice(-4)}
                          </code>
                        </div>
                        <div>
                          <span>Supply Inicial:</span>
                          <strong>
                            {token.initial_supply.toLocaleString()}
                          </strong>
                        </div>
                        <div>
                          <span>Rede:</span>
                          <strong>{chain?.name || `Chain ${token.chain_id}`}</strong>
                        </div>
                      </dl>
                    </div>

                    {/* Card Footer */}
                    <footer className="asset-card__footer">
                      <time dateTime={token.created_at}>
                        {new Date(token.created_at).toLocaleDateString("pt-BR")}
                      </time>
                      <span className="asset-card__action">
                        Analisar ativo <ExternalLink size={11} />
                      </span>
                    </footer>
                  </article>
                </Link>
              );
            })}
          </div>
        )}
      </ProductShell>

      <Footer />
    </div>
  );
}
