"use client";
import { useState } from "react";
import { Link } from "@/navigation";
import { CHAIN_META } from "@/lib/wagmi";
import { useTranslations } from "next-intl";

// Simulação simplificada — preços em USD estáticos para demo
const ASSET_PRICES: Record<string, number> = {
  ETH: 3200,  WETH: 3200,
  BTC: 62000, WBTC: 62000,
  USDC: 1,   USDT: 1,   DAI: 1,
  MATIC: 0.85,AVAX: 35,  BNB: 580,
};

const LTV = 0.70;
const LIQUIDATION_THRESHOLD = 0.80;
const ANNUAL_RATE = 0.04; // 4% ao ano (ótimo de utilização)

export default function SimulatorPage() {
  const [colAsset,    setColAsset]    = useState("ETH");
  const [colAmount,   setColAmount]   = useState("1");
  const [borrowAsset, setBorrowAsset] = useState("USDC");
  const [borrowPct,   setBorrowPct]   = useState(50); // % do maxBorrow
  const [loanDays,    setLoanDays]    = useState(30);

  const colUSD     = (parseFloat(colAmount) || 0) * (ASSET_PRICES[colAsset] || 0);
  const maxBorrowUSD = colUSD * LTV;
  const borrowUSD  = maxBorrowUSD * (borrowPct / 100);
  const borrowQty  = borrowUSD / (ASSET_PRICES[borrowAsset] || 1);
  const interest   = borrowUSD * ANNUAL_RATE * (loanDays / 365);
  const totalRepay = borrowUSD + interest;

  // LiquidationPrice: preço que colateral precisa atingir para HF = 1
  const liquidationColUSD = borrowUSD / LIQUIDATION_THRESHOLD;
  const liquidationPrice  = colUSD > 0 && parseFloat(colAmount) > 0
    ? liquidationColUSD / parseFloat(colAmount)
    : 0;
  const healthFactor = colUSD > 0 && borrowUSD > 0
    ? (colUSD * LIQUIDATION_THRESHOLD) / borrowUSD
    : 999;

  const hfColor = healthFactor >= 1.5 ? "#10b981" : healthFactor >= 1.2 ? "#f59e0b" : "#ef4444";
  const ASSETS = Object.keys(ASSET_PRICES);

  return (
    <main style={{ minHeight: "100vh", padding: "32px 24px" }}>
      <div style={{ maxWidth: 680, margin: "0 auto" }}>
        <Link href="/lending" style={{ color: "var(--text-muted)", fontSize: 13, textDecoration: "none" }}>← Voltar ao Lending</Link>
        <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 28, fontWeight: 700, marginTop: 10, marginBottom: 6 }}>
          🧮 Simulador de Empréstimo
        </h1>
        <p style={{ color: "var(--text-muted)", marginBottom: 28, fontSize: 14 }}>
          Calcule o impacto real de uma posição antes de confirmar na blockchain.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          {/* Inputs */}
          <div className="card" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <h3 style={{ fontWeight: 700, marginBottom: 0 }}>Parâmetros</h3>

            <Field label="Colateral">
              <div style={{ display: "flex", gap: 8 }}>
                <input type="number" value={colAmount} onChange={(e) => setColAmount(e.target.value)} placeholder="1" style={{ flex: 1 }} />
                <select value={colAsset} onChange={(e) => setColAsset(e.target.value)} style={{ width: 100 }}>
                  {ASSETS.map(a => <option key={a}>{a}</option>)}
                </select>
              </div>
            </Field>

            <Field label="Ativo do Empréstimo">
              <select value={borrowAsset} onChange={(e) => setBorrowAsset(e.target.value)}>
                {ASSETS.map(a => <option key={a}>{a}</option>)}
              </select>
            </Field>

            <Field label={`% do Máximo (${borrowPct}%)`}>
              <input type="range" min={1} max={100} value={borrowPct}
                onChange={(e) => setBorrowPct(Number(e.target.value))}
                style={{ width: "100%", accentColor: "var(--accent-1)" }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                <span>Conservador</span><span>Máximo (70% LTV)</span>
              </div>
            </Field>

            <Field label={`Duração do Empréstimo: ${loanDays} dias`}>
              <input type="range" min={1} max={365} value={loanDays}
                onChange={(e) => setLoanDays(Number(e.target.value))}
                style={{ width: "100%", accentColor: "var(--accent-1)" }}
              />
            </Field>
          </div>

          {/* Results */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Health Factor */}
            <div className="card" style={{ textAlign: "center" }}>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>Health Factor</div>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 42, fontWeight: 800, color: hfColor }}>
                {healthFactor >= 999 ? "∞" : healthFactor.toFixed(2)}
              </div>
              <div style={{ fontSize: 11, color: hfColor, fontWeight: 600, marginTop: 4 }}>
                {healthFactor >= 1.5 ? "✅ Posição Saudável" : healthFactor >= 1.2 ? "⚠️ Em Risco" : "🚨 Risco Crítico"}
              </div>
            </div>

            {/* Resultados */}
            <div className="card" style={{ display: "flex", flexDirection: "column", gap: 14, fontSize: 14 }}>
              <Row label="Valor do Colateral" value={`$${colUSD.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}`} />
              <Row label="Máximo que pode tomar" value={`$${maxBorrowUSD.toFixed(2)}`} />
              <Row label="Valor do Empréstimo" value={`$${borrowUSD.toFixed(2)}`} accent />
              <Row label="Quantidade a receber" value={`${borrowQty.toFixed(4)} ${borrowAsset}`} />
              <div style={{ borderTop: "1px solid var(--border)", marginTop: 4, paddingTop: 14 }}>
                <Row label={`Juros (${loanDays}d @ 4%/ano)`} value={`$${interest.toFixed(4)}`} />
                <Row label="Total a repagar" value={`$${totalRepay.toFixed(2)}`} accent />
              </div>
              <div style={{ borderTop: "1px solid var(--border)", marginTop: 4, paddingTop: 14, background: "rgba(239,68,68,0.06)", borderRadius: 8, padding: 10 }}>
                <Row label="Preço de Liquidação" value={liquidationPrice > 0 ? `$${liquidationPrice.toFixed(2)}` : "—"} />
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6 }}>
                  Se {colAsset} cair abaixo deste preço, sua posição será liquidada.
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 24, textAlign: "center" }}>
          <Link href="/lending" className="btn-primary" style={{ textDecoration: "none" }}>
            Ir para Lending →
          </Link>
        </div>
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-muted)", marginBottom: 8 }}>{label}</label>
      {children}
    </div>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ color: "var(--text-muted)", fontSize: 13 }}>{label}</span>
      <span style={{ fontWeight: accent ? 700 : 500, color: accent ? "var(--text-primary)" : "var(--text-muted)", fontSize: accent ? 15 : 13 }}>
        {value}
      </span>
    </div>
  );
}
