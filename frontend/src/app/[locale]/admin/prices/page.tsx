"use client";

import { useEffect, useState, useCallback } from "react";
import type { CSSProperties } from "react";
import { CheckCircle2, AlertCircle, Loader2, DollarSign, RefreshCw, Save } from "lucide-react";
import { useWriteContract, useReadContract, useAccount } from "wagmi";
import { parseUnits } from "viem";

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
    <div style={s.page}>
      <header style={s.header}>
        <div>
          <div style={s.kicker}>Gestão de Preços</div>
          <h1 style={s.title}>Tabela de Preços</h1>
          <p style={s.subtitle}>
            Atualize os preços cobrados na plataforma sem redeploy de código.
            Mudanças entram em vigor em até 60 segundos.
          </p>
        </div>
        <button style={s.refreshBtn} onClick={loadPrices} disabled={loading}>
          <RefreshCw size={16} />
          Recarregar
        </button>
      </header>

      {/* ── PRODUTOS FIAT ───────────────────────────────── */}
      <section className="card" style={s.section}>
        <h2 style={s.sectionTitle}>Produtos Fiat — Stripe &amp; Pagar.me</h2>
        <p style={s.sectionNote}>
          Os valores são em centavos internamente. Insira o preço em reais/dólares e salve.
        </p>

        {loading && (
          <div style={s.stateBox}>
            <Loader2 size={22} style={{ animation: "spin 1s linear infinite" }} />
            <span>Carregando preços do banco…</span>
          </div>
        )}

        {loadError && (
          <div style={{ ...s.stateBox, color: "var(--red, #f87171)" }}>
            <AlertCircle size={20} />
            <span>{loadError}</span>
          </div>
        )}

        {!loading && !loadError && prices.map((p) => {
          const edit = edits[p.product_code] ?? { usd: "0", brl: "0", label: p.label };
          const status = saveStatus[p.product_code] ?? "idle";
          return (
            <article key={p.product_code} style={s.priceCard}>
              <div style={s.priceCardTop}>
                <div style={s.priceCardInfo}>
                  <strong style={s.productCode}>{p.product_code}</strong>
                  <span style={s.liveValues}>
                    Atual: {centsToDisplay(p.amount_usd_cents, "usd")} USD &nbsp;|&nbsp;
                    {centsToDisplay(p.amount_brl_cents, "brl")} BRL
                  </span>
                  <span style={s.updatedBy}>
                    {p.updated_by
                      ? `Atualizado por ${p.updated_by.slice(0, 8)}…${p.updated_by.slice(-4)}`
                      : "Nunca atualizado"}{" "}
                    — {new Date(p.updated_at).toLocaleString("pt-BR")}
                  </span>
                </div>

                <div style={s.priceActions}>
                  <button
                    style={{
                      ...s.saveBtn,
                      ...(status === "success"
                        ? { background: "rgba(85,240,192,0.2)", borderColor: "var(--green, #55f0c0)", color: "var(--green, #55f0c0)" }
                        : status === "error"
                        ? { background: "rgba(248,113,113,0.15)", borderColor: "#f87171", color: "#f87171" }
                        : {}),
                    }}
                    onClick={() => savePrice(p.product_code)}
                    disabled={status === "saving"}
                  >
                    {status === "saving" && <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />}
                    {status === "success" && <CheckCircle2 size={14} />}
                    {status === "error" && <AlertCircle size={14} />}
                    {status === "idle" && <Save size={14} />}
                    {status === "saving" ? "Salvando…" : status === "success" ? "Salvo!" : status === "error" ? "Erro" : "Salvar"}
                  </button>
                </div>
              </div>

              <div style={s.fieldRow}>
                <label style={s.field}>
                  <span style={s.fieldLabel}>Label do produto</span>
                  <input
                    style={s.input}
                    value={edit.label}
                    onChange={(e) =>
                      setEdits((prev) => ({
                        ...prev,
                        [p.product_code]: { ...edit, label: e.target.value },
                      }))
                    }
                  />
                </label>
                <label style={s.field}>
                  <span style={s.fieldLabel}>Preço USD ($)</span>
                  <input
                    style={s.input}
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
                <label style={s.field}>
                  <span style={s.fieldLabel}>Preço BRL (R$)</span>
                  <input
                    style={s.input}
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
      </section>

      {/* ── TAXA ON-CHAIN ───────────────────────────────── */}
      <section className="card" style={s.section}>
        <div style={s.sectionHeader}>
          <div>
            <h2 style={s.sectionTitle}>Taxa On-chain — Token Factory</h2>
            <p style={s.sectionNote}>
              Atualiza o valor de <code>feeUSD</code> diretamente no contrato <code>InsteadTokenFactory</code>.
              Requer a wallet owner do contrato conectada.
            </p>
          </div>
          <DollarSign size={22} color="var(--accent-1)" />
        </div>

        <div style={s.onchainGrid}>
          <div style={s.onchainInfo}>
            <span style={s.onchainLabel}>Valor atual no contrato</span>
            <strong style={s.onchainValue}>{currentFeeDisplay}</strong>
            <span style={s.onchainNote}>Convertido para ETH em tempo real via Chainlink (8 dec)</span>
          </div>

          <div style={s.onchainControls}>
            <label style={s.field}>
              <span style={s.fieldLabel}>Novo valor (USD)</span>
              <input
                style={s.input}
                type="number"
                min="0.01"
                step="0.01"
                value={newOnchainFeeUsd}
                onChange={(e) => setNewOnchainFeeUsd(e.target.value)}
              />
            </label>
            <button
              style={{
                ...s.saveBtn,
                marginTop: 4,
                opacity: !isConnected || !factoryAddress || isTxPending ? 0.5 : 1,
                cursor: !isConnected || !factoryAddress ? "not-allowed" : "pointer",
              }}
              onClick={updateOnchainFee}
              disabled={!isConnected || !factoryAddress || isTxPending}
            >
              {isTxPending ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Save size={14} />}
              {isTxPending ? "Aguardando confirmação…" : "Atualizar no Contrato"}
            </button>
            {!isConnected && (
              <p style={{ color: "#f87171", fontSize: 12, marginTop: 6 }}>
                Conecte a wallet owner do contrato para atualizar a taxa on-chain.
              </p>
            )}
            {!factoryAddress && (
              <p style={{ color: "#f87171", fontSize: 12, marginTop: 6 }}>
                Configure <code>NEXT_PUBLIC_FACTORY_ADDRESS</code> no .env para habilitar.
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

const s: Record<string, CSSProperties> = {
  page:          { padding: 32, display: "grid", gap: 24 },
  header:        { display: "grid", gridTemplateColumns: "1fr auto", gap: 24, alignItems: "end" },
  kicker:        { color: "var(--accent-1)", fontSize: 12, fontWeight: 800, textTransform: "uppercase", marginBottom: 10, letterSpacing: 1 },
  title:         { fontFamily: "'Space Grotesk', sans-serif", fontSize: "clamp(28px,4vw,44px)", lineHeight: 1, margin: 0 },
  subtitle:      { color: "var(--text-muted)", fontSize: 15, lineHeight: 1.6, maxWidth: 680, marginTop: 10 },
  refreshBtn:    { display: "flex", alignItems: "center", gap: 8, padding: "10px 18px", background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-primary)", cursor: "pointer", fontSize: 14, fontWeight: 600 },
  section:       { display: "grid", gap: 20 },
  sectionHeader: { display: "flex", justifyContent: "space-between", alignItems: "start" },
  sectionTitle:  { fontSize: 18, margin: 0, fontWeight: 700 },
  sectionNote:   { color: "var(--text-muted)", fontSize: 14, lineHeight: 1.5, marginTop: 6 },
  stateBox:      { display: "flex", alignItems: "center", gap: 10, padding: "16px 0", color: "var(--text-muted)" },
  priceCard:     { border: "1px solid var(--border)", background: "var(--bg-surface)", padding: 20, display: "grid", gap: 16 },
  priceCardTop:  { display: "flex", justifyContent: "space-between", alignItems: "start", flexWrap: "wrap" as const, gap: 12 },
  priceCardInfo: { display: "grid", gap: 4 },
  productCode:   { fontSize: 14, fontFamily: "monospace", color: "var(--accent-1)" },
  liveValues:    { fontSize: 15, fontWeight: 600 },
  updatedBy:     { fontSize: 12, color: "var(--text-muted)" },
  priceActions:  { display: "flex", gap: 10, alignItems: "center" },
  fieldRow:      { display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 16 },
  field:         { display: "grid", gap: 6 },
  fieldLabel:    { fontSize: 12, fontWeight: 700, textTransform: "uppercase" as const, color: "var(--text-muted)", letterSpacing: 0.5 },
  input:         { background: "var(--bg-page, #0a0a0a)", border: "1px solid var(--border)", color: "var(--text-primary)", padding: "10px 12px", fontSize: 15, outline: "none", fontFamily: "inherit" },
  saveBtn:       { display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", background: "rgba(220,255,69,0.12)", border: "1px solid rgba(220,255,69,0.35)", color: "var(--accent-1)", cursor: "pointer", fontSize: 14, fontWeight: 700 },
  onchainGrid:   { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 },
  onchainInfo:   { display: "grid", gap: 6, alignContent: "start" },
  onchainLabel:  { fontSize: 12, fontWeight: 700, textTransform: "uppercase" as const, color: "var(--text-muted)", letterSpacing: 1 },
  onchainValue:  { fontSize: 48, lineHeight: 1, fontFamily: "'Space Grotesk', sans-serif", color: "var(--accent-1)" },
  onchainNote:   { fontSize: 12, color: "var(--text-muted)" },
  onchainControls: { display: "grid", gap: 10, alignContent: "start" },
};
