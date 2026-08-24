"use client";

import { useEffect, useMemo, useState } from "react";
import { RefreshCw, RotateCcw, XCircle } from "lucide-react";
import { AdminMetric, AdminMetrics, AdminPage, AdminSection, AdminStatus } from "@/components/ui/Admin";

type RevenueRow = {
  source_code: string;
  label: string;
  vertical: string;
  category: string;
  revenue_model: string;
  billing_interval: string;
  status: string;
  production_ready: boolean;
  amount_usd_cents: number | null;
  amount_brl_cents: number | null;
  take_rate_bps: number | null;
  notes: string;
};

type AssistedDeployment = {
  id: string;
  wallet_address: string;
  chain_id: number;
  factory_address: string;
  status: "queued" | "executing" | "confirmed" | "failed" | "cancelled";
  token_name: string;
  token_symbol: string;
  relayer_wallet: string | null;
  tx_hash: string | null;
  token_address: string | null;
  error_message: string | null;
  attempts: number;
  next_attempt_at: string;
  created_at: string;
  updated_at: string;
};

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export default function AdminRevenuePage() {
  const [sources, setSources] = useState<RevenueRow[]>([]);
  const [operations, setOperations] = useState({ entitlements: 0, automationIntents: 0, b2bClients: 0, alerts: 0, b2bEvents: 0 });
  const [source, setSource] = useState<"supabase" | "loading">("loading");
  const [error, setError] = useState<string | null>(null);
  const [deployments, setDeployments] = useState<AssistedDeployment[]>([]);
  const [deploymentFilters, setDeploymentFilters] = useState({ status: "all", chainId: "all", wallet: "" });
  const [deploymentBusyId, setDeploymentBusyId] = useState<string | null>(null);
  const [b2bForm, setB2bForm] = useState({ name: "", domain: "", contactEmail: "" });
  const [b2bResult, setB2bResult] = useState<{ domain: string; apiKey: string } | null>(null);

  async function loadRevenue() {
    setError(null);
    const res = await fetch("/api/admin/revenue", { cache: "no-store" });
    const body = await res.json();
    if (!res.ok) {
      setSources([]);
      setOperations({ entitlements: 0, automationIntents: 0, b2bClients: 0, alerts: 0, b2bEvents: 0 });
      setSource("loading");
      setError(body?.error ?? "Falha ao carregar fontes de receita");
      return;
    }
    setSources(body.sources ?? []);
    setOperations(body.operations ?? { entitlements: 0, automationIntents: 0, b2bClients: 0, alerts: 0, b2bEvents: 0 });
    setSource("supabase");
  }

  async function loadDeployments() {
    const params = new URLSearchParams();
    params.set("status", deploymentFilters.status);
    params.set("chainId", deploymentFilters.chainId);
    if (deploymentFilters.wallet.trim()) params.set("wallet", deploymentFilters.wallet.trim());
    const res = await fetch(`/api/admin/assisted-deployments?${params.toString()}`, { cache: "no-store" });
    const body = await res.json();
    if (!res.ok) {
      setError(body?.error ?? "Falha ao carregar deploys assistidos");
      return;
    }
    setDeployments(body.deployments ?? []);
  }

  useEffect(() => {
    loadRevenue().catch((err) => setError(err instanceof Error ? err.message : "Erro inesperado"));
  }, []);

  useEffect(() => {
    loadDeployments().catch((err) => setError(err instanceof Error ? err.message : "Erro inesperado"));
  }, [deploymentFilters.status, deploymentFilters.chainId]);

  const metrics = useMemo(() => {
    const active = sources.filter((item) => item.status === "active").length;
    const ready = sources.filter((item) => item.production_ready).length;
    const checkoutProducts = sources.filter((item) => item.amount_usd_cents && item.amount_brl_cents).length;
    const feeBased = sources.filter((item) => item.take_rate_bps !== null).length;
    return { active, ready, checkoutProducts, feeBased };
  }, [sources]);

  const deploymentMetrics = useMemo(() => {
    const queued = deployments.filter((item) => item.status === "queued").length;
    const executing = deployments.filter((item) => item.status === "executing").length;
    const failed = deployments.filter((item) => item.status === "failed").length;
    const cancelled = deployments.filter((item) => item.status === "cancelled").length;
    return { queued, executing, failed, cancelled };
  }, [deployments]);

  async function createB2bClient() {
    setError(null);
    setB2bResult(null);
    const res = await fetch("/api/admin/b2b-clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(b2bForm),
    });
    const body = await res.json();
    if (!res.ok) {
      setError(body?.error ?? "Falha ao provisionar cliente B2B");
      return;
    }
    setB2bResult({ domain: body.client.domain, apiKey: body.apiKey });
    setB2bForm({ name: "", domain: "", contactEmail: "" });
    await loadRevenue();
  }

  async function updateDeployment(id: string, action: "retry" | "cancel") {
    setError(null);
    setDeploymentBusyId(id);
    const res = await fetch("/api/admin/assisted-deployments", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action }),
    });
    const body = await res.json();
    setDeploymentBusyId(null);
    if (!res.ok) {
      setError(body?.error ?? "Falha ao atualizar deploy assistido");
      return;
    }
    await loadDeployments();
    await loadRevenue();
  }

  return (
    <AdminPage
      eyebrow="Catálogo comercial"
      title="Planos e serviços"
      description="Inventário auditável de produtos cobrados via fiat, taxas on-chain, assinaturas, serviços premium e integrações B2B."
      action={<button className="admin-action admin-action--secondary" onClick={() => { loadRevenue(); loadDeployments(); }}>
          <RefreshCw size={16} />
          Atualizar
        </button>}
    >

      {error && <div className="admin-notice" data-tone="critical">{error}</div>}
      {source === "loading" && !error && <div className="admin-notice" data-tone="warning">Carregando dados operacionais de receita.</div>}

      <AdminMetrics>
        <AdminMetric label="Planos ativos" value={sources.length} />
        <AdminMetric label="Prontos para produção" value={metrics.ready} tone="positive" />
        <AdminMetric label="Checkout fiat" value={metrics.checkoutProducts} />
        <AdminMetric label="Taxas on-chain" value={metrics.feeBased} />
        <AdminMetric label="Entitlements" value={operations.entitlements} />
        <AdminMetric label="Intenções de crédito" value={operations.automationIntents} />
        <AdminMetric label="Clientes B2B" value={operations.b2bClients} />
        <AdminMetric label="Alertas de risco" value={operations.alerts} />
        <AdminMetric label="Eventos B2B" value={operations.b2bEvents} />
        <AdminMetric label="Emissões na fila" value={deploymentMetrics.queued} tone={deploymentMetrics.queued ? "warning" : "default"} />
        <AdminMetric label="Emissões executando" value={deploymentMetrics.executing} />
        <AdminMetric label="Emissões com falha" value={deploymentMetrics.failed} tone={deploymentMetrics.failed ? "critical" : "default"} />
      </AdminMetrics>

      <AdminSection title="Controle de deploys assistidos" description="Fila fiat do relayer, com filtros, tentativas, erros operacionais e referências on-chain." action={<AdminStatus>{deployments.length} recentes</AdminStatus>}>
        <div className="admin-filter-grid">
          <select value={deploymentFilters.status} onChange={(event) => setDeploymentFilters((prev) => ({ ...prev, status: event.target.value }))}>
            <option value="all">Todos status</option>
            <option value="queued">Queued</option>
            <option value="executing">Executing</option>
            <option value="confirmed">Confirmed</option>
            <option value="failed">Failed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <select value={deploymentFilters.chainId} onChange={(event) => setDeploymentFilters((prev) => ({ ...prev, chainId: event.target.value }))}>
            <option value="all">Todas redes</option>
            <option value="1">Ethereum</option>
            <option value="10">Optimism</option>
            <option value="56">BNB Chain</option>
            <option value="137">Polygon</option>
            <option value="42161">Arbitrum</option>
            <option value="43114">Avalanche</option>
            <option value="8453">Base</option>
          </select>
          <input placeholder="Wallet do cliente" value={deploymentFilters.wallet} onChange={(event) => setDeploymentFilters((prev) => ({ ...prev, wallet: event.target.value }))} />
          <button onClick={() => loadDeployments()} className="admin-action">Filtrar</button>
        </div>
        <div className="admin-table-wrap">
          <table className="admin-data-table admin-data-table--wide">
            <thead>
              <tr>
                <th>Ativo</th><th>Cliente / rede</th><th>Status</th><th>Relayer</th><th>Erro / próxima tentativa</th><th>On-chain</th><th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {deployments.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.token_name}</strong>
                    <small className="admin-code">${item.token_symbol}</small>
                  </td>
                  <td>
                    <span>{shortAddress(item.wallet_address)}</span>
                    <small className="admin-code">chain {item.chain_id}</small>
                  </td>
                  <td>
                    <AdminStatus tone={deploymentStatusTone(item.status)}>{item.status}</AdminStatus>
                    <small className="admin-code">{item.attempts} tentativa(s)</small>
                  </td>
                  <td>
                    {item.relayer_wallet ? shortAddress(item.relayer_wallet) : "Aguardando"}
                    <small className="admin-code">{shortAddress(item.factory_address)}</small>
                  </td>
                  <td>
                    <span className={item.error_message ? "admin-text-critical" : "admin-text-muted"}>{item.error_message ?? "Sem erro"}</span>
                    <small className="admin-code">{new Date(item.next_attempt_at).toLocaleString("pt-BR")}</small>
                  </td>
                  <td>
                    {item.tx_hash ? <a href={explorerTxUrl(item.chain_id, item.tx_hash)} target="_blank" rel="noreferrer" className="admin-link">tx</a> : <span className="admin-text-muted">sem tx</span>}
                    {item.token_address && <a href={explorerAddressUrl(item.chain_id, item.token_address)} target="_blank" rel="noreferrer" className="admin-link">ativo</a>}
                  </td>
                  <td>
                    <div className="admin-row-actions">
                      <button className="admin-action admin-action--secondary" disabled={deploymentBusyId === item.id || item.status === "confirmed"} onClick={() => updateDeployment(item.id, "retry")}>
                        <RotateCcw size={13} /> Repetir
                      </button>
                      <button className="admin-action admin-action--danger" disabled={deploymentBusyId === item.id || item.status === "confirmed" || item.status === "cancelled"} onClick={() => updateDeployment(item.id, "cancel")}>
                        <XCircle size={13} /> Cancelar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {deployments.length === 0 && (
                <tr>
                  <td colSpan={7} className="admin-table-empty">Nenhuma emissão assistida encontrada para os filtros atuais.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </AdminSection>

      <AdminSection title="Provisionar Widget/API B2B" description="Crie um cliente parceiro, gere uma API key e habilite o módulo de crédito e risco." action={<AdminStatus tone="positive">Disponível</AdminStatus>}>
        <div className="admin-form-grid">
          <input placeholder="Nome do parceiro" value={b2bForm.name} onChange={(event) => setB2bForm((prev) => ({ ...prev, name: event.target.value }))} />
          <input placeholder="dominio.com" value={b2bForm.domain} onChange={(event) => setB2bForm((prev) => ({ ...prev, domain: event.target.value }))} />
          <input placeholder="contato@dominio.com" value={b2bForm.contactEmail} onChange={(event) => setB2bForm((prev) => ({ ...prev, contactEmail: event.target.value }))} />
          <button onClick={createB2bClient} className="admin-action">Gerar credencial</button>
        </div>
        {b2bResult && (
          <div className="admin-secret-box">
            <strong>Credencial criada. Copie agora — ela não será exibida novamente.</strong>
            <code>{b2bResult.apiKey}</code>
            <code>{`fetch("/api/b2b/widget?domain=${b2bResult.domain}", { headers: { "x-instead-widget-key": "${b2bResult.apiKey}" } })`}</code>
          </div>
        )}
      </AdminSection>

      <AdminSection title="Mapa de planos" action={<AdminStatus tone="positive">{metrics.active} ativos</AdminStatus>}>
        <div className="admin-table-wrap">
          <table className="admin-data-table admin-data-table--wide">
            <thead>
              <tr>
                <th>Fonte</th><th>Vertical</th><th>Modelo</th><th>Preço / taxa</th><th>Status</th><th>Nota operacional</th>
              </tr>
            </thead>
            <tbody>
              {sources.map((item) => (
                <tr key={item.source_code}>
                  <td>
                    <strong>{item.label}</strong>
                    <small className="admin-code">{item.source_code}</small>
                  </td>
                  <td>{item.vertical}</td>
                  <td>
                    <span className="admin-category">{item.category}</span>
                    <p className="admin-table-description">{item.revenue_model}</p>
                  </td>
                  <td>
                    {item.amount_usd_cents && item.amount_brl_cents
                      ? `${usd.format(item.amount_usd_cents / 100)} / ${brl.format(item.amount_brl_cents / 100)}`
                      : `${item.take_rate_bps ?? 0} bps`}
                    <small className="admin-code">{item.billing_interval}</small>
                  </td>
                  <td>
                    <AdminStatus tone={item.status === "active" ? "positive" : "warning"}>{item.status}</AdminStatus>
                    {item.production_ready && <small className="admin-ready">produção</small>}
                  </td>
                  <td>{item.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminSection>
    </AdminPage>
  );
}

function shortAddress(value: string) {
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function deploymentStatusTone(status: AssistedDeployment["status"]): "neutral" | "positive" | "warning" | "critical" {
  if (status === "confirmed") return "positive";
  if (status === "failed") return "critical";
  if (status === "cancelled") return "neutral";
  return "warning";
}

function explorerTxUrl(chainId: number, txHash: string) {
  if (chainId === 10) return `https://optimistic.etherscan.io/tx/${txHash}`;
  if (chainId === 137) return `https://polygonscan.com/tx/${txHash}`;
  if (chainId === 42161) return `https://arbiscan.io/tx/${txHash}`;
  if (chainId === 43114) return `https://snowtrace.io/tx/${txHash}`;
  if (chainId === 8453) return `https://basescan.org/tx/${txHash}`;
  if (chainId === 56) return `https://bscscan.com/tx/${txHash}`;
  return `https://etherscan.io/tx/${txHash}`;
}

function explorerAddressUrl(chainId: number, address: string) {
  return explorerTxUrl(chainId, address).replace("/tx/", "/address/");
}
