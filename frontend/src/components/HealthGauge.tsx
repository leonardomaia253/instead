"use client";

type HealthGaugeProps = {
  healthFactor: number;
  size?: number;
};

/**
 * Medidor visual (gauge) do Health Factor.
 * Verde > 1.5 | Amarelo 1.2-1.5 | Vermelho < 1.2
 */
export function HealthGauge({ healthFactor, size = 140 }: HealthGaugeProps) {
  const capped = Math.min(healthFactor, 3);
  const pct    = Math.min(1, (capped - 0) / 3);

  const tone = healthFactor >= 1.5 ? "healthy" : healthFactor >= 1.2 ? "warning" : "critical";
  const color = `var(--risk-${tone})`;

  const label =
    healthFactor >= 1.5 ? "Saudável" :
    healthFactor >= 1.2 ? "Em Risco" :
    "Crítico";

  // SVG arc (semi-circle gauge)
  const r = 50;
  const cx = 60, cy = 60;
  const startAngle = Math.PI;
  const endAngle   = 2 * Math.PI;
  const angle = startAngle + pct * (endAngle - startAngle);

  const x1 = cx + r * Math.cos(startAngle), y1 = cy + r * Math.sin(startAngle);
  const x2 = cx + r * Math.cos(endAngle),   y2 = cy + r * Math.sin(endAngle);
  const xP = cx + r * Math.cos(angle),       yP = cy + r * Math.sin(angle);

  const bgArc   = `M ${x1} ${y1} A ${r} ${r} 0 1 1 ${x2} ${y2}`;
  const fgArc   = pct === 0 ? "" : `M ${x1} ${y1} A ${r} ${r} 0 ${pct > 0.5 ? 1 : 0} 1 ${xP} ${yP}`;

  const displayHF = healthFactor >= 999 ? "∞" : healthFactor.toFixed(2);

  return (
    <div className="health-gauge" data-tone={tone}>
      <svg width={size} height={size * 0.7} viewBox="0 0 120 75" style={{ overflow: "visible" }}>
        {/* Background track */}
        <path d={bgArc} fill="none" stroke="var(--border)" strokeWidth={10} strokeLinecap="round" />
        {/* Filled arc */}
        {fgArc && (
          <path d={fgArc} fill="none" stroke={color} strokeWidth={10} strokeLinecap="round"
            className="health-gauge__value"
          />
        )}
        {/* Center value */}
        <text x={cx} y={cy + 8} textAnchor="middle" fill="var(--text-primary)"
          fontSize={18} fontWeight={700} fontFamily="'Space Grotesk', sans-serif">
          {displayHF}
        </text>
      </svg>
      <div className="health-gauge__label">
        {label}
      </div>
    </div>
  );
}
