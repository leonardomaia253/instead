import { LENDING_PROTOCOLS } from "@/lib/lendingProtocols";

export type IntentKind = "create_token" | "borrow" | "protect_position" | "launch" | "monitor";
export type IntentRisk = "low" | "medium" | "high" | "critical";

export type IntentPlan = {
  kind: IntentKind;
  title: string;
  summary: string;
  risk: IntentRisk;
  nextActions: string[];
  recommendedRoute: string;
  blockedBy: string[];
};

const ROUTE_HINTS: Record<IntentKind, string> = {
  create_token: "Token Factory -> preset -> simulacao -> revisao -> deploy",
  borrow: "Lending Router -> comparar protocolo -> simular health factor -> assinar",
  protect_position: "Dashboard -> liquidation shield -> regra de alerta -> repay/deleverage",
  launch: "Token Factory -> fair launch -> liquidez -> pagina publica -> analytics",
  monitor: "Dashboard -> alertas -> Telegram/app -> auditoria",
};

export function classifyIntent(input: string): IntentKind {
  const text = input.toLowerCase();
  if (/(token|moeda|coin|erc|launch|lancar|lançar)/.test(text)) return "create_token";
  if (/(borrow|emprest|credito|crédito|liquidez|collateral|colateral)/.test(text)) return "borrow";
  if (/(liquid|risco|proteger|shield|rebalance|repay)/.test(text)) return "protect_position";
  if (/(fair|pool|vesting|holder|liquidity|liquidez inicial)/.test(text)) return "launch";
  return "monitor";
}

export function scoreIntentRisk(kind: IntentKind, healthFactor?: number): IntentRisk {
  if (kind === "protect_position") {
    if (!healthFactor || healthFactor >= 1.5) return "medium";
    if (healthFactor >= 1.2) return "high";
    return "critical";
  }
  if (kind === "borrow") {
    if (!healthFactor || healthFactor >= 1.6) return "medium";
    if (healthFactor >= 1.25) return "high";
    return "critical";
  }
  if (kind === "create_token" || kind === "launch") return "high";
  return "low";
}

export function recommendLendingRoute(risk: IntentRisk) {
  const production = LENDING_PROTOCOLS.filter((protocol) => protocol.productionReady);
  const planned = LENDING_PROTOCOLS.filter((protocol) => protocol.status === "planned");
  if (risk === "critical" || risk === "high") {
    return production[0]?.name ?? "Aave v3";
  }
  return planned[0]?.name ?? production[0]?.name ?? "Aave v3";
}

export function buildIntentPlan(input: string, healthFactor?: number): IntentPlan {
  const kind = classifyIntent(input);
  const risk = scoreIntentRisk(kind, healthFactor);
  const recommendedProtocol = recommendLendingRoute(risk);

  const baseActions: Record<IntentKind, string[]> = {
    create_token: [
      "Escolher preset auditavel",
      "Simular supply, mint, taxas e poderes administrativos",
      "Revisar parametros irreversiveis antes do deploy",
    ],
    borrow: [
      "Comparar custo efetivo e liquidez",
      "Simular queda do colateral ate HF 1.0",
      "Definir alerta ou regra de protecao antes de assinar",
    ],
    protect_position: [
      "Calcular distancia ate liquidacao",
      "Criar alerta multicanal",
      "Preparar repay ou deleverage assistido",
    ],
    launch: [
      "Definir liquidez inicial e vesting",
      "Publicar pagina de transparencia",
      "Ativar analytics de holders e supply",
    ],
    monitor: [
      "Consolidar posicoes e tokens",
      "Ativar timeline operacional",
      "Exportar eventos relevantes para auditoria",
    ],
  };

  return {
    kind,
    title: intentTitle(kind),
    summary: `Plano gerado para: "${input}". Risco ${risk}.`,
    risk,
    nextActions: baseActions[kind],
    recommendedRoute: kind === "borrow" || kind === "protect_position"
      ? `${ROUTE_HINTS[kind]} via ${recommendedProtocol}`
      : ROUTE_HINTS[kind],
    blockedBy: risk === "critical"
      ? ["Health factor baixo: simule repay/deleverage antes de nova exposicao."]
      : [],
  };
}

function intentTitle(kind: IntentKind) {
  if (kind === "create_token") return "Criar token com revisao de risco";
  if (kind === "borrow") return "Acessar liquidez com colateral";
  if (kind === "protect_position") return "Proteger posicao de liquidacao";
  if (kind === "launch") return "Lancar ativo com transparencia";
  return "Monitorar operacao cripto";
}
