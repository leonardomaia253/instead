"use client";

import { AlertTriangle, CheckCircle2, HelpCircle, ShieldCheck, WalletCards } from "lucide-react";
import { WalletConnectButton } from "@/components/WalletConnectButton";

export function SimpleModeNotice({
  title = "Modo simples",
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="simple-mode-notice" aria-label={title}>
      <div className="simple-mode-notice__icon" aria-hidden="true">
        <HelpCircle size={20} />
      </div>
      <div>
        <strong>{title}</strong>
        <p>{children}</p>
      </div>
    </section>
  );
}

export function WalletHelpCard({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`wallet-help-card ${compact ? "wallet-help-card--compact" : ""}`}>
      <div className="wallet-help-card__header">
        <WalletCards size={20} aria-hidden="true" />
        <strong>Entrar com carteira, explicado</strong>
      </div>
      <ul>
        <li>Serve para provar que a conta e sua, como assinar um recibo digital.</li>
        <li>Nao envia dinheiro e nao movimenta seus ativos sozinho.</li>
        <li>Antes de qualquer custo, a tela mostra uma revisao para confirmar.</li>
      </ul>
      <WalletConnectButton label="Conectar carteira com seguranca" />
    </div>
  );
}

export function SafetyChecklist({ items }: { items: string[] }) {
  return (
    <div className="safety-checklist" aria-label="Checklist de seguranca">
      {items.map((item) => (
        <div key={item} className="safety-checklist__item">
          <CheckCircle2 size={16} aria-hidden="true" />
          <span>{item}</span>
        </div>
      ))}
    </div>
  );
}

export function RiskWarning({ children }: { children: React.ReactNode }) {
  return (
    <div className="risk-warning" role="note">
      <AlertTriangle size={18} aria-hidden="true" />
      <p>{children}</p>
    </div>
  );
}

export function PlainLanguageGlossary({
  items,
}: {
  items: Array<{ term: string; meaning: string }>;
}) {
  return (
    <div className="plain-glossary" aria-label="Traducao de termos">
      <div className="plain-glossary__title">
        <ShieldCheck size={17} aria-hidden="true" />
        <strong>Traduzindo os termos</strong>
      </div>
      <dl>
        {items.map((item) => (
          <div key={item.term}>
            <dt>{item.term}</dt>
            <dd>{item.meaning}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
