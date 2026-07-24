"use client";

import { useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import {
  Activity,
  Banknote,
  CalendarDays,
  CheckCircle2,
  Flame,
  Megaphone,
  MessageSquareText,
  Target,
  TrendingUp,
  Users,
  DollarSign,
  Zap,
} from "lucide-react";

type RevenueLever = {
  name: string;
  price: number;
  monthlyGoal: number;
  closeRate: number;
  owner: string;
  promise: string;
};

type PipelineStage = {
  stage: string;
  goal: number;
  conversion: number;
  action: string;
};

const revenueLevers: RevenueLever[] = [
  {
    name: "Deploy assistido",
    price: 299,
    monthlyGoal: 35,
    closeRate: 0.18,
    owner: "Comercial",
    promise: "Token ERC-20 configurado, publicado e validado com suporte humano.",
  },
  {
    name: "Premium launch",
    price: 799,
    monthlyGoal: 12,
    closeRate: 0.08,
    owner: "Founder/Admin",
    promise: "Deploy multi-chain, pagina do token, checklist de risco e auditoria automatica.",
  },
  {
    name: "Creator dashboard",
    price: 49,
    monthlyGoal: 160,
    closeRate: 0.12,
    owner: "CS/Admin",
    promise: "Analytics, links publicos, holders, campanhas e alertas para comunidades.",
  },
  {
    name: "Setup agencia",
    price: 1500,
    monthlyGoal: 6,
    closeRate: 0.05,
    owner: "Parcerias",
    promise: "Pacote white-glove para agencias que lancam tokens para clientes.",
  },
];

const pipelineStages: PipelineStage[] = [
  {
    stage: "Prospects mapeados",
    goal: 1800,
    conversion: 0.32,
    action: "Listar founders Web3, DAOs, NFT projects, agencias e creators com comunidade ativa.",
  },
  {
    stage: "Conversas iniciadas",
    goal: 575,
    conversion: 0.42,
    action: "DM curta com oferta de revisao gratuita de tokenomics ou deploy assistido.",
  },
  {
    stage: "Calls/briefings",
    goal: 240,
    conversion: 0.28,
    action: "Diagnosticar objetivo do token, rede, supply, risco, comunidade e urgencia.",
  },
  {
    stage: "Propostas enviadas",
    goal: 67,
    conversion: 0.58,
    action: "Enviar uma das quatro ofertas com prazo de 72h e proximo passo claro.",
  },
  {
    stage: "Clientes fechados",
    goal: 39,
    conversion: 1,
    action: "Receber pagamento, executar onboarding e registrar expansao para assinatura.",
  },
];

const channels = [
  {
    channel: "X/Twitter Web3",
    cadence: "3 posts + 20 DMs/dia",
    owner: "Comercial",
    asset: "Threads sobre custo, seguranca e checklist de launch.",
  },
  {
    channel: "Telegram/Discord",
    cadence: "10 comunidades/dia",
    owner: "Comercial",
    asset: "Oferta: 10 deploys assistidos com desconto e revisao gratuita.",
  },
  {
    channel: "Reddit/Farcaster",
    cadence: "2 posts educativos/dia",
    owner: "Marketing",
    asset: "Guias sem spam: tokenomics, deploy ERC-20, erros comuns.",
  },
  {
    channel: "Agencias Web3",
    cadence: "50 abordagens/semana",
    owner: "Parcerias",
    asset: "Pacote white-label para lancar tokens de clientes.",
  },
  {
    channel: "GitHub/Product Hunt",
    cadence: "1 melhoria publica/semana",
    owner: "Admin",
    asset: "Demo, exemplos de tokens, changelog e landing tecnica.",
  },
];

const weeklyOperatingRhythm = [
  "Segunda: atualizar metas, revisar pipeline e definir lista de 450 prospects.",
  "Terca: publicar comparativos e iniciar 140 conversas novas.",
  "Quarta: fazer calls, revisar tokenomics e enviar propostas.",
  "Quinta: follow-up de propostas, fechar deploys assistidos e oferecer premium.",
  "Sexta: publicar resultados, depoimentos, tokens criados e atualizar playbook.",
];

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

// Margens líquidas por produto (gas + Stripe 2.9% + suporte humano + infra)
const PRODUCT_MARGINS = {
  onchain: 0.95,    // $5.00 on-chain — custo só gas ~$0.25
  dashboard: 0.85,  // $49/mês — custo infra + CS ~$7
  assisted: 0.70,   // $299 — ~2h suporte humano incluídas
  premium: 0.65,    // $799 — multi-chain + auditoria automática
  agency: 0.60,     // $1.500 — white-glove onboarding ~3h
} as const;

export default function AdminDashboard() {
  const [monthlyVisitors, setMonthlyVisitors] = useState(10000);
  const [leadConversion, setLeadConversion] = useState(0.18);
  const [salesConversion, setSalesConversion] = useState(0.22);
  const [averageTicket, setAverageTicket] = useState(420);

  // Simulador $1.000/dia — mix mensal de produtos
  const [qOnchain, setQOnchain] = useState(400);
  const [qDashboard, setQDashboard] = useState(200);
  const [qAssisted, setQAssisted] = useState(45);
  const [qPremium, setQPremium] = useState(14);
  const [qAgency, setQAgency] = useState(6);

  const dailyProfitBreakdown = useMemo(() => {
    const onchain   = { qty: qOnchain,   price: 5,    profit: qOnchain   * 5    * PRODUCT_MARGINS.onchain   };
    const dashboard = { qty: qDashboard, price: 49,   profit: qDashboard * 49   * PRODUCT_MARGINS.dashboard };
    const assisted  = { qty: qAssisted,  price: 299,  profit: qAssisted  * 299  * PRODUCT_MARGINS.assisted  };
    const premium   = { qty: qPremium,   price: 799,  profit: qPremium   * 799  * PRODUCT_MARGINS.premium   };
    const agency    = { qty: qAgency,    price: 1500, profit: qAgency    * 1500 * PRODUCT_MARGINS.agency    };
    const totalMonthly = onchain.profit + dashboard.profit + assisted.profit + premium.profit + agency.profit;
    const daily = totalMonthly / 30;
    return { onchain, dashboard, assisted, premium, agency, totalMonthly, daily };
  }, [qOnchain, qDashboard, qAssisted, qPremium, qAgency]);

  const dailyGoal = 1000;
  const dailyProgress = Math.min(100, Math.round((dailyProfitBreakdown.daily / dailyGoal) * 100));

  const monthlyTarget = 50000;
  const leverRevenue = useMemo(
    () => revenueLevers.reduce((sum, lever) => sum + lever.price * lever.monthlyGoal, 0),
    []
  );
  const projectedRevenue = Math.round(monthlyVisitors * leadConversion * salesConversion * averageTicket);
  const qualifiedLeads = Math.round(monthlyVisitors * leadConversion);
  const projectedCustomers = Math.round(qualifiedLeads * salesConversion);
  const targetProgress = Math.min(100, Math.round((projectedRevenue / monthlyTarget) * 100));
  const gap = Math.max(0, monthlyTarget - projectedRevenue);

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <div style={styles.kicker}>Revenue Command Center</div>
          <h1 style={styles.title}>Plano comercial 10x da Instead</h1>
          <p style={styles.subtitle}>
            Painel para o time administrativo e comercial transformar a Token Factory em receita previsivel:
            metas, funil, canais, ofertas e rotina semanal em um so lugar.
          </p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "flex-end" }}>
          <div style={styles.targetBox}>
            <Target size={22} />
            <span>Meta de 6 meses</span>
            <strong>{currencyFormatter.format(monthlyTarget)}/mes</strong>
          </div>
          <a
            href="../admin/prices"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 16px",
              background: "rgba(220,255,69,0.08)",
              border: "1px solid rgba(220,255,69,0.3)",
              color: "var(--accent-1)",
              textDecoration: "none",
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            💲 Gerenciar Preços
          </a>
        </div>
      </header>

      <section style={styles.metricGrid}>
        <MetricCard title="Receita projetada" value={currencyFormatter.format(projectedRevenue)} note={`${targetProgress}% da meta`} icon={<TrendingUp size={20} />} />
        <MetricCard title="Leads qualificados" value={qualifiedLeads.toLocaleString("en-US")} note={`${Math.round(leadConversion * 100)}% dos visitantes`} icon={<Users size={20} />} />
        <MetricCard title="Clientes estimados" value={projectedCustomers.toLocaleString("en-US")} note={`${Math.round(salesConversion * 100)}% dos leads`} icon={<CheckCircle2 size={20} />} />
        <MetricCard title="Gap mensal" value={currencyFormatter.format(gap)} note="Ajuste trafego, conversao ou ticket" icon={<Activity size={20} />} />
        <MetricCard
          title="Lucro/dia simulado"
          value={`$${Math.round(dailyProfitBreakdown.daily).toLocaleString("en-US")}`}
          note={dailyProfitBreakdown.daily >= dailyGoal ? "✅ Meta $1.000/dia atingida" : `${dailyProgress}% da meta de $1.000/dia`}
          icon={<DollarSign size={20} />}
          highlight={dailyProfitBreakdown.daily >= dailyGoal}
        />
      </section>

      {/* ===== SIMULADOR $1.000/DIA ===== */}
      <section className="card" style={styles.fullSection}>
        <div style={styles.sectionHeader}>
          <div>
            <h2 style={styles.sectionTitle}>Simulador — $1.000 de lucro por dia</h2>
            <p style={styles.sectionNote}>
              Ajuste o volume mensal de cada produto e veja em tempo real quantas conversões são necessárias para
              atingir <strong style={{ color: "var(--accent-1)" }}>$1.000/dia líquido</strong>.
            </p>
          </div>
          <Zap size={22} color="var(--accent-1)" />
        </div>

        <div style={styles.dailySimGrid}>
          {/* Sliders da esquerda */}
          <div style={{ display: "grid", gap: 20 }}>
            <Slider label="Token Deploy On-chain ($5 × 95%)" value={qOnchain} min={0} max={2000} step={10} suffix=" deploys/mês" onChange={setQOnchain} />
            <Slider label="Creator Dashboard ($49/mês × 85%)" value={qDashboard} min={0} max={1000} step={5} suffix=" assinaturas ativas" onChange={setQDashboard} />
            <Slider label="Deploy Assistido ($299 × 70%)" value={qAssisted} min={0} max={200} step={1} suffix=" vendas/mês" onChange={setQAssisted} />
            <Slider label="Premium Launch ($799 × 65%)" value={qPremium} min={0} max={100} step={1} suffix=" vendas/mês" onChange={setQPremium} />
            <Slider label="Setup Agência ($1.500 × 60%)" value={qAgency} min={0} max={50} step={1} suffix=" agências/mês" onChange={setQAgency} />
          </div>

          {/* Painel de resultados da direita */}
          <div style={styles.dailyResultPanel}>
            <div style={styles.dailyBigNumber}>
              <span style={styles.dailyLabel}>Lucro Líquido / Dia</span>
              <strong style={{
                ...styles.dailyValue,
                color: dailyProfitBreakdown.daily >= dailyGoal ? "var(--green)" : "var(--accent-1)"
              }}>
                ${Math.round(dailyProfitBreakdown.daily).toLocaleString("en-US")}
              </strong>
              <span style={styles.dailyMonthly}>
                {currencyFormatter.format(Math.round(dailyProfitBreakdown.totalMonthly))}/mês
              </span>
            </div>

            <div style={styles.progressTrack}>
              <div style={{ ...styles.progressFill, width: `${dailyProgress}%`, background: dailyProfitBreakdown.daily >= dailyGoal ? "var(--green)" : "var(--accent-grad)" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--text-muted)" }}>
              <span>$0</span>
              <span style={{ color: "var(--accent-1)", fontWeight: 700 }}>Meta: $1.000/dia</span>
              <span>$2.000</span>
            </div>

            <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
              {([
                { label: "On-chain",   profit: dailyProfitBreakdown.onchain.profit,   qty: dailyProfitBreakdown.onchain.qty,   unit: "deploys" },
                { label: "Dashboard",  profit: dailyProfitBreakdown.dashboard.profit, qty: dailyProfitBreakdown.dashboard.qty, unit: "assin." },
                { label: "Assistido",  profit: dailyProfitBreakdown.assisted.profit,  qty: dailyProfitBreakdown.assisted.qty,  unit: "vendas" },
                { label: "Premium",    profit: dailyProfitBreakdown.premium.profit,   qty: dailyProfitBreakdown.premium.qty,   unit: "vendas" },
                { label: "Agência",    profit: dailyProfitBreakdown.agency.profit,    qty: dailyProfitBreakdown.agency.qty,    unit: "setup" },
              ] as const).map(({ label, profit, qty, unit }) => (
                <div key={label} style={styles.breakdownRow}>
                  <span>{label}</span>
                  <span style={{ color: "var(--text-muted)", fontSize: 12 }}>{qty} {unit}</span>
                  <span style={{ color: "var(--green)", fontWeight: 700 }}>${Math.round(profit / 30).toLocaleString("en-US")}/dia</span>
                </div>
              ))}
            </div>

            {dailyProfitBreakdown.daily >= dailyGoal && (
              <div style={styles.goalBadge}>🎯 $1.000/dia atingido com este mix!</div>
            )}
          </div>
        </div>
      </section>

      <section style={styles.sectionGrid}>
        <div className="card" style={styles.calculator}>
          <div style={styles.sectionHeader}>
            <div>
              <h2 style={styles.sectionTitle}>Simulador de metas</h2>
              <p style={styles.sectionNote}>Use nas reunioes semanais para decidir se falta volume, oferta ou fechamento.</p>
            </div>
            <Banknote size={22} color="var(--accent-1)" />
          </div>

          <Slider label="Visitantes mensais" value={monthlyVisitors} min={1000} max={50000} step={500} suffix="" onChange={setMonthlyVisitors} />
          <Slider label="Conversao visitante -> lead" value={Math.round(leadConversion * 100)} min={2} max={40} step={1} suffix="%" onChange={(value) => setLeadConversion(value / 100)} />
          <Slider label="Conversao lead -> cliente" value={Math.round(salesConversion * 100)} min={3} max={45} step={1} suffix="%" onChange={(value) => setSalesConversion(value / 100)} />
          <Slider label="Ticket medio" value={averageTicket} min={49} max={1500} step={25} suffix=" USD" onChange={setAverageTicket} />

          <div style={styles.progressTrack}>
            <div style={{ ...styles.progressFill, width: `${targetProgress}%` }} />
          </div>
        </div>

        <div className="card" style={styles.playbook}>
          <div style={styles.sectionHeader}>
            <div>
              <h2 style={styles.sectionTitle}>Playbook de fechamento</h2>
              <p style={styles.sectionNote}>Oferta curta, diagnostico rapido e proximo passo com prazo.</p>
            </div>
            <Flame size={22} color="var(--accent-1)" />
          </div>
          {[
            "Gancho: crie seu token seguro em minutos, sem dev Solidity.",
            "Entrada: revisao gratuita de tokenomics para abrir conversa.",
            "Conversao: deploy assistido como primeira compra de baixo atrito.",
            "Expansao: premium launch e assinatura do dashboard apos o deploy.",
            "Prova: publicar tokens criados, prints do processo e depoimentos.",
          ].map((item) => (
            <div key={item} style={styles.checkItem}>
              <CheckCircle2 size={17} color="var(--green)" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="card" style={styles.fullSection}>
        <div style={styles.sectionHeader}>
          <div>
            <h2 style={styles.sectionTitle}>Escada de receita</h2>
            <p style={styles.sectionNote}>
              Mix mensal desenhado para bater 10x as metas iniciais sem depender de lending no curto prazo.
            </p>
          </div>
          <strong style={styles.revenueBadge}>{currencyFormatter.format(leverRevenue)}/mes</strong>
        </div>
        <div style={styles.offerGrid}>
          {revenueLevers.map((lever) => (
            <article key={lever.name} style={styles.offerCard}>
              <div style={styles.offerTopline}>
                <strong>{lever.name}</strong>
                <span>{currencyFormatter.format(lever.price)}</span>
              </div>
              <p style={styles.offerPromise}>{lever.promise}</p>
              <div style={styles.offerMeta}>
                <span>{lever.monthlyGoal} vendas/mes</span>
                <span>{Math.round(lever.closeRate * 100)}% close</span>
                <span>{lever.owner}</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section style={styles.sectionGrid}>
        <div className="card" style={styles.fullSection}>
          <div style={styles.sectionHeader}>
            <div>
              <h2 style={styles.sectionTitle}>Funil comercial mensal</h2>
              <p style={styles.sectionNote}>Numeros de trabalho para perseguir aproximadamente {currencyFormatter.format(monthlyTarget)}/mes.</p>
            </div>
            <MessageSquareText size={22} color="var(--accent-1)" />
          </div>
          <div style={styles.pipeline}>
            {pipelineStages.map((stage, index) => (
              <div key={stage.stage} style={styles.pipelineRow}>
                <div style={styles.pipelineIndex}>{index + 1}</div>
                <div>
                  <strong>{stage.stage}</strong>
                  <p>{stage.action}</p>
                </div>
                <div style={styles.pipelineGoal}>{stage.goal.toLocaleString("en-US")}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="card" style={styles.fullSection}>
          <div style={styles.sectionHeader}>
            <div>
              <h2 style={styles.sectionTitle}>Ritmo semanal</h2>
              <p style={styles.sectionNote}>Rotina simples para manter volume sem investimento em midia.</p>
            </div>
            <CalendarDays size={22} color="var(--accent-1)" />
          </div>
          {weeklyOperatingRhythm.map((item) => (
            <div key={item} style={styles.rhythmItem}>{item}</div>
          ))}
        </div>
      </section>

      <section className="card" style={styles.fullSection}>
        <div style={styles.sectionHeader}>
          <div>
            <h2 style={styles.sectionTitle}>Canais de tracao zero budget</h2>
            <p style={styles.sectionNote}>Cada canal tem cadencia, responsavel e ativo que precisa ser produzido.</p>
          </div>
          <Megaphone size={22} color="var(--accent-1)" />
        </div>
        <div style={styles.channelGrid}>
          {channels.map((channel) => (
            <article key={channel.channel} style={styles.channelCard}>
              <strong>{channel.channel}</strong>
              <span>{channel.cadence}</span>
              <p>{channel.asset}</p>
              <small>{channel.owner}</small>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function MetricCard({ title, value, note, icon, highlight = false }: { title: string; value: string; note: string; icon: ReactNode; highlight?: boolean }) {
  return (
    <div className="card" style={{
      ...styles.metricCard,
      ...(highlight ? { border: "1px solid var(--green)", background: "rgba(85,240,192,0.06)" } : {})
    }}>
      <div style={{ ...styles.metricIcon, ...(highlight ? { background: "rgba(85,240,192,0.15)", color: "var(--green)", border: "1px solid rgba(85,240,192,0.3)" } : {}) }}>{icon}</div>
      <span style={styles.metricTitle}>{title}</span>
      <strong style={{ ...styles.metricValue, ...(highlight ? { color: "var(--green)" } : {}) }}>{value}</strong>
      <small style={styles.metricNote}>{note}</small>
    </div>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix: string;
  onChange: (value: number) => void;
}) {
  return (
    <label style={styles.sliderLabel}>
      <span>
        {label}
        <strong>{value.toLocaleString("en-US")}{suffix}</strong>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        style={styles.range}
      />
    </label>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    padding: "32px",
    display: "grid",
    gap: "24px",
  },
  dailySimGrid: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1.2fr) minmax(280px, 1fr)",
    gap: 32,
    alignItems: "start",
  },
  dailyResultPanel: {
    display: "grid",
    gap: 14,
    border: "1px solid var(--border)",
    background: "var(--bg-surface)",
    padding: 24,
    alignContent: "start",
  },
  dailyBigNumber: {
    display: "grid",
    gap: 4,
    textAlign: "center",
  },
  dailyLabel: {
    fontSize: 12,
    fontWeight: 700,
    textTransform: "uppercase" as const,
    color: "var(--text-muted)",
    letterSpacing: 1,
  },
  dailyValue: {
    fontSize: 56,
    lineHeight: 1,
    fontFamily: "'Space Grotesk', sans-serif",
  },
  dailyMonthly: {
    fontSize: 14,
    color: "var(--text-muted)",
  },
  breakdownRow: {
    display: "grid",
    gridTemplateColumns: "80px 1fr auto",
    gap: 8,
    alignItems: "center",
    fontSize: 13,
    borderBottom: "1px solid var(--border)",
    paddingBottom: 8,
  },
  goalBadge: {
    background: "rgba(85,240,192,0.12)",
    border: "1px solid rgba(85,240,192,0.3)",
    color: "var(--green)",
    padding: "10px 14px",
    textAlign: "center" as const,
    fontWeight: 700,
    fontSize: 14,
  },
  header: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) auto",
    gap: "24px",
    alignItems: "end",
  },
  kicker: {
    color: "var(--accent-1)",
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: 0,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  title: {
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: "clamp(32px, 5vw, 54px)",
    lineHeight: 1,
    margin: 0,
  },
  subtitle: {
    color: "var(--text-muted)",
    fontSize: 16,
    lineHeight: 1.6,
    maxWidth: 820,
    marginTop: 14,
  },
  targetBox: {
    minWidth: 220,
    border: "1px solid var(--border)",
    background: "var(--bg-card)",
    padding: 18,
    display: "grid",
    gap: 6,
  },
  metricGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
    gap: 16,
  },
  metricCard: {
    minHeight: 150,
    display: "grid",
    gap: 8,
    alignContent: "start",
  },
  metricIcon: {
    width: 38,
    height: 38,
    display: "grid",
    placeItems: "center",
    background: "rgba(220,255,69,0.12)",
    color: "var(--accent-1)",
    border: "1px solid rgba(220,255,69,0.25)",
  },
  metricTitle: {
    color: "var(--text-muted)",
    fontSize: 13,
    fontWeight: 700,
    textTransform: "uppercase",
  },
  metricValue: {
    fontSize: 30,
    lineHeight: 1,
  },
  metricNote: {
    color: "var(--text-muted)",
  },
  sectionGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
    gap: 24,
  },
  calculator: {
    display: "grid",
    gap: 20,
  },
  playbook: {
    display: "grid",
    gap: 16,
    alignContent: "start",
  },
  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: 18,
    alignItems: "start",
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 20,
    margin: 0,
  },
  sectionNote: {
    color: "var(--text-muted)",
    fontSize: 14,
    lineHeight: 1.5,
    marginTop: 6,
  },
  sliderLabel: {
    display: "grid",
    gap: 10,
  },
  range: {
    accentColor: "#dcff45",
    padding: 0,
  },
  progressTrack: {
    height: 12,
    background: "var(--bg-surface)",
    border: "1px solid var(--border)",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    background: "var(--accent-grad)",
    transition: "width 0.2s ease",
  },
  checkItem: {
    display: "grid",
    gridTemplateColumns: "20px 1fr",
    gap: 10,
    color: "var(--text-primary)",
    lineHeight: 1.45,
  },
  fullSection: {
    display: "grid",
    gap: 18,
  },
  revenueBadge: {
    whiteSpace: "nowrap",
    color: "var(--accent-1)",
    border: "1px solid rgba(220,255,69,0.28)",
    padding: "10px 12px",
    background: "rgba(220,255,69,0.08)",
  },
  offerGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
    gap: 14,
  },
  offerCard: {
    border: "1px solid var(--border)",
    background: "var(--bg-surface)",
    padding: 16,
    display: "grid",
    gap: 12,
  },
  offerTopline: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "start",
  },
  offerPromise: {
    color: "var(--text-muted)",
    fontSize: 13,
    lineHeight: 1.45,
  },
  offerMeta: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
  },
  pipeline: {
    display: "grid",
    gap: 10,
  },
  pipelineRow: {
    display: "grid",
    gridTemplateColumns: "34px minmax(0, 1fr) auto",
    gap: 12,
    alignItems: "center",
    border: "1px solid var(--border)",
    background: "var(--bg-surface)",
    padding: 12,
  },
  pipelineIndex: {
    width: 28,
    height: 28,
    display: "grid",
    placeItems: "center",
    background: "rgba(85,240,192,0.12)",
    color: "var(--green)",
    fontWeight: 800,
  },
  pipelineGoal: {
    color: "var(--accent-1)",
    fontWeight: 800,
  },
  rhythmItem: {
    borderLeft: "2px solid var(--accent-1)",
    padding: "10px 0 10px 12px",
    color: "var(--text-primary)",
  },
  channelGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 14,
  },
  channelCard: {
    border: "1px solid var(--border)",
    background: "var(--bg-surface)",
    padding: 16,
    display: "grid",
    gap: 8,
  },
};
