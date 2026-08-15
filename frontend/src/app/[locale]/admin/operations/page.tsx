"use client";

import { useEffect, useMemo, useState } from "react";
import { RefreshCw, RotateCcw, XCircle } from "lucide-react";
import { AdminMetric, AdminMetrics, AdminPage, AdminSection, AdminStatus } from "@/components/ui/Admin";

type BalanceCheck = { id: string; label: string; symbol: string; address?: string; balance?: string; threshold?: string; status: "ok" | "low" | "error" | "skipped"; error?: string; reason?: string };
type KycRow = { id: string; provider: string; status: string; wallet_address: string | null; email: string | null; provider_session_id: string | null; last_error: string | null; created_at: string; updated_at: string };
type WebhookRow = { id: string; provider: string; event_type: string; provider_event_id: string | null; status: string; related_wallet_address: string | null; error_message: string | null; created_at: string; updated_at: string };
type IncidentRow = { id: string; scope: string; status: string; severity: string; reason: string; created_by: string | null; resolved_by: string | null; created_at: string; resolved_at: string | null };
type AuditRow = { id: string; admin_wallet: string; action: string; target_resource: string | null; created_at: string };
type QueueRow = { id: string; operation_id?: string; wallet_address?: string; user_wallet?: string; source_code?: string; vertical?: string; action?: string; status: string; chain_id: number; last_error?: string | null; recommendation?: string | null; created_at: string; updated_at: string };

type OperationsData = {
  balances: BalanceCheck[];
  kyc: KycRow[];
  webhooks: WebhookRow[];
  incidents: IncidentRow[];
  audits: AuditRow[];
  queues: { reconciliation: QueueRow[]; lendingIntents: QueueRow[] };
};

const emptyData: OperationsData = { balances: [], kyc: [], webhooks: [], incidents: [], audits: [], queues: { reconciliation: [], lendingIntents: [] } };

