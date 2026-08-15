"use client";

import React, { useEffect, useMemo, useRef } from "react";
import { Link } from "@/navigation";
import dynamic from "next/dynamic";
import { motion, useScroll, useTransform } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { GlobeCdn } from "@/components/GlobeCdn";
import { PlainLanguageGlossary, SimpleModeNotice } from "@/components/ElderFriendly";
import { CHAIN_META } from "@/lib/wagmi";
import { getPlatformStats, type PlatformStat } from "@/lib/supabase";
import { useSettings } from "@/hooks/useSettings";

const HealthGauge = dynamic(() => import("@/components/HealthGauge").then((mod) => mod.HealthGauge), { ssr: false });
const Scene3D = dynamic(() => import("@/components/Scene3D"), { ssr: false });

const productPanels = [
  {
    code: "GUIA",
    title: "Modo simples",
    copy: "Traducoes e checklists em cada tela para entender o passo antes de conectar carteira ou assinar.",
  },
  {
    code: "TKN",
    title: "Emissão de ativos",
    copy: "Emissão ERC-20 com oferta, permissões e taxas configuráveis, seguida de revisão técnica.",
    href: "/factory",
  },
  {
    code: "STK",
    title: "Staking",
    copy: "APR, período de bloqueio e TVL em uma leitura preparada para decisão consciente.",
    href: "/staking",
  },
  {
    code: "SIM",
    title: "Simulador de risco",
    copy: "Simule liquidação e eficiência de capital antes de comprometer patrimônio.",
    href: "/simulator",
    lime: true,
  },
  {
    code: "PLN",
    title: "Planos e serviços",
    copy: "Emissão, crédito, alertas, proteção de risco e acompanhamento multichain.",
    href: "/solutions",
  },
];

export default function Home() {
  const statsRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const [platformStats, setPlatformStats] = React.useState<PlatformStat[]>([]);
  const { disable3D } = useSettings();
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const gridY = useTransform(scrollYProgress, [0, 1], [0, 120]);
  const visualY = useTransform(scrollYProgress, [0, 1], [0, -90]);
  const copyY = useTransform(scrollYProgress, [0, 1], [0, 42]);
  const orbitRotate = useTransform(scrollYProgress, [0, 1], [0, 28]);

  useEffect(() => {
    async function loadStats() {
      try {
        setPlatformStats(await getPlatformStats());
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
        <section ref={heroRef} className="proto-hero">
          <motion.div className="proto-hero__grid" style={{ y: gridY }} />
          <div className="proto-hero__scanline" />
          {!disable3D && <Scene3D />}
          <div className="container proto-hero__inner">
            <motion.div className="proto-hero__copy" style={{ y: copyY }}>
              <div className="terminal-kicker">
                <span>INSTEAD / LIQUIDITY OS</span>
                <strong>EXECUTION DESK</strong>
              </div>
              <h1>Liquidez cripto para quem constroi mercado, nao vitrine.</h1>
              <p>
                Um cockpit DeFi direto: lending, token factory, staking e inteligencia operacional no mesmo plano. Visual de mesa de
                operacao, movimento de produto vivo, decisao sem maquiagem.
              </p>
              <SimpleModeNotice title="Novo em cripto? Comece por aqui.">
                Escolha uma acao simples: criar um ativo, acompanhar risco ou ver planos assistidos. A plataforma sempre mostra uma
                revisao antes de qualquer assinatura ou custo.
              </SimpleModeNotice>
              <div className="hero-actions">
                <Link href="/lending" className="btn-primary brutal-button">Abrir crédito</Link>
                <Link href="/solutions" className="btn-outline brutal-button">Conhecer a plataforma</Link>
              </div>
              <div className="signal-strip" aria-label="Protocol signals">
                <span>AUTH SEM CUSTODIA</span>
                <span>DADOS ISOLADOS</span>
                <span>ROTEIO MULTICHAIN</span>
                <span>RISCO EM TEMPO REAL</span>
              </div>
            </motion.div>

            <motion.div className="proto-hero__visual" style={{ y: visualY }}>
              <motion.div className="liquidity-orbit" style={{ rotate: orbitRotate }} aria-hidden="true">
                <span>BASE</span>
                <span>ARB</span>
                <span>ETH</span>
                <span>POLY</span>
              </motion.div>
              <div className="globe-frame">
                <div className="globe-frame__header">
                  <span>ORDERFLOW / ROUTING</span>
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
            </motion.div>
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
              <h2>Quatro produtos, uma linguagem operacional.</h2>
            </div>

            <div className="brutal-grid">
              <Link href="/lending" className="brutal-panel brutal-panel--large brutal-panel--instrument">
                <span className="panel-index">LND</span>
                <h3>Crédito com garantia</h3>
                <p>Depósito, tomada de crédito e fator de saúde com leitura clara antes da assinatura.</p>
                <div className="panel-meter"><HealthGauge healthFactor={1.85} size={112} /></div>
              </Link>
              {productPanels.map((panel) => {
                const className = `brutal-panel ${panel.lime ? "brutal-panel--lime" : ""}`;
                const content = (
                  <>
                    <span className="panel-index">{panel.code}</span>
                    <h3>{panel.title}</h3>
                    <p>{panel.copy}</p>
                  </>
                );
                return panel.href ? (
                  <Link key={panel.code} href={panel.href} className={className}>{content}</Link>
                ) : (
                  <div key={panel.code} className={className} style={{ cursor: "default" }}>{content}</div>
                );
              })}
            </div>
            <PlainLanguageGlossary
              items={[
                { term: "Carteira", meaning: "Sua forma de entrar e confirmar acoes. Ela nao envia dinheiro sem uma confirmacao separada." },
                { term: "Token", meaning: "Um ativo digital configuravel, parecido com uma ficha ou unidade propria do seu projeto." },
                { term: "Lending", meaning: "Emprestar ou tomar emprestado usando ativos digitais como garantia, com risco de liquidacao." },
              ]}
            />
          </div>
        </section>

        <section className="protocol-section protocol-section--split">
          <div className="container split-proof">
            <div className="section-ledger">
              <span>02 / ARQUITETURA DE SEGURANCA</span>
              <h2>Transparencia e protecao institucional.</h2>
            </div>
            <div className="proof-stack">
              {[
                ["AUTENTICACAO", "Conexao de carteira sem custodia com criptografia de ponta a ponta."],
                ["PRIVACIDADE", "Isolamento absoluto de dados e permissoes estritas para cada investidor."],
                ["PROTECAO", "Protecao avancada contra ataques, limite de requisicoes e firewall ativo."],
                ["RESILIENCIA", "Arquitetura distribuida com alta disponibilidade e execucao ultrarrapida."],
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
              <span key={`${chain.name}-${index}`}>{chain.name}</span>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
