import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { IntentConsole } from "./IntentConsole";
import { VISION_PILLARS, VISION_ROADMAP, roadmapProgress, type VisionPillar } from "@/lib/visionRoadmap";

const pillarOrder = Object.keys(VISION_PILLARS) as VisionPillar[];

export default function InsteadOSPage() {
  const progress = roadmapProgress();
  const statusLabel = {
    live: "Disponível agora",
    foundation: "Disponibilidade limitada",
    planned: "Ainda indisponível",
  } as const;

  return (
    <div className="site-shell">
      <Navbar />
      <main className="os-shell">
        <section className="os-hero">
          <div className="container os-hero__inner">
            <span>INSTEAD OS</span>
            <h1>Encontre o caminho certo para o seu objetivo.</h1>
            <p>
              Descreva o que você quer fazer e veja as opções, os riscos e os próximos passos antes de movimentar seu patrimônio.
            </p>
            <div className="os-metrics">
              <strong>{progress.total}<small>recursos apresentados</small></strong>
              <strong>{progress.live}<small>disponíveis agora</small></strong>
              <strong>{progress.foundation}<small>com acesso limitado</small></strong>
            </div>
          </div>
        </section>

        <div className="container">
          <IntentConsole />

          <section className="os-roadmap">
            {pillarOrder.map((pillar) => {
              const items = VISION_ROADMAP.filter((item) => item.pillar === pillar);
              const meta = VISION_PILLARS[pillar];
              return (
                <article className="os-pillar" key={pillar}>
                  <div className="os-pillar__head">
                    <span>{meta.label}</span>
                    <h2>{meta.promise}</h2>
                  </div>
                  <div className="os-pillar__items">
                    {items.map((item) => (
                      <div className="os-item" key={item.id}>
                        <code>{String(item.id).padStart(3, "0")}</code>
                        <div>
                          <strong>{item.title}</strong>
                          <p>{item.outcome}</p>
                        </div>
                        <span data-status={item.status}>{statusLabel[item.status]}</span>
                      </div>
                    ))}
                  </div>
                </article>
              );
            })}
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
