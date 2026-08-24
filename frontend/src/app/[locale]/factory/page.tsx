"use client";

import { WalletConnectButton } from "@/components/WalletConnectButton";

import { useSearchParams } from 'next/navigation';
import { useState, useEffect } from "react";
import { useAccount, useSwitchChain, useChainId, useReadContract, useWriteContract, useWaitForTransactionReceipt, usePublicClient } from "wagmi";
import { formatEther, parseEther } from "ethers";
import { Link } from "@/navigation";
import { useTranslations } from "next-intl";
import { CHAIN_META, TOKEN_FACTORY_ABI, SUPPORTED_CHAINS } from "@/lib/wagmi";
import {
  supabase,
  insertGeneratedToken,
  insertAudit,
  enqueueReconciliation,
  type GeneratedToken
} from "@/lib/supabase";
import { OnboardingWizard } from "@/components/OnboardingWizard";
import { AIAssistant } from "@/components/shared/AIAssistant";
import { PlainLanguageGlossary, SafetyChecklist, SimpleModeNotice, WalletHelpCard } from "@/components/ElderFriendly";
import { analyzeTokenConfig, type TokenRiskLevel } from "@/lib/tokenIntelligence";
import { PageHeader } from "@/components/ui/Institutional";

// ─── Tipos ────────────────────────────────────────────────────────────────────
type TokenForm = {
  template: "standard" | "ultimate" | "fair_launch" | "deflationary" | "superchain";
  // Passo 1 – Rede
  chainId: number;
  // Passo 2 – Identidade
  name: string;
  symbol: string;
  description: string;
  // Passo 3 – Supply & Decimais
  initialSupply: string;
  maxSupply: string;
  decimals: number;
  // Passo 4 – Funcionalidades
  mintable: boolean;
  burnable: boolean;
  taxable: boolean;
  taxPercent: string;
  hasBlacklist: boolean;
  burnTax: boolean;
  maxWalletPercent: string;
  fairLaunchLiquidityEth: string;
  // Passo 5 – Review
};

const STEPS = [
  { id: 1, label: "Rede", icon: "01" },
  { id: 2, label: "Identidade", icon: "02" },
  { id: 3, label: "Oferta", icon: "03" },
  { id: 4, label: "Funções", icon: "04" },
  { id: 5, label: "Revisão", icon: "05" },
];

const INITIAL_FORM: TokenForm = {
  template: "standard",
  chainId: 8453,
  name: "",
  symbol: "",
  description: "",
  initialSupply: "1000000",
  maxSupply: "10000000",
  decimals: 18,
  mintable: false,
  burnable: true,
  taxable: false,
  taxPercent: "2",
  hasBlacklist: false,
  burnTax: false,
  maxWalletPercent: "0",
  fairLaunchLiquidityEth: "0.1",
};

const TOKEN_PRESETS = [
  {
    id: "ultimate" as const,
    title: "Modelo Completo (Recomendado)",
    tag: "Mais Completo",
    description: "Estrutura institucional com limite de emissão, proteção contra fraudes, governança e alta flexibilidade.",
    apply: (form: TokenForm): TokenForm => ({
      ...form,
      template: "ultimate",
      mintable: true,
      burnable: true,
      taxable: false,
      taxPercent: "2",
      hasBlacklist: true,
      burnTax: false,
      maxWalletPercent: "0",
      fairLaunchLiquidityEth: form.fairLaunchLiquidityEth,
    }),
  },
  {
    id: "fair_launch" as const,
    title: "Lançamento Justo (Comunidade)",
    tag: "100% Transparente",
    description: "Distribuição igualitária para a comunidade, sem moedas reservadas e sem emissões futuras.",
    apply: (form: TokenForm): TokenForm => ({
      ...form,
      template: "fair_launch",
      maxSupply: form.initialSupply || "1000000",
      mintable: false,
      burnable: true,
      taxable: false,
      taxPercent: "0",
      hasBlacklist: false,
      burnTax: false,
      maxWalletPercent: "0",
      fairLaunchLiquidityEth: form.fairLaunchLiquidityEth || "0.1",
    }),
  },
  {
    id: "deflationary" as const,
    title: "Modelo Deflacionário",
    tag: "Escassez Programada",
    description: "Queima automática a cada movimentação e proteção antibaleia para reduzir a concentração de mercado.",
    apply: (form: TokenForm): TokenForm => ({
      ...form,
      template: "deflationary",
      mintable: false,
      burnable: true,
      taxable: true,
      taxPercent: "2",
      hasBlacklist: false,
      burnTax: true,
      maxWalletPercent: "2",
      fairLaunchLiquidityEth: form.fairLaunchLiquidityEth,
    }),
  },
  {
    id: "superchain" as const,
    title: "Alta Performance (Base / Optimism)",
    tag: "Baixa Taxa",
    description: "Otimizado para redes de segunda camada, garantindo transações ultra-rápidas e custo de centavos.",
    apply: (form: TokenForm): TokenForm => ({
      ...form,
      template: "superchain",
      mintable: false,
      burnable: true,
      taxable: false,
      taxPercent: "0",
      hasBlacklist: false,
      burnTax: false,
      maxWalletPercent: "0",
      fairLaunchLiquidityEth: form.fairLaunchLiquidityEth,
    }),
  },
];

