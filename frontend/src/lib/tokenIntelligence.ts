export type TokenTemplate = "standard" | "ultimate" | "fair_launch" | "deflationary" | "superchain";

export type TokenAnalysisInput = {
  template: TokenTemplate;
  name: string;
  symbol: string;
  description: string;
  initialSupply: string;
  maxSupply: string;
  decimals: number;
  mintable: boolean;
  burnable: boolean;
  taxable: boolean;
  taxPercent: string;
  hasBlacklist: boolean;
  burnTax: boolean;
  maxWalletPercent: string;
  fairLaunchLiquidityEth: string;
};

export type TokenRiskLevel = "low" | "medium" | "high" | "critical";

export type TokenRiskFinding = {
  level: TokenRiskLevel;
  title: string;
  detail: string;
  mitigation: string;
};

export type TokenomicsSnapshot = {
  initialSupply: number;
  maxSupply: number;
  initialSupplyShare: number;
  reserveSupply: number;
  transferTaxBps: number;
  maxWalletBps: number;
  fairLaunchLiquidityEth: number;
  adminPowerScore: number;
  trustScore: number;
};

export type TokenIntelligenceReport = {
  templateLabel: string;
  riskLevel: TokenRiskLevel;
  snapshot: TokenomicsSnapshot;
  findings: TokenRiskFinding[];
  checklist: string[];
  docs: {
    oneLiner: string;
    parameterSummary: string[];
    publicRiskDisclosure: string[];
  };
};

const templateLabels: Record<TokenTemplate, string> = {
  standard: "Standard ERC-20",
  ultimate: "Modelo completo",
  fair_launch: "Fair launch",
  deflationary: "Deflacionario",
  superchain: "Alta performance L2",
};

