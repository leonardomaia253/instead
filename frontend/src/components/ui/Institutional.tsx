import type { ReactNode } from "react";
import { Link } from "@/navigation";

type ProductShellProps = {
  children: ReactNode;
  className?: string;
  width?: "narrow" | "standard" | "wide";
};

export function ProductShell({ children, className = "", width = "standard" }: ProductShellProps) {
  return (
    <main className={`product-shell ${className}`.trim()}>
      <div className={`product-shell__inner product-shell__inner--${width}`}>{children}</div>
    </main>
  );
}

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
  action?: ReactNode;
  align?: "left" | "center";
};

export function PageHeader({
  eyebrow,
  title,
  description,
  backHref,
  backLabel = "Voltar",
  action,
  align = "left",
}: PageHeaderProps) {
  return (
    <header className={`institutional-header institutional-header--${align}`}>
      <div className="institutional-header__copy">
        {backHref ? <Link className="institutional-back" href={backHref}>← {backLabel}</Link> : null}
        {eyebrow ? <span className="institutional-eyebrow">{eyebrow}</span> : null}
        <h1>{title}</h1>
        {description ? <p>{description}</p> : null}
      </div>
      {action ? <div className="institutional-header__action">{action}</div> : null}
    </header>
  );
}

export function MetricGrid({ children }: { children: ReactNode }) {
  return <section className="metric-grid" aria-label="Indicadores principais">{children}</section>;
}

export function MetricCard({ label, value, note, tone = "default" }: {
  label: string;
  value: ReactNode;
  note?: ReactNode;
  tone?: "default" | "positive" | "warning" | "critical";
}) {
  return (
    <article className="metric-card" data-tone={tone}>
      <span>{label}</span>
      <strong>{value}</strong>
      {note ? <small>{note}</small> : null}
    </article>
  );
}

export function PanelHeader({ title, description, action }: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="panel-header">
      <div>
        <h2>{title}</h2>
        {description ? <p>{description}</p> : null}
      </div>
      {action ? <div className="panel-header__action">{action}</div> : null}
    </div>
  );
}

export function FilterBar({ children }: { children: ReactNode }) {
  return <div className="filter-bar">{children}</div>;
}

export function EmptyState({ title, description, action }: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <span className="empty-state__mark" aria-hidden="true" />
      <h3>{title}</h3>
      {description ? <p>{description}</p> : null}
      {action ? <div>{action}</div> : null}
    </div>
  );
}