// ─── Componentes de cada passo ────────────────────────────────────────────────

function StepNetwork({ form, setForm }: { form: TokenForm; setForm: (f: TokenForm) => void }) {
  const { switchChain } = useSwitchChain();
  return (
    <div>
      <h2 style={styles.stepTitle}>Escolha a Rede Blockchain</h2>
      <p style={styles.stepDesc}>
        Selecione a rede onde o seu token será lançado. Cada rede tem características distintas de custo e ecossistema.
      </p>
      <PlainLanguageGlossary
        items={[
          { term: "Rede", meaning: "O lugar onde o token vai existir. Redes diferentes cobram taxas diferentes." },
          { term: "Gas", meaning: "A taxa de operação da rede. Quanto menor, mais barato confirmar ações." },
          { term: "Liquidez", meaning: "Facilidade para outras pessoas comprarem ou venderem o token depois." },
        ]}
      />
      <div className="factory-option-grid">
        {Object.entries(CHAIN_META).map(([id, meta]) => {
          const chainId = parseInt(id);
          const active = form.chainId === chainId;
          return (
            <button
              key={id}
              onClick={() => { setForm({ ...form, chainId }); switchChain?.({ chainId }); }}
              className="factory-option"
              data-active={active}
            >
              <strong>{meta.name}</strong>
              <span>{meta.gasLabel}</span>
              {active && <small>Rede selecionada</small>}
            </button>
          );
        })}
      </div>
      <InfoBox color="blue">
        <strong>Recomendação simples:</strong> se estiver em dúvida, comece por <strong>Base</strong> ou <strong>Arbitrum</strong>. Elas costumam ser baratas e populares para novos projetos.
      </InfoBox>
    </div>
  );
}

function StepIdentity({ form, setForm }: { form: TokenForm; setForm: (f: TokenForm) => void }) {
  const symbolPreview = form.symbol.toUpperCase().slice(0, 8);
  return (
    <div>
      <h2 style={styles.stepTitle}>Identidade do Token</h2>
      <p style={styles.stepDesc}>Defina o nome, símbolo e a descrição que aparecerão nos exploradores de blockchain e carteiras.</p>

      <FieldGroup label="Nome do Token" hint="Nome completo e legível. Ex: 'Meu Token de Utilidade'">
        <input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Ex: Instead Utility Token"
          maxLength={50}
        />
        <CharCount current={form.name.length} max={50} />
      </FieldGroup>

      <FieldGroup label="Símbolo (Ticker)" hint="Abreviação de 2-8 letras maiúsculas. Ex: UNI, AAVE, BTC">
        <input
          value={form.symbol}
          onChange={(e) => setForm({ ...form, symbol: e.target.value.toUpperCase().replace(/[^A-Z]/g, "") })}
          placeholder="IUT"
          maxLength={8}
          className="ticker-input"
        />
        {form.symbol && (
          <div className="field-note">
            Aparecerá como: <strong>${symbolPreview}</strong>
          </div>
        )}
      </FieldGroup>

      <FieldGroup label="Descrição (Opcional)" hint="Uma frase descrevendo a utilidade do token. Salva nos metadados da plataforma.">
        <textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="Token de governança e utilidade da plataforma Instead..."
          maxLength={200}
          rows={3}
          className="factory-textarea"
        />
        <CharCount current={form.description.length} max={200} />
      </FieldGroup>

      <InfoBox color="purple">
        <strong>Importante:</strong> O nome e o símbolo ficam <strong>gravados permanentemente</strong> na blockchain e <strong>não podem ser alterados</strong> após a publicação.
      </InfoBox>
    </div>
  );
}

