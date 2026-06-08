"use client";

import React, { useState } from "react";
import { Calculator, TrendingUp, Calendar, DollarSign } from "lucide-react";

interface ROICalculatorProps {
  defaultApr: number;
  tokenSymbol: string;
}

export function ROICalculator({ defaultApr, tokenSymbol }: ROICalculatorProps) {
  const [principal, setPrincipal] = useState("1000");
  const [years, setYears] = useState(1);
  const [compoundFrequency, setCompoundFrequency] = useState("daily"); // daily, weekly, monthly, yearly

  const getCompoundTimes = () => {
    switch (compoundFrequency) {
      case "daily": return 365;
      case "weekly": return 52;
      case "monthly": return 12;
      case "yearly": return 1;
      default: return 365;
    }
  };

  const p = parseFloat(principal) || 0;
  const r = defaultApr / 100;
  const n = getCompoundTimes();
  const t = years;

  // Fórmula de Juros Compostos: A = P * (1 + r/n)^(n*t)
  const futureValue = p * Math.pow(1 + r / n, n * t);
  const totalInterest = futureValue - p;
  const roi = p > 0 ? (totalInterest / p) * 100 : 0;

  return (
    <div className="card" style={{ background: "rgba(255,255,255,0.01)", border: "1px solid var(--border)", padding: 24, borderRadius: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <div style={{ background: "rgba(16,185,129,0.1)", padding: 8, borderRadius: 10, color: "var(--green)" }}>
          <Calculator size={20} />
        </div>
        <h4 style={{ margin: 0, fontSize: 16, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif" }}>
          Calculadora de ROI Pro
        </h4>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <label style={{ display: "block", fontSize: 12, color: "var(--text-muted)", marginBottom: 6 }}>
            Valor do Investimento ({tokenSymbol})
          </label>
          <input
            type="number"
            value={principal}
            onChange={(e) => setPrincipal(e.target.value)}
            placeholder="1000"
            style={{ fontSize: 15 }}
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label style={{ display: "block", fontSize: 12, color: "var(--text-muted)", marginBottom: 6 }}>
              Período (Anos)
            </label>
            <select value={years} onChange={(e) => setYears(Number(e.target.value))}>
              <option value={1}>1 Ano</option>
              <option value={3}>3 Anos</option>
              <option value={5}>5 Anos</option>
              <option value={10}>10 Anos</option>
            </select>
          </div>

          <div>
            <label style={{ display: "block", fontSize: 12, color: "var(--text-muted)", marginBottom: 6 }}>
              Capitalização
            </label>
            <select value={compoundFrequency} onChange={(e) => setCompoundFrequency(e.target.value)}>
              <option value="daily">Diária</option>
              <option value="weekly">Semanal</option>
              <option value="monthly">Mensal</option>
              <option value="yearly">Anual</option>
            </select>
          </div>
        </div>

        <div style={{
          marginTop: 12,
          padding: 16,
          background: "rgba(255,255,255,0.02)",
          borderRadius: 12,
          border: "1px solid var(--border)"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ fontSize: 13, color: "var(--text-muted)" }}>Retorno Estimado:</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: "white" }}>
              {futureValue.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} {tokenSymbol}
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ fontSize: 13, color: "var(--text-muted)" }}>Rendimento Total:</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: "var(--green)" }}>
              +{totalInterest.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} {tokenSymbol}
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: 13, color: "var(--text-muted)" }}>ROI Estimado:</span>
            <span style={{ fontSize: 14, fontWeight: 800, color: "var(--accent-1)" }}>
              {roi.toFixed(2)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}