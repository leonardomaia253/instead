"use client";

import { useMemo, useState } from "react";
import {
  Banknote,
  CalendarDays,
  CheckCircle2,
  Flame,
  Megaphone,
  MessageSquareText,
  Zap,
} from "lucide-react";
import { AdminMetric, AdminMetrics, AdminPage, AdminSection, AdminStatus } from "@/components/ui/Admin";

type RevenueLever = {
  name: string;
  price: number;
  monthlyGoal: number;
  closeRate: number;
  responsible: string;
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
    price: 49,
    monthlyGoal: 35,
    closeRate: 0.18,
    responsible: "Comercial",
    promise: "Token ERC-20 configurado, publicado e validado com suporte humano.",
  },
  {
    name: "Premium launch",
    price: 159,
    monthlyGoal: 12,
    closeRate: 0.08,
    responsible: "Produto/Admin",
    promise: "Deploy multi-chain, pagina do token, checklist de risco e auditoria automatica.",
  },
  {
    name: "Creator dashboard",
    price: 29,
    monthlyGoal: 160,
    closeRate: 0.12,
    responsible: "Suporte/Admin",
    promise: "Analytics, links publicos, holders, campanhas e alertas para comunidades.",
  },
  {
    name: "Setup agencia",
    price: 199,
    monthlyGoal: 6,
    closeRate: 0.05,
    responsible: "Parcerias",
    promise: "Pacote white-glove para agencias que lancam tokens para clientes.",
  },
];

