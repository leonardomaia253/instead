import type { ReactNode } from "react";

export function AdminPage({ title, description, eyebrow = "Instead Operations", action, children, width = "wide" }: {
  title: string;
  description?: string;
  eyebrow?: string;
  action?: ReactNode;
  children: ReactNode;
  width?: "standard" | "wide";
}) {
  return (
    <div className={`admin-page admin-page--${width}`}>
      <header className="admin-page__header">
        <div>
          <span>{eyebrow}</span>
          <h1>{title}</h1>
          {description ? <p>{description}</p> : null}
        </div>
        {action ? <div>{action}</div> : null}
      </header>
      {children}
    </div>
  );
}

export function AdminSection({ title, description, action, children, className = "" }: {
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`admin-section ${className}`.trim()}>
      {title || description || action ? (
        <div className="admin-section__header">
          <div>
            {title ? <h2>{title}</h2> : null}
            {description ? <p>{description}</p> : null}
          </div>
          {action ? <div>{action}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function AdminMetrics({ children }: { children: ReactNode }) {
  return <div className="admin-metrics">{children}</div>;
}

export function AdminMetric({ label, value, tone = "default" }: {
  label: string;
  value: ReactNode;
  tone?: "default" | "positive" | "warning" | "critical";
}) {
  return <div className="admin-metric" data-tone={tone}><span>{label}</span><strong>{value}</strong></div>;
}

export function AdminStatus({ children, tone = "neutral" }: {
  children: ReactNode;
  tone?: "neutral" | "positive" | "warning" | "critical";
}) {
  return <span className="admin-status" data-tone={tone}>{children}</span>;
}
