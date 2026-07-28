import type { RevenueSource } from "@/lib/revenueCatalog";
import { REVENUE_SOURCES } from "@/lib/revenueCatalog";

export const LENDING_PREMIUM_CODES = [
  "lending_pro_subscription",
  "liquidation_alerts_premium",
  "deleverage_assisted",
  "leverage_strategy_execution",
  "auto_rebalance_protection",
  "wealth_dashboard_subscription",
  "white_glove_lending",
  "b2b_lending_widget_api",
  "multi_protocol_routing_fee",
  "risk_shield_membership",
] as const;

export type LendingPremiumCode = (typeof LENDING_PREMIUM_CODES)[number];

export const LENDING_PREMIUM_PRODUCTS = REVENUE_SOURCES.filter((source) =>
  LENDING_PREMIUM_CODES.includes(source.sourceCode as LendingPremiumCode),
) as RevenueSource[];

export function liquidationRiskLabel(healthFactor: number) {
  if (!Number.isFinite(healthFactor) || healthFactor >= 999) return "Sem dívida ativa";
  if (healthFactor < 1.15) return "Crítico";
  if (healthFactor < 1.35) return "Alto";
  if (healthFactor < 1.7) return "Atenção";
  return "Saudável";
}

export function liquidationRecommendation(healthFactor: number) {
  if (!Number.isFinite(healthFactor) || healthFactor >= 999) return "Abra uma posição pequena antes de configurar automações.";
  if (healthFactor < 1.15) return "Repague parte da dívida ou adicione colateral imediatamente.";
  if (healthFactor < 1.35) return "Ative alertas premium e prepare um deleverage assistido.";
  if (healthFactor < 1.7) return "Considere reduzir LTV ou configurar proteção de rebalanceamento.";
  return "Posição saudável; simule alavancagem apenas com limite conservador.";
}

export function formatRevenuePrice(source: RevenueSource) {
  if (source.takeRateBps !== undefined) return `${source.takeRateBps} bps`;
  if (!source.amountUsdCents) return "Sob consulta";
  return `$${Math.round(source.amountUsdCents / 100).toLocaleString("en-US")}`;
}
