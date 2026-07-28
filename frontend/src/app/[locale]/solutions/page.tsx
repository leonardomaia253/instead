import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { Link } from "@/navigation";
import { REVENUE_LANDINGS, formatLandingPrice } from "@/lib/revenueLanding";

const groups = [
  { key: "token_factory", title: "Token Factory", description: "Receita transacional e serviços de lançamento para quem precisa publicar ativos com segurança." },
  { key: "lending", title: "Lending & Risk", description: "Assinaturas, fees, automações e serviços para usuários que operam crédito com colateral." },
  { key: "services", title: "Wealth & B2B", description: "Produtos de cockpit patrimonial e infraestrutura para parceiros distribuírem lending." },
] as const;

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
                <span>INSTEAD / REVENUE OS</span>
                <strong>{REVENUE_LANDINGS.length} VERTICAIS</strong>
              </div>
              <h1>Monetização DeFi com produto, não gambiarra.</h1>
              <p>
                Cada fonte de receita da Instead tem uma promessa clara, uma superfície pública e um caminho de conversão ligado ao produto real: factory, lending, proteção, wealth e B2B.
              </p>
              <div className="hero-actions">
                <Link href="/lending" className="btn-primary brutal-button">Entrar no lending</Link>
                <Link href="/factory" className="btn-outline brutal-button">Criar token</Link>
              </div>
            </div>

            <div className="solutions-command-card">
              <span>REVENUE MAP</span>
              <strong>{REVENUE_LANDINGS.length}</strong>
              <p>landings conectadas ao catálogo, checkout, admin e dashboard.</p>
              <div>
                <small>ACTIVE</small>
                <small>READY</small>
                <small>B2B</small>
                <small>RISK</small>
              </div>
            </div>
          </div>
        </section>

        {groups.map((group, groupIndex) => {
          const items = REVENUE_LANDINGS.filter((landing) => landing.source.vertical === group.key);
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
                        <small>{landing.source.billingInterval.replace("_", " ")}</small>
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