function StepSupply({ form, setForm }: { form: TokenForm; setForm: (f: TokenForm) => void }) {
  const initial = parseFloat(form.initialSupply || "0");
  const max = parseFloat(form.maxSupply || "0");
  const pct = max > 0 ? Math.min(100, (initial / max) * 100) : 0;

  return (
    <div>
      <h2 style={styles.stepTitle}>Supply & Decimais</h2>
      <p style={styles.stepDesc}>Configure a quantidade de tokens que serão criados e o limite máximo permitido.</p>

      <FieldGroup label="Supply Inicial" hint="Quantidade de tokens mintados imediatamente ao criador após o deploy.">
        <input
          type="number"
          value={form.initialSupply}
          onChange={(e) => setForm({ ...form, initialSupply: e.target.value })}
          min={1}
          placeholder="1000000"
        />
        <div className="field-note">
          = {formatNumber(form.initialSupply)} tokens criados imediatamente para a sua carteira.
        </div>
      </FieldGroup>

      <FieldGroup label="Supply Máximo (Cap)" hint="Limite absoluto de tokens que podem existir. Após atingido, nenhum minting adicional é possível.">
        <input
          type="number"
          value={form.maxSupply}
          onChange={(e) => setForm({ ...form, maxSupply: e.target.value })}
          min={parseFloat(form.initialSupply) || 1}
          placeholder="10000000"
        />
        {max < initial && (
          <div className="field-error">
            O supply máximo não pode ser menor que o inicial.
          </div>
        )}
      </FieldGroup>

      {/* Barra visual de distribuição */}
      <div className="supply-preview">
        <div className="supply-preview__header">
          <span>Supply inicial</span>
          <strong>{pct.toFixed(1)}% do máximo</strong>
        </div>
        <div className="supply-preview__track">
          <div style={{ width: `${pct}%` }} />
        </div>
        <div className="supply-preview__range">
          <span>0</span><span>{formatNumber(form.maxSupply)}</span>
        </div>
      </div>

      <FieldGroup label="Casas Decimais" hint="18 é o padrão ERC-20 (igual ao ETH). Use 6 para tokens estáveis como USDC.">
        <div className="segmented-options">
          {[6, 8, 18].map((d) => (
            <button
              key={d}
              onClick={() => setForm({ ...form, decimals: d })}
              className="segmented-options__button"
              data-active={form.decimals === d}
            >
              {d}
            </button>
          ))}
          <input
            type="number"
            value={form.decimals}
            onChange={(e) => setForm({ ...form, decimals: parseInt(e.target.value) || 18 })}
            min={0} max={18}
            className="segmented-options__input"
            placeholder="18"
          />
        </div>
        <div className="field-note">
          Com {form.decimals} decimais: 1 token = 10<sup>{form.decimals}</sup> unidades mínimas.
        </div>
      </FieldGroup>

      {form.template === "fair_launch" && (
        <FieldGroup label="Liquidez inicial em ETH" hint="Valor em ETH que sera enviado junto com 100% do supply para o pool DEX no deploy.">
          <input
            type="number"
            value={form.fairLaunchLiquidityEth}
            onChange={(e) => setForm({ ...form, fairLaunchLiquidityEth: e.target.value })}
            min={0.0001}
            step={0.01}
            placeholder="0.1"
          />
          <div className="field-note">
            No Fair Launch on-chain, o criador nao recebe tokens soltos no deploy; 100% do supply vai para liquidez.
          </div>
        </FieldGroup>
      )}
    </div>
  );
}

function StepFeatures({ form, setForm }: { form: TokenForm; setForm: (f: TokenForm) => void }) {
  const features = [
    {
      key: "mintable" as const,
      icon: "M",
      title: "Mintável (Mintable)",
      desc: "O proprietário pode criar mais tokens após o deploy, respeitando o supply máximo definido.",
      risk: "Médio",
      riskColor: "#f59e0b",
    },
    {
      key: "burnable" as const,
      icon: "B",
      title: "Queimável (Burnable)",
      desc: "Qualquer holder pode destruir (queimar) seus próprios tokens, reduzindo o supply circulante permanentemente.",
      risk: "Baixo",
      riskColor: "#10b981",
    },
    {
      key: "taxable" as const,
      icon: "%",
      title: "Taxa por Transferência",
      desc: "Cobra uma porcentagem automática a cada transferência, enviando para a treasury do protocolo.",
      risk: "Alto",
      riskColor: "#ef4444",
    },
    {
      key: "hasBlacklist" as const,
      icon: "S",
      title: "Blacklist/Compliance",
      desc: "Permite a carteira administradora bloquear enderecos. Use apenas quando houver motivo operacional ou regulatorio claro.",
      risk: "Alto",
      riskColor: "#ef4444",
    },
    {
      key: "burnTax" as const,
      icon: "F",
      title: "Taxa de Queima Deflacionaria",
      desc: "Quando a taxa estiver ativa, envia a taxa para burn em vez de treasury.",
      risk: "Médio",
      riskColor: "#f59e0b",
    },
  ];

  return (
    <div>
      <h2 style={styles.stepTitle}>Funcionalidades do Token</h2>
      <p style={styles.stepDesc}>Ative as funcionalidades avançadas do seu token. Cada uma afeta o comportamento econômico e a percepção de confiança.</p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginTop: 20 }}>
        {TOKEN_PRESETS.map((preset) => (
          <button
            key={preset.id}
            onClick={() => setForm(preset.apply(form))}
            className="factory-preset"
            data-active={form.template === preset.id}
          >
            <div>
              <strong>{preset.title}</strong>
              <span>{preset.tag}</span>
            </div>
            <p>{preset.description}</p>
          </button>
        ))}
      </div>

      <div className="factory-feature-list">
        {features.map((f) => (
          <div
            key={f.key}
            onClick={() => setForm({ ...form, [f.key]: !form[f.key] })}
            className="factory-feature"
            data-active={form[f.key]}
          >
            <div className="factory-feature__copy">
              <div className="factory-feature__header">
                <strong>{f.title}</strong>
                <span style={{ color: f.riskColor }}>
                  Risco {f.risk}
                </span>
              </div>
              <p>{f.desc}</p>

              {f.key === "taxable" && form.taxable && (
                <div className="factory-feature__nested" onClick={(e) => e.stopPropagation()}>
                  <label>
                    Porcentagem da Taxa (%)
                  </label>
                  <input
                    type="number"
                    value={form.taxPercent}
                    onChange={(e) => setForm({ ...form, taxPercent: e.target.value })}
                    min={0.1} max={25} step={0.1}
                    className="factory-feature__input"
                    placeholder="2"
                  />
                  <div className="field-note">
                    A cada transferência de 1.000 tokens, {parseFloat(form.taxPercent || "0") * 10} tokens vão para a treasury.
                  </div>
                </div>
              )}
              {f.key === "burnTax" && form.burnTax && !form.taxable && (
                <div className="field-error">
                  Ative taxa por transferencia para usar queima deflacionaria.
                </div>
              )}
            </div>
            <div className="factory-feature__check">
              {form[f.key] ? "✓" : ""}
            </div>
          </div>
        ))}
      </div>

      <FieldGroup label="Anti-whale: maximo por carteira (%)" hint="0 desativa. Ex: 2 limita cada carteira a 2% do cap, exceto a carteira administradora inicial.">
        <input
          type="number"
          value={form.maxWalletPercent}
          onChange={(e) => setForm({ ...form, maxWalletPercent: e.target.value })}
          min={0}
          max={100}
          step={0.1}
          className="factory-short-input"
          placeholder="0"
        />
      </FieldGroup>

      <InfoBox color="red">
        Ativos com taxa por transação são frequentemente sinalizados como <strong>suspeitos</strong> em scanners independentes. Confirme que a utilidade é legítima e documentada.
      </InfoBox>
    </div>
  );
}

