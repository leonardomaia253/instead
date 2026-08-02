export type VisionPillar =
  | "intent_engine"
  | "token_factory"
  | "launchpad"
  | "lending"
  | "vaults"
  | "wallet"
  | "mobile"
  | "institutional"
  | "platform"
  | "security";

export type VisionStatus = "live" | "foundation" | "planned";

export type VisionImprovement = {
  id: number;
  pillar: VisionPillar;
  title: string;
  outcome: string;
  status: VisionStatus;
};

export const VISION_PILLARS: Record<VisionPillar, { label: string; promise: string }> = {
  intent_engine: {
    label: "Intent Engine",
    promise: "Transforma objetivos humanos em planos operacionais antes da assinatura.",
  },
  token_factory: {
    label: "Token Factory",
    promise: "Cria ativos digitais com presets, simulacao economica e revisao de risco.",
  },
  launchpad: {
    label: "Launchpad",
    promise: "Leva tokens do deploy para liquidez, vesting, transparencia e distribuicao.",
  },
  lending: {
    label: "Lending Router",
    promise: "Compara credito, risco, taxas e protecao em multiplos protocolos.",
  },
  vaults: {
    label: "Vaults",
    promise: "Organiza estrategias, performance, drawdown e protecao por perfil.",
  },
  wallet: {
    label: "Wallet UX",
    promise: "Abstrai assinatura, permissoes, lotes, sessoes e seguranca multi-dispositivo.",
  },
  mobile: {
    label: "Mobile",
    promise: "Empacota o command desk como PWA, Android, iOS e alertas nativos.",
  },
  institutional: {
    label: "Institucional",
    promise: "Entrega auditoria, permissoes, relatorios, compliance e operacao por equipe.",
  },
  platform: {
    label: "Platform",
    promise: "Abre APIs, SDKs, widgets, white-label e marketplace de integracoes.",
  },
  security: {
    label: "Security",
    promise: "Torna seguranca, observabilidade, provas e resposta a incidentes parte do produto.",
  },
};

