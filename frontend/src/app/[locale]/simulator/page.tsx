"use client";
import { useState } from "react";
import { Link } from "@/navigation";
import { MetricCard, MetricGrid, PageHeader, ProductShell } from "@/components/ui/Institutional";

// Cenário educativo com preços de referência. Não trate como cotação executável.
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
    <ProductShell width="narrow" className="simulator-shell">
        <PageHeader
          eyebrow="Análise de risco"
          title="Simule antes de comprometer capital"
          description="Entenda a sensibilidade da posição a LTV, juros e variação do colateral antes de qualquer assinatura on-chain."
          backHref="/lending"
          backLabel="Crédito"
        />
        <div className="risk-disclosure">
          Aviso de produção: este simulador não é cotação, promessa de liquidação ou aconselhamento financeiro. Ele serve para entender sensibilidade de LTV, juros e health factor.
        </div>

        <MetricGrid>
          <MetricCard label="Colateral estimado" value={`$${colUSD.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`} />
          <MetricCard label="Crédito simulado" value={`$${borrowUSD.toFixed(0)}`} />
          <MetricCard
            label="Fator de saúde"
            value={healthFactor >= 999 ? "∞" : healthFactor.toFixed(2)}
            tone={healthFactor >= 1.5 ? "positive" : healthFactor >= 1.2 ? "warning" : "critical"}
          />
        </MetricGrid>

        <div className="simulator-grid">
          {/* Inputs */}
          <div className="card simulator-controls">
            <h3>Parâmetros</h3>

            <Field label="Colateral">
              <div className="simulator-asset-input">
                <input type="number" value={colAmount} onChange={(e) => setColAmount(e.target.value)} placeholder="1" />
                <select value={colAsset} onChange={(e) => setColAsset(e.target.value)}>
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
                className="simulator-range"
              />
              <div className="simulator-range-labels">
                <span>Conservador</span><span>Máximo (70% LTV)</span>
              </div>
            </Field>

            <Field label={`Duração do Empréstimo: ${loanDays} dias`}>
              <input type="range" min={1} max={365} value={loanDays}
                onChange={(e) => setLoanDays(Number(e.target.value))}
                className="simulator-range"
              />
            </Field>
          </div>

          {/* Results */}
          <div className="simulator-results">
            {/* Health Factor */}
            <div className="card simulator-health">
              <div className="simulator-health__label">Fator de saúde</div>
              <div className="simulator-health__value" style={{ color: hfColor }}>
                {healthFactor >= 999 ? "∞" : healthFactor.toFixed(2)}
              </div>
              <div className="simulator-health__status" style={{ color: hfColor }}>
                {healthFactor >= 1.5 ? "Posição saudável" : healthFactor >= 1.2 ? "Posição em risco" : "Risco crítico"}
              </div>
            </div>

            {/* Resultados */}
            <div className="card simulator-breakdown">
              <Row label="Valor do Colateral" value={`$${colUSD.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}`} />
              <Row label="Máximo que pode tomar" value={`$${maxBorrowUSD.toFixed(2)}`} />
              <Row label="Valor do Empréstimo" value={`$${borrowUSD.toFixed(2)}`} accent />
              <Row label="Quantidade a receber" value={`${borrowQty.toFixed(4)} ${borrowAsset}`} />
              <div className="simulator-breakdown__group">
                <Row label={`Juros (${loanDays}d @ 4%/ano)`} value={`$${interest.toFixed(4)}`} />
                <Row label="Total a repagar" value={`$${totalRepay.toFixed(2)}`} accent />
              </div>
              <div className="simulator-breakdown__group simulator-breakdown__group--risk">
                <Row label="Preço de Liquidação" value={liquidationPrice > 0 ? `$${liquidationPrice.toFixed(2)}` : "—"} />
                <div className="simulator-breakdown__note">
                  Se {colAsset} cair abaixo deste preço, sua posição será liquidada.
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="simulator-actions">
          <Link href="/lending" className="btn-primary">
            Abrir área de crédito
          </Link>
        </div>
    </ProductShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="field-group">
      <label>{label}</label>
      {children}
    </div>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`data-row${accent ? " data-row--accent" : ""}`}>
      <span>{label}</span>
      <strong>
        {value}
      </strong>
    </div>
  );
}
