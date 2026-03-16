"use client";

type SkeletonProps = { width?: string | number; height?: string | number; radius?: number; style?: React.CSSProperties };

export function Skeleton({ width = "100%", height = 20, radius = 8, style }: SkeletonProps) {
  return (
    <div style={{
      width, height, borderRadius: radius,
      background: "linear-gradient(90deg, var(--bg-card) 25%, var(--bg-surface) 50%, var(--bg-card) 75%)",
      backgroundSize: "200% 100%",
      animation: "shimmer 1.5s infinite",
      ...style,
    }}>
      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
    </div>
  );
}

export function TokenCardSkeleton() {
  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Skeleton width={44} height={44} radius={999} />
        <div style={{ flex: 1 }}>
          <Skeleton height={16} width="60%" style={{ marginBottom: 8 }} />
          <Skeleton height={12} width="40%" />
        </div>
      </div>
      <Skeleton height={12} />
      <Skeleton height={12} width="80%" />
      <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
        <Skeleton height={28} width={80} radius={999} />
        <Skeleton height={28} width={80} radius={999} />
      </div>
    </div>
  );
}

export function PositionCardSkeleton() {
  return (
    <div className="card">
      <Skeleton height={18} width="50%" style={{ marginBottom: 16 }} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {[...Array(4)].map((_, i) => (
          <div key={i}>
            <Skeleton height={12} width="60%" style={{ marginBottom: 6 }} />
            <Skeleton height={20} width="80%" />
          </div>
        ))}
      </div>
      <Skeleton height={8} radius={999} style={{ marginTop: 16 }} />
    </div>
  );
}