export default function AdminOperationsPage() {
  const [data, setData] = useState<OperationsData>(emptyData);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [incidentForm, setIncidentForm] = useState({ scope: "assisted_deployments", severity: "warning", reason: "" });

  async function load() {
    setError(null);
    const res = await fetch("/api/admin/operations", { cache: "no-store" });
    const body = await res.json();
    if (!res.ok) {
      setError(body?.error ?? "Falha ao carregar operacao");
      return;
    }
    setData(body);
  }

  async function action(payload: Record<string, string>) {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/admin/operations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(body?.error ?? "Falha ao executar acao");
      return;
    }
    setIncidentForm((prev) => ({ ...prev, reason: "" }));
    await load();
  }

  useEffect(() => {
    load().catch((err) => setError(err instanceof Error ? err.message : "Erro inesperado"));
  }, []);

  const metrics = useMemo(() => ({
    lowBalances: data.balances.filter((item) => item.status === "low" || item.status === "error").length,
    activeIncidents: data.incidents.filter((item) => item.status === "active").length,
    kycPending: data.kyc.filter((item) => ["pending", "in_review", "created"].includes(item.status)).length,
    webhookIssues: data.webhooks.filter((item) => ["failed", "reprocess_requested"].includes(item.status)).length,
    queueIssues: [...data.queues.reconciliation, ...data.queues.lendingIntents].filter((item) => ["failed", "mismatch"].includes(item.status)).length,
  }), [data]);

  return (
    <AdminPage eyebrow="Operação" title="Centro de controle" description="Saldos, incidentes, KYC, webhooks, filas e auditoria em uma visão operacional." action={<button onClick={() => load()} className="admin-action admin-action--secondary"><RefreshCw size={15} /> Atualizar</button>}>

      {error && <div className="admin-notice" data-tone="critical">{error}</div>}

      <AdminMetrics>
        <AdminMetric label="Saldos em risco" value={metrics.lowBalances} tone={metrics.lowBalances ? "critical" : "positive"} />
        <AdminMetric label="Incidentes ativos" value={metrics.activeIncidents} tone={metrics.activeIncidents ? "critical" : "positive"} />
        <AdminMetric label="KYC pendente" value={metrics.kycPending} tone={metrics.kycPending ? "warning" : "default"} />
        <AdminMetric label="Webhooks com ação" value={metrics.webhookIssues} tone={metrics.webhookIssues ? "warning" : "default"} />
        <AdminMetric label="Filas com ação" value={metrics.queueIssues} tone={metrics.queueIssues ? "warning" : "default"} />
      </AdminMetrics>

      <AdminSection title="Saldos operacionais por rede" action={<AdminStatus>Relayer / multisig</AdminStatus>}>
        <div className="operations-balance-grid">
          {data.balances.map((item) => (
            <div key={item.id} className="operations-balance">
              <div className="operations-balance__header">
                <strong>{item.label}</strong>
                <Status status={item.status} />
              </div>
              <div className="operations-balance__value">{item.balance ?? "n/a"} {item.symbol}</div>
              <small>mínimo {item.threshold ?? "n/a"} · {item.address ? short(item.address) : item.reason ?? item.error}</small>
            </div>
          ))}
        </div>
      </AdminSection>

      <AdminSection title="Pausas e incidentes" action={<AdminStatus tone={metrics.activeIncidents ? "critical" : "positive"}>{metrics.activeIncidents} ativos</AdminStatus>}>
        <div className="admin-form-grid">
          <select value={incidentForm.scope} onChange={(event) => setIncidentForm((prev) => ({ ...prev, scope: event.target.value }))}>
            {["global", "checkout", "token_factory", "assisted_deployments", "lending", "staking", "kyc", "webhooks"].map((scope) => <option key={scope} value={scope}>{scope}</option>)}
          </select>
          <select value={incidentForm.severity} onChange={(event) => setIncidentForm((prev) => ({ ...prev, severity: event.target.value }))}>
            <option value="info">Info</option>
            <option value="warning">Warning</option>
            <option value="critical">Critical</option>
          </select>
          <input placeholder="Motivo da pausa/incidente" value={incidentForm.reason} onChange={(event) => setIncidentForm((prev) => ({ ...prev, reason: event.target.value }))} />
          <button disabled={busy} onClick={() => action({ action: "open_incident", ...incidentForm })} className="admin-action">Abrir pausa</button>
        </div>
        <Table headers={["Escopo", "Severidade", "Status", "Motivo", "Criado", "Acao"]}>
          {data.incidents.map((item) => (
            <tr key={item.id}>
              <Td>{item.scope}</Td><Td>{item.severity}</Td><Td><Status status={item.status} /></Td><Td>{item.reason}</Td><Td>{date(item.created_at)}</Td>
              <Td>{item.status === "active" && <button disabled={busy} onClick={() => action({ action: "resolve_incident", id: item.id })} className="admin-action admin-action--secondary"><XCircle size={13} /> Resolver</button>}</Td>
            </tr>
          ))}
        </Table>
      </AdminSection>

      <AdminSection title="KYC / Didit" action={<AdminStatus>{data.kyc.length} recentes</AdminStatus>}>
        <Table headers={["Status", "Wallet", "Email", "Sessao", "Erro", "Atualizado"]}>
          {data.kyc.map((item) => <tr key={item.id}><Td><Status status={item.status} /></Td><Td>{item.wallet_address ? short(item.wallet_address) : "n/a"}</Td><Td>{item.email ?? "n/a"}</Td><Td>{item.provider_session_id ?? "n/a"}</Td><Td>{item.last_error ?? "Sem erro"}</Td><Td>{date(item.updated_at)}</Td></tr>)}
        </Table>
      </AdminSection>

      <AdminSection title="Webhooks e reprocessamento" action={<AdminStatus>{data.webhooks.length} eventos</AdminStatus>}>
        <Table headers={["Provider", "Evento", "Status", "Wallet", "Erro", "Criado", "Acao"]}>
          {data.webhooks.map((item) => (
            <tr key={item.id}>
              <Td>{item.provider}</Td><Td>{item.event_type}</Td><Td><Status status={item.status} /></Td><Td>{item.related_wallet_address ? short(item.related_wallet_address) : "n/a"}</Td><Td>{item.error_message ?? "Sem erro"}</Td><Td>{date(item.created_at)}</Td>
              <Td><button disabled={busy || item.status === "reprocess_requested"} onClick={() => action({ action: "reprocess_webhook", id: item.id })} className="admin-action admin-action--secondary"><RotateCcw size={13} /> Reprocessar</button></Td>
            </tr>
          ))}
        </Table>
      </AdminSection>

      <AdminSection title="Filas e reconciliação" action={<AdminStatus>Jobs internos</AdminStatus>}>
        <Table headers={["Fila", "Status", "Wallet", "Rede", "Detalhe", "Atualizado", "Acao"]}>
          {data.queues.reconciliation.map((item) => (
            <tr key={item.id}><Td>reconciliation</Td><Td><Status status={item.status} /></Td><Td>{item.user_wallet ? short(item.user_wallet) : "n/a"}</Td><Td>{item.chain_id}</Td><Td>{item.last_error ?? item.action ?? "n/a"}</Td><Td>{date(item.updated_at)}</Td><Td><button disabled={busy} onClick={() => action({ action: "retry_reconciliation", id: item.id })} className="admin-action admin-action--secondary"><RotateCcw size={13} /> Repetir</button></Td></tr>
          ))}
          {data.queues.lendingIntents.map((item) => (
            <tr key={item.id}><Td>lending intent</Td><Td><Status status={item.status} /></Td><Td>{item.wallet_address ? short(item.wallet_address) : "n/a"}</Td><Td>{item.chain_id}</Td><Td>{item.recommendation ?? item.source_code ?? "n/a"}</Td><Td>{date(item.updated_at)}</Td><Td /></tr>
          ))}
        </Table>
      </AdminSection>

      <AdminSection title="Auditoria administrativa" action={<AdminStatus>{data.audits.length} eventos</AdminStatus>}>
        <Table headers={["Admin", "Acao", "Recurso", "Data"]}>
          {data.audits.map((item) => <tr key={item.id}><Td>{short(item.admin_wallet)}</Td><Td>{item.action}</Td><Td>{item.target_resource ?? "n/a"}</Td><Td>{date(item.created_at)}</Td></tr>)}
        </Table>
      </AdminSection>
    </AdminPage>
  );
}

function Table({ headers, children }: { headers: string[]; children: React.ReactNode }) {
  return <div className="admin-table-wrap"><table className="admin-data-table admin-data-table--wide"><thead><tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr></thead><tbody>{children}</tbody></table></div>;
}

function Td({ children }: { children?: React.ReactNode }) {
  return <td>{children}</td>;
}

function Status({ status }: { status: string }) {
  const tone = ["ok", "approved", "processed", "confirmed", "resolved"].includes(status) ? "positive" : ["failed", "low", "error", "critical", "active", "reprocess_requested"].includes(status) ? "critical" : "warning";
  return <AdminStatus tone={tone}>{status}</AdminStatus>;
}

function short(value: string) {
  return value.length > 12 ? `${value.slice(0, 6)}...${value.slice(-4)}` : value;
}

function date(value: string) {
  return new Date(value).toLocaleString("pt-BR");
}
