"use client";

import { useEffect, useState, useCallback } from "react";
import { CheckCircle2, AlertCircle, Loader2, DollarSign, RefreshCw, Save } from "lucide-react";
import { useWriteContract, useReadContract, useAccount } from "wagmi";
import { parseUnits } from "viem";
import { AdminPage, AdminSection, AdminStatus } from "@/components/ui/Admin";

// ABI mínima para setFeeUSD e feeUSD
const FACTORY_ABI = [
  {
    name: "feeUSD",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "setFeeUSD",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "newFeeUSD", type: "uint256" }],
    outputs: [],
  },
] as const;

type PriceRow = {
  product_code: string;
  label: string;
  amount_usd_cents: number;
  amount_brl_cents: number;
  is_active: boolean;
  updated_at: string;
  updated_by: string | null;
};

type SaveStatus = "idle" | "saving" | "success" | "error";

const USD_FORMATTER = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const BRL_FORMATTER = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function centsToDisplay(cents: number, currency: "usd" | "brl") {
  return currency === "usd"
    ? USD_FORMATTER.format(cents / 100)
    : BRL_FORMATTER.format(cents / 100);
}

export default function AdminPricesPage() {
  const [prices, setPrices] = useState<PriceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, { usd: string; brl: string; label: string }>>({});
  const [saveStatus, setSaveStatus] = useState<Record<string, SaveStatus>>({});

  // On-chain fee
  const [newOnchainFeeUsd, setNewOnchainFeeUsd] = useState("5.00");
  const { address, isConnected } = useAccount();

  const factoryAddress = (process.env.NEXT_PUBLIC_FACTORY_ADDRESS ?? "") as `0x${string}`;

  const { data: currentFeeUSD } = useReadContract({
    address: factoryAddress || undefined,
    abi: FACTORY_ABI,
    functionName: "feeUSD",
    query: { enabled: !!factoryAddress },
  });

  const { writeContractAsync, isPending: isTxPending } = useWriteContract();

  const loadPrices = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch("/api/admin/prices");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json() as { prices: PriceRow[] };
      setPrices(json.prices);
      const initialEdits: Record<string, { usd: string; brl: string; label: string }> = {};
      for (const p of json.prices) {
        initialEdits[p.product_code] = {
          usd: (p.amount_usd_cents / 100).toFixed(2),
          brl: (p.amount_brl_cents / 100).toFixed(2),
          label: p.label,
        };
      }
      setEdits(initialEdits);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Erro ao carregar preços");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadPrices(); }, [loadPrices]);

  async function savePrice(code: string) {
    const edit = edits[code];
    if (!edit) return;

    const usdCents = Math.round(parseFloat(edit.usd) * 100);
    const brlCents = Math.round(parseFloat(edit.brl) * 100);

    if (!Number.isFinite(usdCents) || usdCents <= 0) {
      setSaveStatus((s) => ({ ...s, [code]: "error" }));
      return;
    }

    setSaveStatus((s) => ({ ...s, [code]: "saving" }));
    try {
      const res = await fetch("/api/admin/prices", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_code: code,
          amount_usd_cents: usdCents,
          amount_brl_cents: brlCents,
          label: edit.label,
        }),
      });
      if (!res.ok) {
        const err = await res.json() as { error: string };
        throw new Error(err.error);
      }
      setSaveStatus((s) => ({ ...s, [code]: "success" }));
      setTimeout(() => setSaveStatus((s) => ({ ...s, [code]: "idle" })), 3000);
      await loadPrices();
    } catch (err) {
      console.error(err);
      setSaveStatus((s) => ({ ...s, [code]: "error" }));
      setTimeout(() => setSaveStatus((s) => ({ ...s, [code]: "idle" })), 4000);
    }
  }

  async function updateOnchainFee() {
    if (!isConnected || !factoryAddress) return;
    const usdFloat = parseFloat(newOnchainFeeUsd);
    if (!Number.isFinite(usdFloat) || usdFloat <= 0) return;
    // feeUSD usa 8 casas decimais (padrão Chainlink)
    const newFeeUSDRaw = parseUnits(usdFloat.toFixed(8), 8);
    await writeContractAsync({
      address: factoryAddress,
      abi: FACTORY_ABI,
      functionName: "setFeeUSD",
      args: [newFeeUSDRaw],
    });
  }

  const currentFeeDisplay = currentFeeUSD
    ? `$${(Number(currentFeeUSD) / 1e8).toFixed(2)}`
    : "–";

  return (
    <AdminPage
      eyebrow="Gestão de preços"
      title="Tabela de preços"
      description="Atualize valores cobrados pela plataforma sem nova publicação de código. Alterações entram em vigor em até 60 segundos."
      action={<button className="admin-action admin-action--secondary" onClick={loadPrices} disabled={loading}>
          <RefreshCw size={16} />
          Recarregar
        </button>}
    >

      {/* ── PRODUTOS FIAT ───────────────────────────────── */}
      <AdminSection title="Produtos fiat" description="Stripe e Pagar.me. Informe os valores de exibição em dólar e real; o armazenamento permanece em centavos." className="price-section">

        {loading && (
          <div className="admin-state-box">
            <Loader2 size={18} className="animate-spin" />
            <span>Carregando preços do banco…</span>
          </div>
        )}

        {loadError && (
          <div className="admin-state-box admin-text-critical">
            <AlertCircle size={20} />
            <span>{loadError}</span>
          </div>
        )}

        {!loading && !loadError && prices.map((p) => {
          const edit = edits[p.product_code] ?? { usd: "0", brl: "0", label: p.label };
          const status = saveStatus[p.product_code] ?? "idle";
          return (
            <article key={p.product_code} className="price-editor">
              <div className="price-editor__header">
                <div className="price-editor__identity">
                  <strong>{p.product_code}</strong>
                  <span>
                    Atual: {centsToDisplay(p.amount_usd_cents, "usd")} USD &nbsp;|&nbsp;
                    {centsToDisplay(p.amount_brl_cents, "brl")} BRL
                  </span>
                  <small>
                    {p.updated_by
                      ? `Atualizado por ${p.updated_by.slice(0, 8)}…${p.updated_by.slice(-4)}`
                      : "Nunca atualizado"}{" "}
                    — {new Date(p.updated_at).toLocaleString("pt-BR")}
                  </small>
                </div>

                <div>
                  <button
                    className="admin-action price-editor__save"
                    data-status={status}
                    onClick={() => savePrice(p.product_code)}
                    disabled={status === "saving"}
                  >
                    {status === "saving" && <Loader2 size={14} className="animate-spin" />}
                    {status === "success" && <CheckCircle2 size={14} />}
                    {status === "error" && <AlertCircle size={14} />}
                    {status === "idle" && <Save size={14} />}
                    {status === "saving" ? "Salvando…" : status === "success" ? "Salvo!" : status === "error" ? "Erro" : "Salvar"}
                  </button>
                </div>
              </div>

              <div className="price-editor__fields">
                <label>
                  <span>Nome do produto</span>
                  <input
                    value={edit.label}
                    onChange={(e) =>
                      setEdits((prev) => ({
                        ...prev,
                        [p.product_code]: { ...edit, label: e.target.value },
                      }))
                    }
                  />
                </label>
                <label>
                  <span>Preço USD ($)</span>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={edit.usd}
                    onChange={(e) =>
                      setEdits((prev) => ({
                        ...prev,
                        [p.product_code]: { ...edit, usd: e.target.value },
                      }))
                    }
                  />
                </label>
                <label>
                  <span>Preço BRL (R$)</span>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={edit.brl}
                    onChange={(e) =>
                      setEdits((prev) => ({
                        ...prev,
                        [p.product_code]: { ...edit, brl: e.target.value },
                      }))
                    }
                  />
                </label>
              </div>
            </article>
          );
        })}
      </AdminSection>

      {/* ── TAXA ON-CHAIN ───────────────────────────────── */}
      <AdminSection title="Taxa on-chain de emissão" description="Atualiza feeUSD diretamente no contrato InsteadTokenFactory. Requer a carteira administradora conectada." action={<DollarSign size={18} />} className="price-section">

        <div className="onchain-price-grid">
          <div className="onchain-price-current">
            <span>Valor atual no contrato</span>
            <strong>{currentFeeDisplay}</strong>
            <small>Convertido para ETH via Chainlink, com oito casas decimais.</small>
          </div>

          <div className="onchain-price-controls">
            <label>
              <span>Novo valor (USD)</span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={newOnchainFeeUsd}
                onChange={(e) => setNewOnchainFeeUsd(e.target.value)}
              />
            </label>
            <button
              className="admin-action"
              onClick={updateOnchainFee}
              disabled={!isConnected || !factoryAddress || isTxPending}
            >
              {isTxPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {isTxPending ? "Aguardando confirmação…" : "Atualizar contrato"}
            </button>
            {!isConnected && (
              <p className="admin-field-error">
                Conecte a carteira administradora do contrato para atualizar a taxa on-chain.
              </p>
            )}
            {!factoryAddress && (
              <p className="admin-field-error">
                Configure <code>NEXT_PUBLIC_FACTORY_ADDRESS</code> no .env para habilitar.
              </p>
            )}
          </div>
        </div>
      </AdminSection>
    </AdminPage>
  );
}
