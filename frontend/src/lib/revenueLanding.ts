import { REVENUE_SOURCES, type RevenueSource, type RevenueVertical } from "@/lib/revenueCatalog";

export type RevenueLanding = {
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
  token_factory: { label: "Abrir Token Factory", href: "/factory" },
  lending: { label: "Abrir Lending Hub", href: "/lending" },
  services: { label: "Ver Command Desk", href: "/dashboard" },
};

const landingCopy: Record<string, Omit<RevenueLanding, "source" | "slug" | "ctaLabel" | "ctaHref">> = {
  token_deploy_basic: {
    eyebrow: "Token Factory / Deploy",
    headline: "Token no ar sem transformar launch em operação manual.",
    subheadline: "Deploy assistido para projetos que querem sair do formulário para a mainnet com validação, checkout e trilha operacional clara.",
    audience: "Founders, comunidades e operações que precisam publicar um ERC-20 com previsibilidade.",
    outcome: "Token configurado, publicado e rastreável no fluxo da Instead.",
    bullets: ["Configuração guiada de supply e permissões.", "Checkout integrado Stripe/Pagar.me.", "Execução via factory EVM já instrumentada."],
    proof: "Ideal para converter demanda de criação de token em receita transacional direta.",
  },
  token_deploy_premium: {
    eyebrow: "Token Factory / Premium",
    headline: "Deploy premium para quem não pode errar o primeiro contrato.",
    subheadline: "Pacote com configuração, publicação e validação para projetos que tratam o contrato como infraestrutura séria.",
    audience: "Projetos com marca, comunidade ou tesouraria que exigem acabamento institucional.",
    outcome: "Menos risco operacional e mais confiança no lançamento.",
    bullets: ["Checklist de parâmetros críticos.", "Acompanhamento humano no fluxo de publicação.", "Validação pós-deploy e handoff para operação."],
    proof: "Produto de maior ticket para capturar usuários que precisam de suporte e não só de botão.",
  },
  token_fair_launch_assisted: {
    eyebrow: "Launch / Liquidez",
    headline: "Fair launch com plano, liquidez e sala de controle.",
    subheadline: "Uma oferta assistida para preparar lançamento, liquidez inicial e comunicação operacional sem improviso.",
    audience: "Times lançando comunidade, utility token ou ativo experimental com responsabilidade.",
    outcome: "Lançamento com checklist, sequência e acompanhamento.",
    bullets: ["Preparação do cronograma de lançamento.", "Orientação de liquidez inicial e riscos.", "Acompanhamento nos primeiros momentos críticos."],
    proof: "Transforma factory em serviço completo, não apenas geração de contrato.",
  },
  lending_borrow_fee: {
    eyebrow: "Lending / Transaction Fee",
    headline: "Borrow com taxa transparente embutida na rota.",
    subheadline: "A Instead monetiza execução de crédito sem custodiar o usuário: a taxa aparece como conveniência pela experiência e roteamento.",
    audience: "Usuários que querem tomar liquidez com leitura clara de risco.",
    outcome: "Receita por transação conforme uso real do lending.",
    bullets: ["Fee de borrow configurado no contrato.", "Leitura de health factor antes da ação.", "Base para escalar volume sem depender só de assinatura."],
    proof: "A vertical transacional que conecta produto, contrato e caixa.",
  },
  lending_pro_subscription: {
    eyebrow: "Lending Pro",
    headline: "O painel que avisa antes do mercado cobrar caro.",
    subheadline: "Health factor, histórico, risco de liquidação, recomendações e alertas para usuário operar dívida com maturidade.",
    audience: "Usuários recorrentes de Aave-like lending, alavancagem moderada e tesourarias pequenas.",
    outcome: "Mais retenção, mais segurança percebida e receita mensal.",
    bullets: ["Dashboard de saúde da posição.", "Alertas e recomendações acionáveis.", "Simulações antes de aumentar risco."],
    proof: "A assinatura principal para transformar lending em produto recorrente.",
  },
  liquidation_alerts_premium: {
    eyebrow: "Risk Alerts",
    headline: "Alerta bom não grita tarde; ele cutuca cedo.",
    subheadline: "Alertas premium antecipam risco, suportam múltiplos canais e sugerem a próxima ação quando o health factor entra em zona quente.",
    audience: "Usuários com dívida ativa que não ficam olhando gráfico o dia inteiro.",
    outcome: "Redução de sustos e aumento de confiança para manter posições.",
    bullets: ["Thresholds mais sensíveis.", "Telegram como canal principal.", "Sugestão de repay, colateral ou deleverage."],
    proof: "Monetiza a dor mais concreta do lending: medo de liquidação.",
  },
  deleverage_assisted: {
    eyebrow: "Protection Desk",
    headline: "Quando o risco sobe, a Instead ajuda a desmontar com calma.",
    subheadline: "Serviço pontual para reduzir exposição, repagar dívida ou reorganizar colateral em momentos de stress.",
    audience: "Usuários com posição grande ou health factor pressionado.",
    outcome: "Receita por intervenção de alto valor em momentos críticos.",
    bullets: ["Diagnóstico da posição.", "Plano de redução de LTV.", "Execução assistida com assinatura do usuário."],
    proof: "Uma vertical de serviço que nasce exatamente onde o usuário mais sente urgência.",
  },
  leverage_strategy_execution: {
    eyebrow: "Strategy Execution",
    headline: "Alavancagem com limite, roteiro e trava de bom senso.",
    subheadline: "Templates para depositar, tomar, recomprar e repetir com parâmetros de segurança explícitos.",
    audience: "Operadores avançados que querem eficiência de capital sem voo cego.",
    outcome: "Fee por execução guiada e maior volume qualificado.",
    bullets: ["Templates conservadores por perfil.", "Preview de risco antes da assinatura.", "Handoff para monitoramento pós-execução."],
    proof: "Produto de execução para quem quer estratégia, não só dashboard.",
  },
  auto_rebalance_protection: {
    eyebrow: "Automation / Rebalance",
    headline: "Proteção automática, mas com o usuário no comando.",
    subheadline: "Regras que recomendam ou executam ajustes autorizados quando risco, LTV ou mercado cruzam limites configurados.",
    audience: "Usuários de lending que querem proteção recorrente sem delegar custódia.",
    outcome: "Assinatura premium com automações configuráveis.",
    bullets: ["Thresholds por posição.", "Intents auditáveis.", "Telegram e dashboard como superfície de controle."],
    proof: "A ponte entre alerta e ação — onde a plataforma ganha defensibilidade.",
  },
  wealth_dashboard_subscription: {
    eyebrow: "Wealth Dashboard",
    headline: "Uma visão patrimonial multichain que não parece planilha quebrada.",
    subheadline: "Dívida, colateral, rendimento, risco e histórico em uma única mesa operacional.",
    audience: "Usuários com ativos em várias redes e protocolos.",
    outcome: "Assinatura por clareza patrimonial e governança pessoal.",
    bullets: ["Saldos e posições consolidados.", "Risco e PnL em camadas.", "Histórico operacional para decisão."],
    proof: "Amplia a Instead para além do lending: vira cockpit financeiro cripto.",
  },
  white_glove_lending: {
    eyebrow: "White-glove",
    headline: "Mesa premium para estruturar crédito com colateral.",
    subheadline: "Atendimento assistido para tickets maiores, com planejamento de posição, risco e acompanhamento.",
    audience: "Baleias menores, founders, tesourarias e usuários que valorizam suporte humano.",
    outcome: "Receita high-ticket sem depender de volume massivo.",
    bullets: ["Estruturação de posição.", "Plano de risco e saída.", "Acompanhamento com alertas e revisão."],
    proof: "Serviço premium que pode financiar o crescimento enquanto o produto escala.",
  },
  b2b_lending_widget_api: {
    eyebrow: "B2B / Widget API",
    headline: "Outros sites podem vender lending com a infraestrutura da Instead.",
    subheadline: "Widget/API para comunidades, wallets e parceiros embutirem experiência de lending com revenue share.",
    audience: "Parceiros com audiência cripto e pouca infraestrutura DeFi própria.",
    outcome: "Receita B2B mensal e participação por uso.",
    bullets: ["Provisionamento no admin.", "API key e domínio do parceiro.", "Catálogo de produtos e revenue share."],
    proof: "Uma alavanca de distribuição: a Instead vira infraestrutura, não só destino.",
  },
  multi_protocol_routing_fee: {
    eyebrow: "Routing Fee",
    headline: "Melhor rota de crédito vale mais que uma lista de protocolos.",
    subheadline: "Comparação entre mercados e protocolos para otimizar taxa, risco e liquidez — com fee transparente por roteamento.",
    audience: "Usuários que querem a melhor execução sem comparar Aave, Compound, Spark, Morpho e similares manualmente.",
    outcome: "Receita por economia/execução quando múltiplos protocolos entram em produção.",
    bullets: ["Comparação de taxa e risco.", "Roteamento por chain e protocolo.", "Fee pequeno sobre execução qualificada."],
    proof: "Vertical preparada para capturar valor conforme a malha multiprotocolo amadurece.",
  },
  risk_shield_membership: {
    eyebrow: "Risk Shield",
    headline: "Camada de proteção sem vender fantasia de seguro infinito.",
    subheadline: "Membership com relatórios, playbooks, limites e proteção operacional clara — sem prometer cobertura impossível.",
    audience: "Usuários que aceitam pagar por disciplina de risco recorrente.",
    outcome: "Receita premium com posicionamento honesto de proteção.",
    bullets: ["Playbooks por cenário de mercado.", "Limites e relatórios recorrentes.", "Proteção baseada em regras e reservas explícitas."],
    proof: "A narrativa de confiança da plataforma, com limites bem comunicados.",
  },
};

export const REVENUE_LANDINGS: RevenueLanding[] = REVENUE_SOURCES.map((source) => {
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
  return REVENUE_LANDINGS.find((landing) => landing.slug === slug);
}

export function formatLandingPrice(source: RevenueSource) {
  if (source.takeRateBps !== undefined) return `${source.takeRateBps} bps por execução`;
  if (!source.amountUsdCents) return "Sob consulta";
  const usd = Math.round(source.amountUsdCents / 100).toLocaleString("en-US");
  return `$${usd}${source.billingInterval === "monthly" ? "/mês" : ""}`;
}
