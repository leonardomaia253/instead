import { notFound } from "next/navigation";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { Link } from "@/navigation";
import { REVENUE_LANDINGS, formatLandingPrice, getRevenueLanding } from "@/lib/revenueLanding";

export function generateStaticParams() {
  return REVENUE_LANDINGS.map((landing) => ({ slug: landing.slug }));
}

export default async function RevenueSolutionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const landing = getRevenueLanding(slug);
  if (!landing) notFound();

  return (
    <div className="site-shell">
      <Navbar />
      <main>
        <section className="proto-hero solutions-hero">
          <div className="proto-hero__grid" />
          <div className="container solutions-hero__inner">
            <div className="proto-hero__copy">
              <div className="terminal-kicker">
                <span>{landing.eyebrow}</span>
                <strong>{formatLandingPrice(landing.source)}</strong>
              </div>
              <h1>{landing.headline}</h1>
              <p>{landing.subheadline}</p>
              <div className="hero-actions">
                <Link href={landing.ctaHref} className="btn-primary brutal-button">{landing.ctaLabel}</Link>
                <Link href="/solutions" className="btn-outline brutal-button">Ver todas as verticais</Link>
              </div>
            </div>

            <aside className="solutions-command-card">
              <span>OFFER BRIEF</span>
              <strong>{landing.source.label}</strong>
              <p>{landing.outcome}</p>
              <div>
                <small>{landing.source.category}</small>
                <small>{landing.source.status}</small>
                <small>{landing.source.productionReady ? "PROD READY" : "PLANNED"}</small>
              </div>
            </aside>
          </div>
        </section>

        <section className="protocol-section protocol-section--split">
          <div className="container solution-detail-grid">
            <div className="solution-detail-panel solution-detail-panel--lime">
              <span>PARA QUEM</span>
              <h2>{landing.audience}</h2>
            </div>
            <div className="solution-detail-panel">
              <span>COMO VENDE</span>
              <h2>{landing.source.revenueModel}</h2>
              <p>{landing.source.notes}</p>
            </div>
            <div className="solution-detail-panel solution-detail-panel--wide">
              <span>POR QUE CONVENCE</span>
              <h2>{landing.proof}</h2>
              <ul>
                {landing.bullets.map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