export function analyzeTokenConfig(input: TokenAnalysisInput): TokenIntelligenceReport {
  const initialSupply = positiveNumber(input.initialSupply);
  const maxSupply = Math.max(positiveNumber(input.maxSupply), initialSupply);
  const taxPercent = Math.max(0, Number(input.taxPercent) || 0);
  const maxWalletPercent = Math.max(0, Number(input.maxWalletPercent) || 0);
  const fairLaunchLiquidityEth = Math.max(0, Number(input.fairLaunchLiquidityEth) || 0);
  const transferTaxBps = Math.round(taxPercent * 100);
  const maxWalletBps = Math.round(maxWalletPercent * 100);
  const reserveSupply = Math.max(0, maxSupply - initialSupply);
  const initialSupplyShare = maxSupply > 0 ? (initialSupply / maxSupply) * 100 : 0;
  const adminPowerScore = [
    input.mintable ? 30 : 0,
    input.hasBlacklist ? 25 : 0,
    input.taxable ? 20 : 0,
    reserveSupply > initialSupply ? 15 : 0,
    maxWalletBps > 0 ? 10 : 0,
  ].reduce((sum, value) => sum + value, 0);

  const findings: TokenRiskFinding[] = [];

  if (input.mintable) {
    findings.push({
      level: reserveSupply > initialSupply * 4 ? "high" : "medium",
      title: "Minting habilitado",
      detail: "O owner podera criar novos tokens ate o supply maximo.",
      mitigation: "Explique a politica de emissao e considere timelock ou multi-sig antes do lancamento publico.",
    });
  }

  if (input.hasBlacklist) {
    findings.push({
      level: "high",
      title: "Blacklist/compliance habilitado",
      detail: "Carteiras podem ser bloqueadas pela administracao do contrato.",
      mitigation: "Use apenas se houver necessidade clara e publique a politica de bloqueio.",
    });
  }

  if (input.taxable) {
    findings.push({
      level: taxPercent > 5 ? "critical" : "high",
      title: "Taxa de transferencia",
      detail: `Transferencias pagam ${taxPercent.toFixed(2)}%. Scanners podem marcar taxas altas como risco.`,
      mitigation: "Mantenha taxa baixa, documente destino da taxa e evite alterar a regra depois do lancamento.",
    });
  }

  if (maxWalletPercent > 0) {
    findings.push({
      level: maxWalletPercent < 0.5 ? "medium" : "low",
      title: "Limite anti-whale",
      detail: `Cada carteira fica limitada a ${maxWalletPercent.toFixed(2)}% do supply.`,
      mitigation: "Confirme que o limite nao bloqueia liquidez, market makers ou operacao normal.",
    });
  }

  if (input.template === "fair_launch" && fairLaunchLiquidityEth <= 0) {
    findings.push({
      level: "critical",
      title: "Fair launch sem liquidez",
      detail: "O modo fair launch precisa de liquidez inicial para abrir mercado com previsibilidade.",
      mitigation: "Defina liquidez inicial antes de publicar ou escolha outro template.",
    });
  }

  if (initialSupplyShare < 10 && input.mintable) {
    findings.push({
      level: "high",
      title: "Supply inicial muito baixo versus cap",
      detail: "Uma grande reserva mintavel pode gerar medo de diluicao.",
      mitigation: "Reduza o cap, aumente supply inicial ou publique calendario de emissao.",
    });
  }

  if (!input.name || input.name.length < 2 || !input.symbol || input.symbol.length < 2) {
    findings.push({
      level: "critical",
      title: "Identidade incompleta",
      detail: "Nome e simbolo sao permanentes depois do deploy.",
      mitigation: "Revise nome, ticker e comunicacao antes de assinar.",
    });
  }

  const riskLevel = highestRisk(findings);
  const trustScore = Math.max(0, 100 - adminPowerScore - riskPenalty(findings));

  return {
    templateLabel: templateLabels[input.template],
    riskLevel,
    snapshot: {
      initialSupply,
      maxSupply,
      initialSupplyShare,
      reserveSupply,
      transferTaxBps,
      maxWalletBps,
      fairLaunchLiquidityEth,
      adminPowerScore,
      trustScore,
    },
    findings,
    checklist: buildChecklist(input, findings),
    docs: {
      oneLiner: `${input.name || "Token"} (${input.symbol || "TICKER"}) usa o template ${templateLabels[input.template]} com supply inicial de ${compactNumber(initialSupply)}.`,
      parameterSummary: [
        `Supply inicial: ${compactNumber(initialSupply)} de ${compactNumber(maxSupply)} maximo.`,
        `Minting: ${input.mintable ? "habilitado" : "desabilitado"}. Burn: ${input.burnable ? "habilitado" : "desabilitado"}.`,
        `Taxa de transferencia: ${input.taxable ? `${taxPercent.toFixed(2)}%` : "desabilitada"}.`,
        `Blacklist/compliance: ${input.hasBlacklist ? "habilitada" : "desabilitada"}.`,
      ],
      publicRiskDisclosure: findings.length
        ? findings.map((finding) => `${finding.title}: ${finding.mitigation}`)
        : ["Configuracao sem alertas criticos detectados nesta revisao automatica inicial."],
    },
  };
}

function buildChecklist(input: TokenAnalysisInput, findings: TokenRiskFinding[]) {
  return [
    "Confirmar nome, simbolo e supply porque esses parametros ficam permanentes.",
    "Salvar politica publica para qualquer permissao administrativa habilitada.",
    input.mintable ? "Definir quem controla mint e como a chave sera protegida." : "Minting desabilitado reduz risco de diluicao.",
    input.taxable ? "Explicar destino e teto da taxa antes do lancamento." : "Sem taxa de transferencia melhora previsibilidade para holders.",
    findings.some((finding) => finding.level === "critical")
      ? "Resolver alertas criticos antes de assinar."
      : "Executar deploy apenas depois de revisar o resumo com a equipe.",
  ];
}

function positiveNumber(value: string) {
  const parsed = Number(String(value).replace(/[,_\s]/g, ""));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function highestRisk(findings: TokenRiskFinding[]): TokenRiskLevel {
  if (findings.some((finding) => finding.level === "critical")) return "critical";
  if (findings.some((finding) => finding.level === "high")) return "high";
  if (findings.some((finding) => finding.level === "medium")) return "medium";
  return "low";
}

function riskPenalty(findings: TokenRiskFinding[]) {
  return findings.reduce((sum, finding) => {
    if (finding.level === "critical") return sum + 30;
    if (finding.level === "high") return sum + 18;
    if (finding.level === "medium") return sum + 10;
    return sum + 4;
  }, 0);
}

function compactNumber(value: number) {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(2)}K`;
  return value.toLocaleString("en-US");
}
