import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { IntentConsole } from "./IntentConsole";
import { VISION_PILLARS, VISION_ROADMAP, roadmapProgress, type VisionPillar } from "@/lib/visionRoadmap";

const pillarOrder = Object.keys(VISION_PILLARS) as VisionPillar[];

export default function InsteadOSPage() {
  const progress = roadmapProgress();

  return (
    <div className="site-shell">
      <Navbar />
      <main className="os-shell">
        <section className="os-hero">
          <div className="container os-hero__inner">
            <span>INSTEAD OS / 100 MELHORIAS</span>
            <h1>O cockpit para criar ativos, acessar liquidez e controlar risco.</h1>
            <p>
              Esta pagina transforma a visao de 100 melhorias em backlog executavel dentro do produto. Cada bloco abaixo vira modulo, API, automacao ou fluxo de interface.
            </p>
            <div className="os-metrics">
              <strong>{progress.total}<small>melhorias mapeadas</small></strong>
              <strong>{progress.foundation}<small>fundacoes iniciadas</small></strong>
              <strong>{progress.planned}<small>proximas entregas</small></strong>
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
                        <span data-status={item.status}>{item.status}</span>
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
