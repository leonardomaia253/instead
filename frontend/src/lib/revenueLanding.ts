import { REVENUE_SOURCES, type RevenueSource, type RevenueVertical } from "@/lib/revenueCatalog";

export type PublicOfferLanding = {
  source: RevenueSource;
  slug: string;
  eyebrow: string;
  headline: string;
  subheadline: string;
  audience: string;
  outcome: string;
  bullets: string[];
  proof: string;
  ctaLabel: string;
  ctaHref: string;
};

const verticalCta: Record<RevenueVertical, { label: string; href: string }> = {
  token_factory: { label: "Criar meu token", href: "/factory" },
  lending: { label: "Abrir lending", href: "/lending" },
  services: { label: "Abrir painel", href: "/dashboard" },
};

const landingCopy: Record<string, Omit<PublicOfferLanding, "source" | "slug" | "ctaLabel" | "ctaHref">> = {
  token_deploy_basic: {
    eyebrow: "Token Factory",
    headline: "Crie um token sem escrever contrato do zero.",
    subheadline: "Configure nome, símbolo, supply e permissões em um fluxo guiado, com menos chance de errar parâmetros básicos antes do deploy.",
    audience: "Para comunidades, creators e projetos pequenos que precisam lançar um ERC-20 de forma simples.",
    outcome: "Você sai com um token configurado e pronto para acompanhar no painel.",
    bullets: ["Configuração guiada de supply e permissões.", "Checkout integrado antes da execução.", "Deploy pela factory da Instead nas redes suportadas."],
    proof: "Bom para quem quer começar com um token padrão sem depender de um desenvolvedor para cada ajuste.",
  },
  token_deploy_premium: {
    eyebrow: "Token Factory Premium",
    headline: "Lance seu token com revisão antes de publicar.",
    subheadline: "Um fluxo assistido para revisar parâmetros, permissões e próximos passos antes do contrato ir para a rede.",
    audience: "Para projetos com comunidade, marca ou tesouraria que precisam de mais cuidado no primeiro lançamento.",
    outcome: "Menos risco operacional antes do deploy e mais clareza depois da publicação.",
    bullets: ["Revisão de parâmetros críticos.", "Acompanhamento do fluxo de publicação.", "Validação pós-deploy para confirmar endereço e configuração."],
    proof: "Útil quando o custo de errar o contrato é maior que o custo de revisar direito.",
  },
  token_fair_launch_assisted: {
    eyebrow: "Fair Launch",
    headline: "Prepare o lançamento do token com mais ordem.",
    subheadline: "Ajuda para organizar contrato, liquidez inicial, comunicação e checklist de risco antes de abrir o token para o público.",
    audience: "Para times que vão lançar uma comunidade, utility token ou ativo experimental.",
    outcome: "Um lançamento com sequência clara, em vez de decisões soltas no dia do deploy.",
    bullets: ["Checklist de lançamento.", "Orientação de liquidez inicial e riscos.", "Acompanhamento nos primeiros momentos críticos."],
    proof: "Indicado para quem não quer descobrir os problemas de lançamento com usuários já esperando.",
  },
  lending_borrow_fee: {
    eyebrow: "Lending",
    headline: "Tome liquidez com leitura de risco antes de assinar.",
    subheadline: "Veja colateral, dívida, health factor e impacto da operação antes de confirmar qualquer transação.",
    audience: "Para usuários que querem usar crédito com colateral sem operar às cegas.",
    outcome: "Mais contexto antes do borrow e menos surpresa depois.",
    bullets: ["Resumo da posição antes da ação.", "Leitura de health factor.", "Taxas mostradas de forma transparente no fluxo."],
    proof: "O ponto principal não é apertar borrow; é entender se a posição continua segura.",
  },
  lending_pro_subscription: {
    eyebrow: "Lending Pro",
    headline: "Acompanhe suas posições antes que o risco vire urgência.",
    subheadline: "Health factor, histórico, alertas, simulações e recomendações para quem usa lending com frequência.",
    audience: "Para usuários com dívida ativa, posições recorrentes ou alavancagem moderada.",
    outcome: "Você entende quando agir, antes de ficar perto demais da liquidação.",
    bullets: ["Dashboard de saúde da posição.", "Alertas e recomendações acionáveis.", "Simulações antes de aumentar exposição."],
    proof: "Bom para quem quer operar crédito com rotina, não só entrar e torcer.",
  },
  liquidation_alerts_premium: {
    eyebrow: "Alertas de Liquidação",
    headline: "Receba alertas antes do risco apertar.",
    subheadline: "Configure avisos para acompanhar seu health factor e receber sugestões quando sua posição exigir atenção.",
    audience: "Para quem tem dívida ativa e não quer ficar monitorando tela o dia inteiro.",
    outcome: "Mais tempo para reagir quando o mercado muda contra sua posição.",
    bullets: ["Limites de alerta mais sensíveis.", "Telegram como canal principal.", "Sugestões de repay, colateral ou redução de risco."],
    proof: "O alerta certo vale mais quando chega cedo, claro e com próxima ação sugerida.",
  },
  deleverage_assisted: {
    eyebrow: "Redução de Risco",
    headline: "Reduza exposição quando sua posição ficar pressionada.",
    subheadline: "Suporte assistido para avaliar dívida, colateral e alternativas de ajuste quando o health factor cai.",
    audience: "Para usuários com posição relevante ou risco de liquidação aumentando.",
    outcome: "Um plano mais claro para reduzir LTV, repagar parte da dívida ou adicionar colateral.",
    bullets: ["Diagnóstico da posição.", "Plano de redução de risco.", "Execução sempre com assinatura do usuário."],
    proof: "Serve para momentos em que decidir rápido não deveria significar decidir no escuro.",
  },
  leverage_strategy_execution: {
    eyebrow: "Estratégias de Lending",
    headline: "Monte uma estratégia de alavancagem com limites visíveis.",
    subheadline: "Templates guiados para depositar, tomar, recomprar e repetir apenas dentro de parâmetros de risco definidos.",
    audience: "Para usuários avançados que querem eficiência de capital com disciplina.",
    outcome: "Você visualiza impacto, risco e sequência antes de assinar a estratégia.",
    bullets: ["Templates por perfil de risco.", "Preview antes da execução.", "Monitoramento depois da estratégia montada."],
    proof: "A diferença entre estratégia e aposta é saber onde ela quebra antes de começar.",
  },
  auto_rebalance_protection: {
    eyebrow: "Proteção Automática",
    headline: "Defina regras para proteger sua posição.",
    subheadline: "Configure limites para receber recomendações ou preparar ajustes quando risco, LTV ou mercado cruzarem zonas importantes.",
    audience: "Para quem quer proteção recorrente sem entregar custódia dos ativos.",
    outcome: "Mais disciplina operacional quando o mercado se move rápido.",
    bullets: ["Thresholds por posição.", "Ações propostas de forma auditável.", "Controle pelo painel e Telegram."],
    proof: "Automação boa não tira o usuário do comando; ela reduz atraso e esquecimento.",
  },
  wealth_dashboard_subscription: {
    eyebrow: "Wealth Dashboard",
    headline: "Veja dívida, colateral e saldos em uma mesa só.",
    subheadline: "Uma visão multichain para acompanhar posições, risco, histórico e patrimônio sem montar planilha manual.",
    audience: "Para usuários com ativos em várias redes, protocolos ou carteiras.",
    outcome: "Mais clareza sobre exposição total e decisões mais rápidas.",
    bullets: ["Saldos e posições consolidados.", "Risco e histórico operacional.", "Visão de dívida, colateral e rendimento."],
    proof: "Quem opera em várias redes precisa de uma visão única antes de decidir o próximo movimento.",
  },
  white_glove_lending: {
    eyebrow: "Lending Assistido",
    headline: "Estruture uma posição de crédito com acompanhamento humano.",
    subheadline: "Atendimento assistido para planejar colateral, dívida, limites e rotina de monitoramento.",
    audience: "Para usuários com tickets maiores ou pouca margem para erro operacional.",
    outcome: "Uma posição pensada antes da execução e acompanhada depois.",
    bullets: ["Planejamento da posição.", "Revisão de risco e saída.", "Acompanhamento com alertas e revisão."],
    proof: "Quando a posição é grande, suporte não é luxo; é gerenciamento de risco.",
  },
  b2b_lending_widget_api: {
    eyebrow: "Widget para Parceiros",
    headline: "Leve a experiência de lending da Instead para sua comunidade.",
    subheadline: "Um widget/API para parceiros oferecerem uma experiência de lending mais clara dentro do próprio site ou produto.",
    audience: "Para comunidades, wallets, portais cripto e parceiros com audiência própria.",
    outcome: "Seu público acessa lending com uma interface pronta e monitorável.",
    bullets: ["Widget embutível.", "Configuração por domínio autorizado.", "Experiência integrada ao catálogo da Instead."],
    proof: "Bom para quem tem distribuição, mas não quer construir toda a infraestrutura de lending do zero.",
  },
  multi_protocol_routing_fee: {
    eyebrow: "Roteamento de Crédito",
    headline: "Compare opções antes de escolher onde tomar liquidez.",
    subheadline: "Acompanhe alternativas entre mercados e protocolos para encontrar uma rota mais adequada de taxa, risco e liquidez.",
    audience: "Para usuários que não querem comparar protocolos manualmente a cada operação.",
    outcome: "Mais informação antes de escolher onde abrir ou ajustar uma posição.",
    bullets: ["Comparação de taxa e risco.", "Rotas por rede e protocolo.", "Explicação do trade-off antes da ação."],
    proof: "A melhor taxa isolada nem sempre é a melhor posição; contexto importa.",
  },
  risk_shield_membership: {
    eyebrow: "Risk Shield",
    headline: "Uma rotina de proteção para quem leva lending a sério.",
    subheadline: "Relatórios, limites, playbooks e alertas para manter posições dentro de uma política de risco mais clara.",
    audience: "Para usuários que querem operar com regras, não com improviso.",
    outcome: "Mais consistência ao acompanhar risco, mercado e decisões de ajuste.",
    bullets: ["Playbooks por cenário de mercado.", "Limites e relatórios recorrentes.", "Alertas e recomendações de proteção."],
    proof: "Não promete eliminar risco; ajuda você a enxergar e administrar melhor o risco que decidiu assumir.",
  },
};

export const PUBLIC_OFFER_LANDINGS: PublicOfferLanding[] = REVENUE_SOURCES.map((source) => {
  const cta = verticalCta[source.vertical];
  const copy = landingCopy[source.sourceCode];
  return {
    source,
    slug: source.sourceCode,
    ctaLabel: cta.label,
    ctaHref: cta.href,
    ...copy,
  };
});

export function getRevenueLanding(slug: string) {
  return PUBLIC_OFFER_LANDINGS.find((landing) => landing.slug === slug);
}

export function formatLandingPrice(source: RevenueSource) {
  if (source.takeRateBps !== undefined) return `${source.takeRateBps} bps`;
  if (!source.amountUsdCents) return "Sob consulta";
  const usd = Math.round(source.amountUsdCents / 100).toLocaleString("en-US");
  return `$${usd}${source.billingInterval === "monthly" ? "/mês" : ""}`;
}