const pipelineStages: PipelineStage[] = [
  {
    stage: "Prospects mapeados",
    goal: 1800,
    conversion: 0.32,
    action: "Listar projetos Web3, DAOs, NFT projects, agencias e creators com comunidade ativa.",
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
    responsible: "Comercial",
    asset: "Threads sobre custo, seguranca e checklist de launch.",
  },
  {
    channel: "Telegram/Discord",
    cadence: "10 comunidades/dia",
    responsible: "Comercial",
    asset: "Oferta: 10 deploys assistidos com desconto e revisao gratuita.",
  },
  {
    channel: "Reddit/Farcaster",
    cadence: "2 posts educativos/dia",
    responsible: "Marketing",
    asset: "Guias sem spam: tokenomics, deploy ERC-20, erros comuns.",
  },
  {
    channel: "Agencias Web3",
    cadence: "50 abordagens/semana",
    responsible: "Parcerias",
    asset: "Pacote white-label para lancar tokens de clientes.",
  },
  {
    channel: "GitHub/Product Hunt",
    cadence: "1 melhoria publica/semana",
    responsible: "Admin",
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
  dashboard: 0.85,  // $29/mês — custo infra + CS ~$7
  assisted: 0.70,   // $49 — ~2h suporte humano incluídas
  premium: 0.65,    // $159 — multi-chain + auditoria automática
  agency: 0.60,     // $199 — white-glove onboarding ~3h
} as const;

export default function AdminDashboard() {
  const [monthlyVisitors, setMonthlyVisitors] = useState(10000);
  const [leadConversion, setLeadConversion] = useState(0.18);
  const [salesConversion, setSalesConversion] = useState(0.22);
  const [averageTicket, setAverageTicket] = useState(420);

  // Planejador $1.000/dia — mix mensal de produtos
  const [qOnchain, setQOnchain] = useState(400);
  const [qDashboard, setQDashboard] = useState(200);
  const [qAssisted, setQAssisted] = useState(45);
  const [qPremium, setQPremium] = useState(14);
  const [qAgency, setQAgency] = useState(6);

  const dailyProfitBreakdown = useMemo(() => {
    const onchain   = { qty: qOnchain,   price: 5,    profit: qOnchain   * 5    * PRODUCT_MARGINS.onchain   };
    const dashboard = { qty: qDashboard, price: 29,  profit: qDashboard * 29  * PRODUCT_MARGINS.dashboard };
    const assisted  = { qty: qAssisted,  price: 49,  profit: qAssisted  * 49  * PRODUCT_MARGINS.assisted  };
    const premium   = { qty: qPremium,   price: 159, profit: qPremium   * 159 * PRODUCT_MARGINS.premium   };
    const agency    = { qty: qAgency,    price: 199, profit: qAgency    * 199 * PRODUCT_MARGINS.agency    };
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
    <AdminPage
      title="Planejamento comercial"
      description="Metas, funil, ofertas e cadência operacional para acompanhar receita previsível."
      action={<a href="../admin/prices" className="btn-outline">Gerenciar preços</a>}
    >

      <AdminMetrics>
        <AdminMetric label="Receita projetada" value={currencyFormatter.format(projectedRevenue)} />
        <AdminMetric label="Leads qualificados" value={qualifiedLeads.toLocaleString("en-US")} />
        <AdminMetric label="Clientes estimados" value={projectedCustomers.toLocaleString("en-US")} />
        <AdminMetric label="Gap mensal" value={currencyFormatter.format(gap)} tone={gap > 0 ? "warning" : "positive"} />
        <AdminMetric label="Lucro diário planejado" value={`$${Math.round(dailyProfitBreakdown.daily).toLocaleString("en-US")}`} tone={dailyProfitBreakdown.daily >= dailyGoal ? "positive" : "default"} />
      </AdminMetrics>

      {/* ===== PLANEJADOR $1.000/DIA ===== */}
      <AdminSection className="commercial-section" title="Planejador de lucro diário" description="Ajuste o volume mensal por produto e estime as conversões necessárias para a meta líquida." action={<Zap size={18} />}>
        <div className="commercial-daily-grid">
          <div>
          <div className="commercial-sliders">
            <Slider label="Token Deploy On-chain ($5 × 95%)" value={qOnchain} min={0} max={2000} step={10} suffix=" deploys/mês" onChange={setQOnchain} />
            <Slider label="Creator Dashboard ($29/mês × 85%)" value={qDashboard} min={0} max={1000} step={5} suffix=" assinaturas ativas" onChange={setQDashboard} />
            <Slider label="Deploy Assistido ($49 × 70%)" value={qAssisted} min={0} max={200} step={1} suffix=" vendas/mês" onChange={setQAssisted} />
            <Slider label="Premium Launch ($159 × 65%)" value={qPremium} min={0} max={100} step={1} suffix=" vendas/mês" onChange={setQPremium} />
            <Slider label="Setup Agência ($199 × 60%)" value={qAgency} min={0} max={50} step={1} suffix=" agências/mês" onChange={setQAgency} />
          </div>

          {/* Painel de resultados da direita */}
          </div>
          <div className="commercial-result">
            <div className="commercial-result__total">
              <span>Lucro líquido / dia</span>
              <strong data-achieved={dailyProfitBreakdown.daily >= dailyGoal}>
                ${Math.round(dailyProfitBreakdown.daily).toLocaleString("en-US")}
              </strong>
              <small>
                {currencyFormatter.format(Math.round(dailyProfitBreakdown.totalMonthly))}/mês
              </small>
            </div>

            <div className="commercial-progress">
              <div style={{ width: `${dailyProgress}%`, background: dailyProfitBreakdown.daily >= dailyGoal ? "var(--green)" : "var(--accent-1)" }} />
            </div>
            <div className="commercial-progress__labels">
              <span>$0</span>
              <strong>Meta: $1.000/dia</strong>
              <span>$2.000</span>
            </div>

            <div className="commercial-breakdown">
              {([
                { label: "On-chain",   profit: dailyProfitBreakdown.onchain.profit,   qty: dailyProfitBreakdown.onchain.qty,   unit: "deploys" },
                { label: "Dashboard",  profit: dailyProfitBreakdown.dashboard.profit, qty: dailyProfitBreakdown.dashboard.qty, unit: "assin." },
                { label: "Assistido",  profit: dailyProfitBreakdown.assisted.profit,  qty: dailyProfitBreakdown.assisted.qty,  unit: "vendas" },
                { label: "Premium",    profit: dailyProfitBreakdown.premium.profit,   qty: dailyProfitBreakdown.premium.qty,   unit: "vendas" },
                { label: "Agência",    profit: dailyProfitBreakdown.agency.profit,    qty: dailyProfitBreakdown.agency.qty,    unit: "setup" },
              ] as const).map(({ label, profit, qty, unit }) => (
                <div key={label}>
                  <span>{label}</span>
                  <small>{qty} {unit}</small>
                  <strong>${Math.round(profit / 30).toLocaleString("en-US")}/dia</strong>
                </div>
              ))}
            </div>

              {dailyProfitBreakdown.daily >= dailyGoal && (
              <div className="commercial-goal">Meta diária atingida com este mix.</div>
            )}
          </div>
        </div>
      </AdminSection>

      <section className="commercial-two-column">
        <AdminSection title="Planejador de metas" description="Use nas reuniões semanais para identificar falta de volume, oferta ou fechamento." action={<Banknote size={18} />} className="commercial-section commercial-section--stack">

          <Slider label="Visitantes mensais" value={monthlyVisitors} min={1000} max={50000} step={500} suffix="" onChange={setMonthlyVisitors} />
          <Slider label="Conversao visitante -> lead" value={Math.round(leadConversion * 100)} min={2} max={40} step={1} suffix="%" onChange={(value) => setLeadConversion(value / 100)} />
          <Slider label="Conversao lead -> cliente" value={Math.round(salesConversion * 100)} min={3} max={45} step={1} suffix="%" onChange={(value) => setSalesConversion(value / 100)} />
          <Slider label="Ticket medio" value={averageTicket} min={49} max={1500} step={25} suffix=" USD" onChange={setAverageTicket} />

          <div className="commercial-progress">
            <div style={{ width: `${targetProgress}%` }} />
          </div>
        </AdminSection>

        <AdminSection title="Playbook de fechamento" description="Oferta curta, diagnóstico objetivo e próximo passo com prazo." action={<Flame size={18} />} className="commercial-section">
          <div className="commercial-checklist">
          {[
            "Gancho: crie seu token seguro em minutos, sem dev Solidity.",
            "Entrada: revisao gratuita de tokenomics para abrir conversa.",
            "Conversao: deploy assistido como primeira compra de baixo atrito.",
            "Expansao: premium launch e assinatura do dashboard apos o deploy.",
            "Prova: publicar tokens criados, prints do processo e depoimentos.",
          ].map((item) => (
            <div key={item}>
              <CheckCircle2 size={14} />
              <span>{item}</span>
            </div>
          ))}
          </div>
        </AdminSection>
      </section>

      <AdminSection title="Composição de receita" description="Mix mensal de ofertas para reduzir dependência de uma única linha de produto." action={<AdminStatus>{currencyFormatter.format(leverRevenue)}/mês</AdminStatus>} className="commercial-section">
        <div className="commercial-offers">
          {revenueLevers.map((lever) => (
            <article key={lever.name}>
              <div className="commercial-offers__topline">
                <strong>{lever.name}</strong>
                <span>{currencyFormatter.format(lever.price)}</span>
              </div>
              <p>{lever.promise}</p>
              <div className="commercial-offers__meta">
                <span>{lever.monthlyGoal} vendas/mes</span>
                <span>{Math.round(lever.closeRate * 100)}% close</span>
                <span>{lever.responsible}</span>
              </div>
            </article>
          ))}
        </div>
      </AdminSection>

      <section className="commercial-two-column">
        <AdminSection title="Funil comercial mensal" description={`Metas operacionais para perseguir aproximadamente ${currencyFormatter.format(monthlyTarget)}/mês.`} action={<MessageSquareText size={18} />} className="commercial-section">
          <div className="commercial-pipeline">
            {pipelineStages.map((stage, index) => (
              <div key={stage.stage}>
                <span>{index + 1}</span>
                <div>
                  <strong>{stage.stage}</strong>
                  <p>{stage.action}</p>
                </div>
                <strong>{stage.goal.toLocaleString("en-US")}</strong>
              </div>
            ))}
          </div>
        </AdminSection>

        <AdminSection title="Ritmo semanal" description="Rotina para manter consistência operacional sem mídia paga." action={<CalendarDays size={18} />} className="commercial-section">
          <div className="commercial-rhythm">{weeklyOperatingRhythm.map((item) => <div key={item}>{item}</div>)}</div>
        </AdminSection>
      </section>

      <AdminSection title="Canais de aquisição" description="Cadência, responsável e ativo necessário por canal." action={<Megaphone size={18} />} className="commercial-section">
        <div className="commercial-channels">
          {channels.map((channel) => (
            <article key={channel.channel}>
              <strong>{channel.channel}</strong>
              <span>{channel.cadence}</span>
              <p>{channel.asset}</p>
              <small>{channel.responsible}</small>
            </article>
          ))}
        </div>
      </AdminSection>
    </AdminPage>
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
    <label className="commercial-slider">
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
      />
    </label>
  );
}