const titles = [
  ["intent_engine", "Intent Engine em linguagem natural", "Usuario descreve objetivo e recebe fluxo executavel."],
  ["intent_engine", "Roteamento automatico entre protocolos", "Sistema escolhe rota por custo, liquidez e risco."],
  ["intent_engine", "Score de risco visual", "Toda assinatura recebe semaforo de risco e justificativa."],
  ["intent_engine", "Simulador de liquidacao em tempo real", "Mostra sensibilidade de preco, LTV e health factor."],
  ["intent_engine", "Autopilot de rebalanceamento", "Sugere ou executa regras aprovadas de rebalanceamento."],
  ["intent_engine", "Alertas multicanal inteligentes", "Telegram, email, push e app compartilham eventos criticos."],
  ["intent_engine", "Assistente AI de transacoes", "Explica chamada, impacto e risco antes da assinatura."],
  ["intent_engine", "Modo iniciante", "Remove jargao e reduz decisoes perigosas."],
  ["intent_engine", "Modo pro", "Expande metricas densas, atalhos e comparacoes."],
  ["intent_engine", "Modo institucional", "Adiciona aprovacao, logs, alçadas e relatorios."],
  ["token_factory", "Templates auditados", "Presets seguros reduzem erro de contrato."],
  ["token_factory", "ERC-20, ERC-4626, SBT e governance", "Factory cobre modelos de ativo alem do token basico."],
  ["token_factory", "Tokenomics simulator", "Simula supply, cap, taxas e diluicao."],
  ["token_factory", "Vesting e unlock simulator", "Mostra calendario e pressao de venda."],
  ["token_factory", "Gerador de documentacao do token", "Gera whitepaper curto, riscos e parametros."],
  ["token_factory", "Auditoria automatica inicial", "Detecta configuracoes perigosas antes do deploy."],
  ["token_factory", "Detector de parametros perigosos", "Bloqueia ou alerta mint/tax/blacklist agressivos."],
  ["token_factory", "Biblioteca de presets por uso", "Community, utility, RWA, governance e points."],
  ["token_factory", "Deploy multichain coordenado", "Publica ativos relacionados em varias redes."],
  ["token_factory", "Verificacao automatica no explorer", "Publica ABI e metadata depois do deploy."],
  ["launchpad", "Launchpad fair-launch", "Cria distribuicao inicial com regras transparentes."],
  ["launchpad", "Liquidity bootstrapping pools", "Ajuda projetos a descobrir preco com menos capital inicial."],
  ["launchpad", "Anti-sniper opcional", "Mitiga bots nos primeiros blocos."],
  ["launchpad", "Anti-rug transparency dashboard", "Mostra poderes administrativos, liquidez e vesting."],
  ["launchpad", "Vesting publico on-chain", "Calendario verificavel para time e investidores."],
  ["launchpad", "Pagina publica de token", "Cada token ganha status, dados e links confiaveis."],
  ["launchpad", "Token health score", "Mede concentracao, liquidez e risco administrativo."],
  ["launchpad", "Badge Instead verified", "Sinaliza tokens revisados por checklist."],
  ["launchpad", "Indexador de holders", "Mostra distribuicao e mudancas relevantes."],
  ["launchpad", "Analytics de supply", "Acompanha circulante, queimado, minted e locked."],
  ["lending", "Prime broker DeFi", "Consolida credito, colateral, risco e execucao."],
  ["lending", "Colateral multichain", "Agrupa garantias de varias redes numa visao unica."],
  ["lending", "Cross-chain collateral dashboard", "Mostra risco agregado por rede e protocolo."],
  ["lending", "Roteamento por menor taxa", "Ordena mercados por custo efetivo."],
  ["lending", "Roteamento por menor risco", "Prioriza isolamento, liquidez e historico."],
  ["lending", "Roteamento por maior liquidez", "Evita mercados rasos e slippage operacional."],
  ["lending", "Comparador de health factor", "Compara o mesmo borrow em varios protocolos."],
  ["lending", "Liquidation shield", "Sugere repay/deleverage antes da zona critica."],
  ["lending", "Stop-loss de divida", "Cria regra para reduzir exposicao automaticamente."],
  ["lending", "Repay automatico por regra", "Executa repagamento dentro de limites aprovados."],
  ["vaults", "Vaults ERC-4626", "Padroniza estrategias como cofres composaveis."],
  ["vaults", "Estrategias por perfil de risco", "Conservador, balanceado, agressivo e delta-neutral."],
  ["vaults", "Marketplace de estrategias", "Curadores e parceiros publicam estrategias."],
  ["vaults", "Historico por estrategia", "Performance transparente por periodo."],
  ["vaults", "Gestao de drawdown", "Mostra perda maxima e recuperacao."],
  ["vaults", "Black box recorder", "Registra decisoes e eventos da estrategia."],
  ["vaults", "Stress test de mercado", "Simula depeg, queda, taxa e liquidez."],
  ["vaults", "Protecao contra oracle depeg", "Sinaliza risco de oracle e ativo pareado."],
  ["vaults", "Estrategias delta-neutral", "Busca rendimento reduzindo exposicao direcional."],
  ["vaults", "Stablecoin conservative vaults", "Rotas defensivas para stablecoins."],
  ["wallet", "Wallet abstraction", "Reduz friccao sem abrir mao de autocustodia."],
  ["wallet", "Login wallet, email ou passkey", "Permite onboarding progressivo."],
  ["wallet", "Account abstraction", "Habilita gas sponsorship e politicas de sessao."],
  ["wallet", "Sessoes seguras com limites", "Assinaturas temporarias por valor e acao."],
  ["wallet", "Permissoes por dispositivo", "Revoga aparelhos e chaves parciais."],
  ["wallet", "Cofre de chaves para times", "Organiza operacao com multiplos operadores."],
  ["wallet", "Multi-sig simplificado", "Aprovacoes humanas sem complexidade excessiva."],
  ["wallet", "Assinatura em lote", "Agrupa operacoes para reduzir custo e erro."],
  ["wallet", "Pre-visualizacao sem jargao", "Mostra consequencia humana de cada transacao."],
  ["wallet", "Simular antes de assinar", "Cria uma etapa mental de undo antes da execucao."],
  ["mobile", "Android completo", "Evolui TWA para experiencia nativa quando fizer sentido."],
  ["mobile", "iOS nativo", "Entrega experiencia App Store e recursos Apple."],
  ["mobile", "Apple Wallet passes", "Memberships, tiers e access cards."],
  ["mobile", "Push notifications nativas", "Alertas de risco sem depender do browser."],
  ["mobile", "Widgets mobile", "Mostra posicao e risco na tela inicial."],
  ["mobile", "Watch app", "Alertas criticos em tempo real."],
  ["mobile", "Offline read-only", "Ultimo estado confiavel mesmo sem conexao."],
  ["mobile", "Deep links por acao", "Abre exatamente a operacao desejada."],
  ["mobile", "QR onboarding", "Eventos e comunidades entram por QR."],
  ["mobile", "Mobile command center", "Founder opera tudo pelo celular."],
  ["institutional", "Painel admin institucional", "Centraliza operacao, usuarios e riscos."],
  ["institutional", "Logs imutaveis", "Auditoria de quem fez o que e quando."],
  ["institutional", "Auditoria exportavel em PDF", "Relatorios para conselho, cliente e compliance."],
  ["institutional", "Relatorios fiscais", "Organiza eventos financeiros e on-chain."],
  ["institutional", "Relatorios de treasury", "Mostra caixa, posicoes, risco e rendimento."],
  ["institutional", "Permissoes por equipe", "Divide funcoes e poderes com seguranca."],
  ["institutional", "Aprovacao multinivel", "Alçadas para operacoes sensiveis."],
  ["institutional", "Compliance configuravel", "Workflows KYB/KYC e politicas internas."],
  ["institutional", "KYB/KYC opcional", "Fluxos regulados sem forcar todo usuario."],
  ["institutional", "Risk committee dashboard", "Visao executiva para decisao e governanca."],
  ["platform", "API publica", "Parceiros integram dados e acoes Instead."],
  ["platform", "SDK JavaScript", "Desenvolvedores usam primitives do protocolo."],
  ["platform", "SDK mobile", "Apps externos integram Instead no celular."],
  ["platform", "Webhooks on-chain", "Eventos acionam sistemas externos."],
  ["platform", "Widget de lending", "Parceiros embutem credito em suas interfaces."],
  ["platform", "Widget de token creation", "Cria token em fluxo white-label."],
  ["platform", "White-label fintechs", "Instituicoes usam a infraestrutura com sua marca."],
  ["platform", "White-label comunidades", "DAOs e creators lancam hubs proprios."],
  ["platform", "Portal de parceiros", "Gestao de credenciais, widgets e receita."],
  ["platform", "Marketplace de integracoes", "Conecta oraculos, KYC, analytics e execucao."],
  ["security", "Observability center", "Incidentes e sinais operacionais num painel."],
  ["security", "Status page publica", "Transparencia de disponibilidade."],
  ["security", "Bug bounty", "Incentiva pesquisa responsavel."],
  ["security", "Formal verification", "Prova propriedades de contratos criticos."],
  ["security", "Auditorias recorrentes", "Revisao independente continua."],
  ["security", "Circuit breakers on-chain", "Reduz dano em incidentes."],
  ["security", "Emergency pause transparente", "Pausa com logs, escopo e comunicacao."],
  ["security", "Insurance/risk reserve", "Reserva para eventos cobertos por politica."],
  ["security", "Proof-of-reserves/liabilities", "Mostra solvencia e exposicao."],
  ["security", "Instead OS", "Camada unica para criar ativos, acessar liquidez e medir risco."],
] as const;

export const VISION_ROADMAP: VisionImprovement[] = titles.map(([pillar, title, outcome], index) => ({
  id: index + 1,
  pillar: pillar as VisionPillar,
  title,
  outcome,
  status: index < 17 ? "foundation" : "planned",
}));

export function roadmapProgress() {
  const total = VISION_ROADMAP.length;
  const live = VISION_ROADMAP.filter((item) => item.status === "live").length;
  const foundation = VISION_ROADMAP.filter((item) => item.status === "foundation").length;
  return { total, live, foundation, planned: total - live - foundation };
}
