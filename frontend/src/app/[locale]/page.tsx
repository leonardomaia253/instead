"use client";

import React, { useEffect, useMemo, useRef } from "react";
import { Link } from "@/navigation";
import dynamic from "next/dynamic";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { GlobeCdn } from "@/components/GlobeCdn";
import { PlainLanguageGlossary, SimpleModeNotice } from "@/components/ElderFriendly";
import { CHAIN_META } from "@/lib/wagmi";
import { getPlatformStats, type PlatformStat } from "@/lib/supabase";
import { useSettings } from "@/hooks/useSettings";

const HealthGauge = dynamic(() => import("@/components/HealthGauge").then((mod) => mod.HealthGauge), { ssr: false });
const Scene3D = dynamic(() => import("@/components/Scene3D"), { ssr: false });

export default function Home() {
  const statsRef = useRef<HTMLDivElement>(null);
  const [platformStats, setPlatformStats] = React.useState<PlatformStat[]>([]);
  const { disable3D } = useSettings();

  useEffect(() => {
    async function loadStats() {
      try {
        const stats = await getPlatformStats();
        setPlatformStats(stats);
      } catch {
        setPlatformStats([]);
      }
    }
    loadStats();
  }, []);

  const stats = useMemo(
    () => [
      { label: "Valor total bloqueado", key: "total_value_locked" },
      { label: "Ativos lancados", key: "tokens_created" },
      { label: "Gas roteado", key: "fees_saved" },
      { label: "Redes ativas", key: "active_networks" },
    ],
    [],
  );

  const getStat = (key: string) => platformStats.find((item) => item.key === key)?.value || "Aguardando dados";

  return (
    <div className="site-shell">
      <Navbar />

      <main>
        <section className="proto-hero">
          <div className="proto-hero__grid" />
          {!disable3D && <Scene3D />}
          <div className="container proto-hero__inner">
            <div className="proto-hero__copy">
              <div className="terminal-kicker">
                <span>INSTEAD / LIQUIDITY OS</span>
                <strong>MAINNET READY INTERFACE</strong>
              </div>
              <h1>
                Liquidez cripto para quem constrói mercado, não vitrine.
              </h1>
              <p>
                Um front-end DeFi mais direto: lending, token factory, staking e inteligência operacional no mesmo painel. Brutal no visual, cuidadoso na execução.
              </p>
              <SimpleModeNotice title="Novo em cripto? Comece por aqui.">
                Escolha uma ação simples: criar um ativo, acompanhar risco ou ver planos assistidos. A plataforma sempre mostra uma revisão antes de qualquer assinatura ou custo.
              </SimpleModeNotice>
              <div className="hero-actions">
                <Link href="/lending" className="btn-primary brutal-button">Abrir lending</Link>
                <Link href="/factory" className="btn-outline brutal-button">Criar token</Link>
                <Link href="/solutions" className="btn-outline brutal-button">Ver planos</Link>
              </div>
              <div className="signal-strip" aria-label="Protocol signals">
                <span>AUTENTICAÇÃO SEGURA</span>
                <span>DADOS ISOLADOS</span>
                <span>MULTI-CHAIN</span>
                <span>MONITORAMENTO 24/7</span>
              </div>
            </div>

            <div className="proto-hero__visual">
              <div className="globe-frame">
                <div className="globe-frame__header">
                  <span>GLOBAL ROUTING MAP</span>
                  <strong>LIVE</strong>
                </div>
                {!disable3D ? (
                  <GlobeCdn />
                ) : (
                  <div className="globe-disabled">
                    <span>3D DISABLED</span>
                    <strong>Modo performance</strong>
                  </div>
                )}
                <div className="globe-frame__footer">
                  <span>Arbitrum</span>
                  <span>Base</span>
                  <span>Polygon</span>
                  <span>Ethereum</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section ref={statsRef} className="market-rail" aria-label="Protocol metrics">
          <div className="market-rail__track">
            {stats.concat(stats).map((item, index) => (
              <div className="market-tile" key={`${item.key}-${index}`}>
                <span>{item.label}</span>
                <strong>{getStat(item.key)}</strong>
              </div>
            ))}
          </div>
        </section>

        <section className="protocol-section">
          <div className="container">
            <div className="section-ledger">
              <span>01 / PRODUCT SURFACE</span>
              <h2>Quatro máquinas, uma linguagem.</h2>
            </div>

            <div className="brutal-grid">
              <div className="brutal-panel" style={{ cursor: "default" }}>
                <span className="panel-index">GUIA</span>
                <h3>Modo simples</h3>
                <p>Use as traduções e checklists nas telas para entender cada passo antes de conectar carteira ou assinar.</p>
              </div>
              <Link href="/lending" className="brutal-panel brutal-panel--large">
                <span className="panel-index">LND</span>
                <h3>Lending hub</h3>
                <p>Depósito, borrow e health factor com leitura de risco clara antes da assinatura.</p>
                <div className="panel-meter"><HealthGauge healthFactor={1.85} size={112} /></div>
              </Link>

              <Link href="/factory" className="brutal-panel">
                <span className="panel-index">TKN</span>
                <h3>Token factory</h3>
                <p>Launchpad sem código para ativos ERC-20 com supply, mint, burn e taxas configuráveis.</p>
              </Link>

              <Link href="/staking" className="brutal-panel">
                <span className="panel-index">STK</span>
                <h3>Staking vaults</h3>
                <p>APR, lock period e TVL em uma tela preparada para decisão rápida.</p>
              </Link>

              <Link href="/simulator" className="brutal-panel brutal-panel--lime">
                <span className="panel-index">SIM</span>
                <h3>Risk simulator</h3>
                <p>Simule liquidação e eficiência de capital antes de colocar patrimônio em jogo.</p>
              </Link>

              <Link href="/solutions" className="brutal-panel">
                <span className="panel-index">PLN</span>
                <h3>Planos e serviços</h3>
                <p>Escolha entre criação de token, lending, alertas, proteção de risco e painel multichain.</p>
              </Link>
            </div>
            <PlainLanguageGlossary
              items={[
                { term: "Carteira", meaning: "Sua forma de entrar e confirmar ações. Ela não envia dinheiro sem uma confirmação separada." },
                { term: "Token", meaning: "Um ativo digital configurável, parecido com uma ficha ou unidade própria do seu projeto." },
                { term: "Lending", meaning: "Emprestar ou tomar emprestado usando ativos digitais como garantia, com risco de liquidação." },
              ]}
            />
          </div>
        </section>

        <section className="protocol-section protocol-section--split">
          <div className="container split-proof">
            <div className="section-ledger">
              <span>02 / ARQUITETURA DE SEGURANÇA</span>
              <h2>Transparência e proteção institucional.</h2>
            </div>
            <div className="proof-stack">
              {[
                ["AUTENTICAÇÃO", "Conexão de carteira sem custódia com criptografia de ponta a ponta."],
                ["PRIVACIDADE", "Isolamento absoluto de dados e permissões estritas para cada investidor."],
                ["PROTEÇÃO", "Proteção avançada contra ataques, limite de requisições e firewall ativo."],
                ["RESILIÊNCIA", "Arquitetura distribuída com alta disponibilidade e execução ultrarrápida."],
              ].map(([code, text]) => (
                <div className="proof-row" key={code}>
                  <strong>{code}</strong>
                  <span>{text}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="chain-tape">
          <div className="chain-tape__track">
            {Array(4).fill(Object.values(CHAIN_META)).flat().map((chain, index) => (
              <span key={`${chain.name}-${index}`}>{chain.icon} {chain.name}</span>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
