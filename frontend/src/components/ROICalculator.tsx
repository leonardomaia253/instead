"use client";

import React, { useState } from "react";
import { Calculator } from "lucide-react";

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
    <div className="card roi-calculator">
      <div className="roi-calculator__header">
        <div>
          <Calculator size={20} />
        </div>
        <h4>
          Projeção de rendimento
        </h4>
      </div>

      <div className="roi-calculator__form">
        <div>
          <label>
            Valor do Investimento ({tokenSymbol})
          </label>
          <input
            type="number"
            value={principal}
            onChange={(e) => setPrincipal(e.target.value)}
            placeholder="1000"
          />
        </div>

        <div className="roi-calculator__grid">
          <div>
            <label>
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
            <label>
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

        <div className="roi-calculator__results">
          <div>
            <span>Retorno estimado</span>
            <strong>
              {futureValue.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} {tokenSymbol}
            </strong>
          </div>
          <div>
            <span>Rendimento total</span>
            <strong data-tone="positive">
              +{totalInterest.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} {tokenSymbol}
            </strong>
          </div>
          <div>
            <span>ROI estimado</span>
            <strong data-tone="accent">
              {roi.toFixed(2)}%
            </strong>
          </div>
        </div>
      </div>
    </div>
  );
}
