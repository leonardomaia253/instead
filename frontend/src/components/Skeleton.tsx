"use client";

type SkeletonProps = { width?: string | number; height?: string | number; radius?: number; style?: React.CSSProperties };

export function Skeleton({ width = "100%", height = 20, radius = 8, style }: SkeletonProps) {
  return (
    <div className="skeleton" aria-hidden="true" style={{ width, height, borderRadius: radius, ...style }} />
  );
}

export function TokenCardSkeleton() {
  return (
    <div className="card skeleton-card">
      <div className="skeleton-card__header">
        <Skeleton width={44} height={44} radius={999} />
        <div className="skeleton-card__copy">
          <Skeleton height={16} width="60%" style={{ marginBottom: 8 }} />
          <Skeleton height={12} width="40%" />
        </div>
      </div>
      <Skeleton height={12} />
      <Skeleton height={12} width="80%" />
      <div className="skeleton-card__actions">
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
      <div className="skeleton-card__metrics">
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
