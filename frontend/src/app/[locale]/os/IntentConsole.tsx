"use client";

import { useMemo, useState } from "react";
import { useAccount } from "wagmi";
import { buildIntentPlan } from "@/lib/intentEngine";

const examples = [
  "Quero criar um token com liquidez segura",
  "Quero tomar credito sem ser liquidado",
  "Quero proteger minha posicao se o ETH cair",
];

export function IntentConsole() {
  const { address } = useAccount();
  const [intent, setIntent] = useState(examples[0]);
  const [healthFactor, setHealthFactor] = useState("1.45");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "local" | "error">("idle");
  const [savedId, setSavedId] = useState<string | null>(null);
  const plan = useMemo(() => buildIntentPlan(intent, Number(healthFactor) || undefined), [intent, healthFactor]);

  async function persistPlan() {
    setSaveState("saving");
    setSavedId(null);
    try {
      const response = await fetch("/api/os/intents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: intent,
          healthFactor: Number(healthFactor) || undefined,
          walletAddress: address?.toLowerCase(),
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Could not persist intent");
      if (body.saved?.id) {
        setSavedId(body.saved.id);
        setSaveState("saved");
      } else {
        setSaveState("local");
      }
    } catch {
      setSaveState("error");
    }
  }

  return (
    <section className="os-console">
      <div className="os-console__input">
        <span>INTENT ENGINE / FOUNDATION</span>
        <h2>Digite um objetivo. A Instead transforma em rota, risco e proximas acoes.</h2>
        <textarea value={intent} onChange={(event) => setIntent(event.target.value)} rows={4} />
        <label>
          Health factor opcional
          <input value={healthFactor} onChange={(event) => setHealthFactor(event.target.value)} inputMode="decimal" />
        </label>
        <div className="os-console__examples">
          {examples.map((example) => (
            <button key={example} onClick={() => setIntent(example)}>{example}</button>
          ))}
        </div>
        <button className="os-console__save" onClick={persistPlan} disabled={saveState === "saving"}>
          {saveState === "saving" ? "Salvando plano..." : "Salvar plano de intent"}
        </button>
        {saveState === "saved" && <p className="os-console__status">Plano salvo: {savedId}</p>}
        {saveState === "local" && <p className="os-console__status">Plano gerado; persistencia indisponivel neste ambiente.</p>}
        {saveState === "error" && <p className="os-console__status os-console__status--error">Nao foi possivel salvar agora.</p>}
      </div>
      <div className="os-console__plan">
        <span className={`os-risk os-risk--${plan.risk}`}>{plan.risk}</span>
        <h3>{plan.title}</h3>
        <p>{plan.summary}</p>
        <strong>Rota recomendada</strong>
        <p>{plan.recommendedRoute}</p>
        <strong>Proximas acoes</strong>
        <ol>
          {plan.nextActions.map((action) => <li key={action}>{action}</li>)}
        </ol>
        {plan.blockedBy.length > 0 && (
          <div className="os-console__blockers">
            {plan.blockedBy.map((blocker) => <p key={blocker}>{blocker}</p>)}
          </div>
        )}
      </div>
    </section>
  );
}