function StepReview({
  form,
  feeInEth,
  onDeploy,
  isPending,
  isConfirming,
  isConfirmed,
  txHash,
  error,
  onFiatCheckout,
  fiatCheckoutStatus,
}: {
  form: TokenForm;
  feeInEth?: bigint;
  onDeploy: () => void;
  isPending: boolean;
  isConfirming: boolean;
  isConfirmed: boolean;
  txHash?: string;
  error: Error | null;
  onFiatCheckout: (provider: "stripe" | "pagarme", productCode: string) => void;
  fiatCheckoutStatus: "idle" | "loading" | "auth_required" | "kyc_required" | "error";
}) {
  const chainMeta = CHAIN_META[form.chainId];
  const intelligence = analyzeTokenConfig(form);
  const rows = [
    ["Rede", `${chainMeta?.icon} ${chainMeta?.name}`],
    ["Nome", form.name || "—"],
    ["Símbolo", `$${form.symbol || "—"}`],
    ["Descrição", form.description || "(nenhuma)"],
    ["Supply Inicial", formatNumber(form.initialSupply)],
    ["Supply Máximo", formatNumber(form.maxSupply)],
    ["Decimais", `${form.decimals}`],
    ["Template", form.template],
    ["Mintável", form.mintable ? "Sim" : "Não"],
    ["Queimável", form.burnable ? "Sim" : "Não"],
    ["Taxa de transferência", form.taxable ? `${form.taxPercent}%` : "Não"],
    ["Taxa queimada", form.burnTax ? "Sim" : "Nao"],
    ["Anti-whale", Number(form.maxWalletPercent) > 0 ? `${form.maxWalletPercent}%` : "Desativado"],
    ["Liquidez inicial", form.template === "fair_launch" ? `${form.fairLaunchLiquidityEth || "0"} ETH` : "n/a"],
  ];

  return (
    <div>
      <h2 style={styles.stepTitle}>Revisão Final</h2>
      <p style={styles.stepDesc}>Verifique todos os parâmetros antes de fazer o deploy. <strong>Após confirmado, não é possível alterar.</strong></p>

      <div className="review-table">
        {rows.map(([label, value], i) => (
          <div key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>

      <TokenIntelligencePanel report={intelligence} />

      {!!feeInEth && (
        <div className="review-fee">
          <div>
            <strong>Taxa de criação</strong>
            <span>Fixada em aproximadamente US$ 5 e convertida pelo preço atual do ETH.</span>
          </div>
          <strong className="review-fee__value">
            {parseFloat(formatEther(feeInEth)).toFixed(6)} ETH
          </strong>
        </div>
      )}

      {isConfirmed && txHash && (
        <div className="factory-feedback" data-tone="success">
          <strong>Ativo criado com sucesso</strong>
          <a
            href={`${chainMeta?.explorer}/tx/${txHash}`}
            target="_blank"
            rel="noreferrer"
            style={{ color: "var(--accent-1)", fontSize: 13, wordBreak: "break-all" }}
          >
            Ver no Explorer → {txHash.slice(0, 20)}...
          </a>
        </div>
      )}

      {error && (
        <div className="factory-feedback" data-tone="error">
          {error.message?.split("\n")[0]}
        </div>
      )}

      <button
        onClick={onDeploy}
        disabled={isPending || isConfirming || isConfirmed}
        className="btn-primary factory-deploy"
      >
        {isPending ? "Aguardando carteira..." :
          isConfirming ? "Confirmando na blockchain..." :
            isConfirmed ? "Ativo lançado" :
              "Publicar ativo"}
      </button>
      <div style={{ marginTop: 16, paddingTop: 18, borderTop: "1px solid var(--border)" }}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>Pagar em reais ou com cartão</div>
        <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6, marginBottom: 12 }}>
          Escolha cartão ou PIX para solicitar a publicação assistida. Após a confirmação do pagamento, você poderá acompanhar o pedido no seu painel.
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
          <button
            className="btn-outline"
            onClick={() => onFiatCheckout("stripe", form.template === "fair_launch" ? "token_fair_launch_assisted" : "token_deploy_premium")}
            disabled={fiatCheckoutStatus === "loading"}
          >
            Pagar com cartão
          </button>
          <button
            className="btn-outline"
            onClick={() => onFiatCheckout("pagarme", form.template === "fair_launch" ? "token_fair_launch_assisted" : "token_deploy_premium")}
            disabled={fiatCheckoutStatus === "loading"}
          >
            Pagar com cartão ou PIX
          </button>
        </div>
        {fiatCheckoutStatus === "error" && (
          <div style={{ color: "var(--red)", fontSize: 12, marginTop: 10 }}>
            Nao foi possivel abrir o checkout agora.
          </div>
        )}
        {fiatCheckoutStatus === "auth_required" && (
          <div style={{ color: "var(--accent-1)", fontSize: 12, marginTop: 10 }}>
            Entre com sua wallet para assinar a sessao antes de abrir o checkout.
          </div>
        )}
        {fiatCheckoutStatus === "kyc_required" && (
          <div style={{ color: "var(--accent-1)", fontSize: 12, marginTop: 10 }}>
            Verificacao KYC necessaria. Abrimos a sessao segura da Didit para concluir antes do pagamento.
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Componentes Auxiliares ───────────────────────────────────────────────────
function TokenIntelligencePanel({ report }: { report: ReturnType<typeof analyzeTokenConfig> }) {
  const color = tokenRiskColor(report.riskLevel);
  return (
    <section className="token-review" style={{ borderColor: color }}>
      <div className="token-review__header">
        <div>
          <div className="token-review__eyebrow">
            Revisão dos parâmetros
          </div>
          <h3>
            {report.templateLabel}
          </h3>
          <p>{report.docs.oneLiner}</p>
        </div>
        <div className="token-review__score">
          <span style={{ borderColor: color, color }}>
            risco {report.riskLevel}
          </span>
          <strong style={{ color }}>
            {report.snapshot.trustScore}/100
          </strong>
          <small>índice de confiança</small>
        </div>
      </div>

      <div className="token-review__metrics">
        <Metric label="Supply inicial" value={`${report.snapshot.initialSupplyShare.toFixed(1)}%`} />
        <Metric label="Reserva/cap" value={formatNumber(String(report.snapshot.reserveSupply))} />
        <Metric label="Taxa" value={`${(report.snapshot.transferTaxBps / 100).toFixed(2)}%`} />
        <Metric label="Admin power" value={`${report.snapshot.adminPowerScore}/100`} />
      </div>

      {report.findings.length > 0 ? (
        <div className="token-review__findings">
          {report.findings.map((finding) => {
            const findingColor = tokenRiskColor(finding.level);
            return (
              <div key={`${finding.title}:${finding.level}`} style={{ borderColor: findingColor }}>
                <strong style={{ color: findingColor }}>{finding.title}</strong>
                <p>{finding.detail}</p>
                <p>{finding.mitigation}</p>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="token-review__clear">Nenhum alerta crítico detectado nesta revisão inicial.</div>
      )}

      <div className="token-review__lists">
        <div>
          <strong>Checklist antes de assinar</strong>
          <ul>
            {report.checklist.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </div>
        <div>
          <strong>Resumo publico sugerido</strong>
          <ul>
            {report.docs.parameterSummary.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </div>
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="token-review__metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function tokenRiskColor(level: TokenRiskLevel) {
  if (level === "critical") return "var(--red)";
  if (level === "high") return "#f59e0b";
  if (level === "medium") return "var(--accent-1)";
  return "var(--green)";
}

function FieldGroup({ label, hint, children }: { label: string; hint: string; children: React.ReactNode }) {
  return (
    <div className="factory-field">
      <label>{label}</label>
      <div>{hint}</div>
      {children}
    </div>
  );
}

function CharCount({ current, max }: { current: number; max: number }) {
  const pct = current / max;
  const color = pct > 0.9 ? "var(--red)" : pct > 0.7 ? "#f59e0b" : "var(--text-muted)";
  return <div className="char-count" style={{ color }}>{current}/{max}</div>;
}

function InfoBox({ children, color }: { children: React.ReactNode; color: "blue" | "purple" | "red" }) {
  return (
    <div className="factory-info" data-tone={color}>
      {children}
    </div>
  );
}

function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r}, ${g}, ${b}`;
}

function formatNumber(val: string) {
  const n = parseFloat(val);
  if (isNaN(n)) return "0";
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(2)}K`;
  return n.toLocaleString();
}

function toWholeTokenUnits(value: string) {
  const normalized = value.replace(/[,_\s]/g, "");
  if (!/^\d+$/.test(normalized)) {
    throw new Error("O contrato atual aceita supply apenas em unidades inteiras.");
  }
  return BigInt(normalized);
}

function taxPercentToBps(value: string) {
  const percent = Number(value);
  if (!Number.isFinite(percent) || percent < 0) return 0n;
  return BigInt(Math.round(percent * 100));
}

function percentToBps(value: string) {
  const percent = Number(value);
  if (!Number.isFinite(percent) || percent <= 0) return 0n;
  return BigInt(Math.round(percent * 100));
}

function collectPagarmeCustomer() {
  const name = window.prompt("Nome completo ou razao social para o checkout Pagar.me")?.trim();
  if (!name) return null;
  const email = window.prompt("E-mail do pagador")?.trim();
  if (!email) return null;
  const document = window.prompt("CPF ou CNPJ do pagador, somente numeros")?.replace(/\D/g, "");
  if (!document) return null;
  const phoneAreaCode = window.prompt("DDD do telefone, somente numeros")?.replace(/\D/g, "");
  if (!phoneAreaCode) return null;
  const phoneNumber = window.prompt("Telefone, somente numeros")?.replace(/\D/g, "");
  if (!phoneNumber) return null;
  const line1 = window.prompt("Endereco de cobranca: rua, numero e complemento")?.trim();
  if (!line1) return null;
  const city = window.prompt("Cidade")?.trim();
  if (!city) return null;
  const state = window.prompt("UF, exemplo SP")?.trim().toUpperCase();
  if (!state) return null;
  const postalCode = window.prompt("CEP, somente numeros")?.replace(/\D/g, "");
  if (!postalCode) return null;

  return {
    email,
    customer: {
      name,
      document,
      documentType: document.length === 14 ? "CNPJ" : "CPF",
      phoneCountryCode: "55",
      phoneAreaCode,
      phoneNumber,
      billingAddress: {
        line1,
        city,
        state,
        postalCode,
        country: "BR",
      },
    },
  };
}

const styles = {
  stepTitle: { fontFamily: "'Space Grotesk', sans-serif", fontSize: 26, fontWeight: 700, marginBottom: 8 } as React.CSSProperties,
  stepDesc: { fontSize: 15, color: "var(--text-muted)", lineHeight: 1.65, marginBottom: 8 } as React.CSSProperties,
};

// ─── Página Principal ─────────────────────────────────────────────────────────
export default function FactoryPage() {
  const searchParams = useSearchParams();
  const { isConnected, address } = useAccount();
  const chainId = useChainId();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<TokenForm>({ ...INITIAL_FORM, chainId: chainId || 8453 });
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [fiatCheckoutStatus, setFiatCheckoutStatus] = useState<"idle" | "loading" | "auth_required" | "kyc_required" | "error">("idle");
  const [telegramIntentId, setTelegramIntentId] = useState<string | null>(null);

  const factoryAddress = CHAIN_META[form.chainId]?.factoryAddress as `0x${string}` | null | undefined;

  const { data: feeInEth } = useReadContract({
    address: factoryAddress ?? undefined,
    abi: TOKEN_FACTORY_ABI,
    functionName: "getCreationFeeInEth",
    query: { enabled: Boolean(factoryAddress) },
  });

  const { writeContractAsync, data: txHash, isPending, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash: txHash });
  const publicClient = usePublicClient();

  // Sincroniza chainId da carteira com o form
  useEffect(() => {
    if (chainId && CHAIN_META[chainId]) setForm((f) => ({ ...f, chainId }));
  }, [chainId]);

  useEffect(() => {
    const intent = searchParams.get('intent');
    const source = searchParams.get('source');

    if (intent && source === 'telegram') {
      (async () => {
        const { data } = await supabase
          .from('telegram_bot_intents')
          .select('*')
          .eq('id', intent)
          .eq('status', 'draft')
          .single();

        if (data && data.payload) {
          const payload = data.payload;
          setForm((f) => ({
            ...f,
            name: payload.name || f.name,
            symbol: payload.symbol ? String(payload.symbol).toUpperCase() : f.symbol,
            initialSupply: String(payload.initialSupply || '1000000'),
            maxSupply: String(payload.maxSupply || payload.initialSupply || '10000000'),
            mintable: Boolean(payload.mintable),
          }));
          setTelegramIntentId(intent);
        }
      })();
    }
  }, [searchParams]);

  // Trigger onboarding on confirmation
  useEffect(() => {
    if (isConfirmed) {
      setShowOnboarding(true);
    }
  }, [isConfirmed]);

  function canProceed(): boolean {
    if (step === 1) return true;
    if (step === 2) return form.name.length >= 2 && form.symbol.length >= 2;
    if (step === 3) {
      const ini = parseFloat(form.initialSupply);
      const max = parseFloat(form.maxSupply);
      const liquidityOk = form.template !== "fair_launch" || Number(form.fairLaunchLiquidityEth) > 0;
      return ini > 0 && max >= ini && liquidityOk;
    }
    return true;
  }

  async function handleDeploy() {
    if (!address || !feeInEth || !factoryAddress) return;
    const feeWithSlippage = (feeInEth * 105n) / 100n;
    try {
      const initialSupply = toWholeTokenUnits(form.initialSupply);
      const maxSupply = toWholeTokenUnits(form.maxSupply);
      const taxBPS = form.taxable ? taxPercentToBps(form.taxPercent) : 0n;
      const maxWalletBPS = percentToBps(form.maxWalletPercent);
      const fairLaunchLiquidity = form.template === "fair_launch" ? parseEther(form.fairLaunchLiquidityEth || "0") : 0n;
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 1800);
      const isFairLaunch = form.template === "fair_launch";

      const hash = await writeContractAsync({
        address: factoryAddress,
        abi: TOKEN_FACTORY_ABI,
        functionName: isFairLaunch ? "createFairLaunchTokenETH" : "createTokenAdvanced",
        args: isFairLaunch
          ? [
              form.name,
              form.symbol,
              initialSupply,
              initialSupply,
              fairLaunchLiquidity,
              address,
              deadline,
            ]
          : [
              form.name,
              form.symbol,
              initialSupply,
              maxSupply,
              form.mintable,
              form.taxable,
              taxBPS,
              form.hasBlacklist,
              form.burnTax,
              maxWalletBPS,
            ],
        value: isFairLaunch ? feeWithSlippage + fairLaunchLiquidity : feeWithSlippage,
      });

      let tokenAddress: string | null = null;
      try {
        const { Interface } = await import("ethers");
        const iface = new Interface(TOKEN_FACTORY_ABI as any);
        const receipt = publicClient ? await publicClient.waitForTransactionReceipt({ hash }) : null;
        for (const log of receipt?.logs ?? []) {
          try {
            const parsed = iface.parseLog(log as any);
            if (parsed?.name === "TokenCreated" || parsed?.name === "FairLaunchCreated") {
              tokenAddress = String(parsed.args.tokenAddress);
              break;
            }
          } catch {
            // Ignore unrelated logs from the same transaction.
          }
        }
      } catch (eventError) {
        console.error("Erro ao extrair endereço do token:", eventError);
      }

      if (!tokenAddress) throw new Error("TokenCreated event not found; token address was not persisted");

      // Salva metadados no Supabase
      await insertGeneratedToken({
        token_address: tokenAddress,
        creator_wallet: address,
        name: form.name,
        symbol: form.symbol,
        initial_supply: Number(initialSupply),
        max_supply: Number(maxSupply),
        mintable: form.mintable,
        token_template: form.template,
        launch_mode: form.template === "fair_launch" ? "fair_launch" : form.template === "superchain" ? "superchain" : "standard",
        taxable: form.taxable,
        tax_bps: Number(taxBPS),
        burn_tax: form.burnTax,
        max_wallet_bps: Number(maxWalletBPS),
        liquidity_eth: form.template === "fair_launch" ? form.fairLaunchLiquidityEth : null,
        lp_recipient: form.template === "fair_launch" ? address : null,
        tx_hash: hash,
        chain_id: form.chainId,
      });

      if (telegramIntentId && address) {
        await supabase
          .from('telegram_bot_intents')
          .update({ status: 'confirmed', wallet_address: address.toLowerCase() })
          .eq('id', telegramIntentId)
          .eq('status', 'draft');
      }

      // Registra Auditoria
      const operationId = `${address.toLowerCase()}:CREATE_TOKEN:${hash.toLowerCase()}`;
      await insertAudit({
        user_wallet: address,
        action: "CREATE_TOKEN",
        operation_id: operationId,
        tx_hash: hash,
        chain_id: form.chainId,
        status: "confirmed",
        metadata: {
          name: form.name,
          symbol: form.symbol,
          tx_hash: hash,
          chain_id: form.chainId,
          token_address: tokenAddress,
          token_template: form.template,
          taxable: form.taxable,
          tax_bps: Number(taxBPS),
          burn_tax: form.burnTax,
          max_wallet_bps: Number(maxWalletBPS),
          liquidity_eth: form.template === "fair_launch" ? form.fairLaunchLiquidityEth : null,
          lp_recipient: form.template === "fair_launch" ? address : null,
        }
      });

      await enqueueReconciliation({
        operation_id: operationId,
        user_wallet: address,
        vertical: "token_factory",
        action: "CREATE_TOKEN",
        tx_hash: hash,
        chain_id: form.chainId,
        expected_state: {
          token_address: tokenAddress,
          token_template: form.template,
          name: form.name,
          symbol: form.symbol,
          initial_supply: initialSupply.toString(),
          max_supply: maxSupply.toString(),
          mintable: form.mintable,
          taxable: form.taxable,
          tax_bps: taxBPS.toString(),
          burn_tax: form.burnTax,
          max_wallet_bps: maxWalletBPS.toString(),
          liquidity_eth: form.template === "fair_launch" ? form.fairLaunchLiquidityEth : null,
          lp_recipient: form.template === "fair_launch" ? address : null,
        },
      });
    } catch (e) {
      // Erro exposto via writeError
    }
  }

  async function handleFiatCheckout(provider: "stripe" | "pagarme", productCode: string) {
    if (!address) return;
    const pagarmeCustomer = provider === "pagarme" ? collectPagarmeCustomer() : null;
    if (provider === "pagarme" && !pagarmeCustomer) return;
    setFiatCheckoutStatus("loading");
    try {
      const response = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          vertical: "token_factory",
          productCode,
          walletAddress: address,
          email: pagarmeCustomer?.email,
          customer: pagarmeCustomer?.customer,
          metadata: {
            token_template: form.template,
            referral_code: typeof window !== "undefined" ? localStorage.getItem("instead_referral_code") : null,
            name: form.name,
            symbol: form.symbol,
            chain_id: form.chainId,
            factory_address: factoryAddress,
            initial_supply: form.initialSupply.replace(/[,_\s]/g, ""),
            max_supply: form.maxSupply.replace(/[,_\s]/g, ""),
            mintable: form.mintable,
            taxable: form.taxable,
            tax_bps: form.taxable ? Number(taxPercentToBps(form.taxPercent)) : 0,
            has_blacklist: form.hasBlacklist,
            burn_tax: form.burnTax,
            max_wallet_bps: Number(percentToBps(form.maxWalletPercent)),
            liquidity_eth: form.template === "fair_launch" ? form.fairLaunchLiquidityEth : null,
          },
        }),
      });
      const body = await response.json();
      if (response.status === 401) {
        setFiatCheckoutStatus("auth_required");
        return;
      }
      if (response.status === 403 && body.code === "kyc_required") {
        const kycResponse = await fetch("/api/compliance/verification/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            walletAddress: address,
            email: pagarmeCustomer?.email,
            kind: "kyc",
            consent: true,
            metadata: { trigger: "token_factory_checkout", product_code: productCode },
          }),
        });
        const kycBody = await kycResponse.json();
        if (kycResponse.ok && kycBody.verification?.url) {
          setFiatCheckoutStatus("kyc_required");
          window.location.href = kycBody.verification.url;
          return;
        }
      }
      if (!response.ok || !body.url) throw new Error(body.error || "Checkout unavailable");
      window.location.href = body.url;
    } catch (checkoutError) {
      console.error("Erro ao criar checkout fiat:", checkoutError);
      setFiatCheckoutStatus("error");
    }
  }

  return (
    <main className="product-page factory-page">
      <div className="product-page__container">
        {/* Top bar */}
        <PageHeader eyebrow="Infraestrutura de emissão" title="Emissão de ativos" description="Configure rede, oferta e permissões. Revise todos os parâmetros antes de publicar o contrato." backHref="/" action={<WalletConnectButton />} />
        <div className="product-guidance product-guidance--compact">
        <SimpleModeNotice title="Crie com uma revisão clara">
          Este assistente guarda o modo avançado, mas explica cada decisão em linguagem simples. O token só é publicado depois da etapa de revisão final.
        </SimpleModeNotice>
        <SafetyChecklist
          items={[
            "Nada é publicado enquanto você não chegar na revisão final.",
            "Nome, símbolo e regras ficam permanentes depois da publicação.",
            "Se preferir, pague com cartão ou PIX e solicite a publicação assistida.",
          ]}
        />
        </div>

        {/* Progress Steps */}
        <div className="product-steps">
          {STEPS.map((s, i) => {
            const done = step > s.id;
            const active = step === s.id;
            return (
              <div key={s.id} className="product-step" data-last={i === STEPS.length - 1}>
                <button
                  onClick={() => done && setStep(s.id)}
                  className="product-step__button"
                  data-state={active ? "active" : done ? "done" : "pending"}
                >
                  <div className="product-step__index">
                    {done ? "✓" : s.icon}
                  </div>
                  <span>
                    {s.label}
                  </span>
                </button>
                {i < STEPS.length - 1 && (
                  <div className="product-step__line" data-done={done} />
                )}
              </div>
            );
          })}
        </div>

        {/* Step Content */}
        <div className="card product-workspace">
          {step === 1 && <StepNetwork form={form} setForm={setForm} />}
          {step === 2 && <StepIdentity form={form} setForm={setForm} />}
          {step === 3 && <StepSupply form={form} setForm={setForm} />}
          {step === 4 && <StepFeatures form={form} setForm={setForm} />}
          {step === 5 && (
            <StepReview
              form={form}
              feeInEth={feeInEth}
              onDeploy={handleDeploy}
              isPending={isPending}
              isConfirming={isConfirming}
              isConfirmed={isConfirmed}
              txHash={txHash}
              error={writeError as Error | null}
              onFiatCheckout={handleFiatCheckout}
              fiatCheckoutStatus={fiatCheckoutStatus}
            />
          )}

          {/* Navigation Buttons */}
          {step < 5 && (
            <div className="product-workspace__nav" data-has-back={step > 1}>
              {step > 1 && (
                <button className="btn-outline" onClick={() => setStep(step - 1)}>
                  ← Voltar
                </button>
              )}
              {!isConnected ? (
                <WalletHelpCard compact />
              ) : (
                <button
                  className="btn-primary"
                  onClick={() => setStep(step + 1)}
                  disabled={!canProceed()}
                >
                  {step === 4 ? "Revisar →" : "Próximo →"}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Onboarding Wizard */}
        <OnboardingWizard
          isOpen={showOnboarding}
          onClose={() => setShowOnboarding(false)}
          tokenName={form.name}
          tokenSymbol={form.symbol}
        />

        {/* Fee banner */}
        {feeInEth && step < 5 && (
          <div className="factory-fee-note">
            Taxa de deploy na {CHAIN_META[form.chainId]?.name}:{" "}
            <strong>
              {parseFloat(formatEther(feeInEth)).toFixed(6)} ETH
            </strong>{" "}
            (~$5.00 USD)
          </div>
        )}
      </div>

      <AIAssistant
        type="token"
        contextData={{
          name: form.name,
          symbol: form.symbol,
          description: form.description,
          step: step
        }}
      />
    </main>
  );
}
