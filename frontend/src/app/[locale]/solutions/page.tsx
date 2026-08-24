import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { Link } from "@/navigation";
import { PUBLIC_OFFER_LANDINGS, formatLandingPrice } from "@/lib/revenueLanding";
import { PlainLanguageGlossary, SimpleModeNotice } from "@/components/ElderFriendly";

const groups = [
  {
    key: "token_factory",
    title: "Criar e lançar tokens",
    description: "Ferramentas e acompanhamento para configurar, revisar e publicar tokens com mais segurança.",
  },
  {
    key: "lending",
    title: "Operar crédito com controle",
    description: "Painel, alertas e assistência para acompanhar colateral, dívida e risco antes de assinar transações.",
  },
  {
    key: "services",
    title: "Acompanhar patrimônio e integrar parceiros",
    description: "Visão consolidada para usuários multichain e widget para parceiros que querem oferecer lending.",
  },
] as const;

function billingLabel(interval: string) {
  if (interval === "monthly") return "mensal";
  if (interval === "one_time") return "pagamento único";
  if (interval === "per_transaction") return "por transação";
  return "por uso";
}

export default function SolutionsPage() {
  return (
    <div className="site-shell">
      <Navbar />
      <main>
        <section className="proto-hero solutions-hero">
          <div className="proto-hero__grid" />
          <div className="container solutions-hero__inner">
            <div className="proto-hero__copy">
              <div className="terminal-kicker">
                <span>INSTEAD / PLANOS</span>
                <strong>ESCOLHA SEU FLUXO</strong>
              </div>
              <h1>Escolha como quer usar a Instead.</h1>
              <p>
                Crie tokens, opere lending, receba alertas de risco ou acompanhe posições multichain com uma interface feita para decisão clara antes da assinatura.
              </p>
              <SimpleModeNotice title="Como escolher sem conhecer cripto">
                Se quer criar um ativo, use Token. Se quer credito, comece por planos assistidos. Se ja tem posicoes, escolha alertas e painel de risco.
              </SimpleModeNotice>
              <div className="hero-actions">
                <Link href="/lending" className="btn-primary brutal-button">Entrar no lending</Link>
                <Link href="/factory" className="btn-outline brutal-button">Criar token</Link>
              </div>
            </div>

            <div className="solutions-command-card">
              <span>O QUE VOCÊ PODE FAZER</span>
              <strong>Token, crédito e risco</strong>
              <p>Escolha o que você quer fazer, veja o que está incluído e siga direto para a próxima etapa.</p>
              <div>
                <small>CRIAR TOKEN</small>
                <small>TOMAR LIQUIDEZ</small>
                <small>RECEBER ALERTAS</small>
                <small>ACOMPANHAR RISCO</small>
              </div>
            </div>
          </div>
        </section>
        <section className="protocol-section" style={{ paddingTop: 24, paddingBottom: 24 }}>
          <div className="container">
            <PlainLanguageGlossary
              items={[
                { term: "Criar token", meaning: "Configurar e publicar um ativo digital para um projeto." },
                { term: "Credito", meaning: "Usar ativos como garantia para acessar liquidez, com risco de liquidacao." },
                { term: "Alertas", meaning: "Avisos para agir antes que uma posicao fique perigosa." },
              ]}
            />
          </div>
        </section>

        {groups.map((group, groupIndex) => {
          const items = PUBLIC_OFFER_LANDINGS.filter((landing) => landing.source.vertical === group.key);
          return (
            <section className="protocol-section" key={group.key}>
              <div className="container">
                <div className="section-ledger">
                  <span>{String(groupIndex + 1).padStart(2, "0")} / {group.title}</span>
                  <div>
                    <h2>{group.title}</h2>
                    <p className="solutions-section-copy">{group.description}</p>
                  </div>
                </div>
                <div className="solutions-grid">
                  {items.map((landing) => (
                    <Link href={`/solutions/${landing.slug}`} className="solution-card" key={landing.slug}>
                      <span>{landing.eyebrow}</span>
                      <h3>{landing.source.label}</h3>
                      <p>{landing.subheadline}</p>
                      <div className="solution-card__meta">
                        <strong>{formatLandingPrice(landing.source)}</strong>
                        <small>{billingLabel(landing.source.billingInterval)}</small>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </section>
          );
        })}
      </main>
      <Footer />
    </div>
  );
}
