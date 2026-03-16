"use client";

import { useState, useEffect } from "react";
import { useAccount, useSwitchChain, useChainId, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { formatEther, parseUnits } from "viem";
import Link from "next/link";
import { CHAIN_META, TOKEN_FACTORY_ABI, SUPPORTED_CHAINS } from "@/lib/wagmi";
import { 
  insertGeneratedToken, 
  insertAudit,
  type GeneratedToken 
} from "@/lib/supabase";
import { OnboardingWizard } from "@/components/OnboardingWizard";

// ─── Tipos ────────────────────────────────────────────────────────────────────
type TokenForm = {
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
  // Passo 5 – Review
};

const STEPS = [
  { id: 1, label: "Rede",         icon: "🌐" },
  { id: 2, label: "Identidade",   icon: "🏷️" },
  { id: 3, label: "Supply",       icon: "💰" },
  { id: 4, label: "Funções",      icon: "⚙️" },
  { id: 5, label: "Revisão",      icon: "✅" },
];

const INITIAL_FORM: TokenForm = {
  chainId: 42161,
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
};

// ─── Componentes de cada passo ────────────────────────────────────────────────

function StepNetwork({ form, setForm }: { form: TokenForm; setForm: (f: TokenForm) => void }) {
  const { switchChain } = useSwitchChain();
  return (
    <div>
      <h2 style={styles.stepTitle}>Escolha a Rede Blockchain</h2>
      <p style={styles.stepDesc}>
        Selecione a rede onde o seu token será lançado. Cada rede tem características distintas de custo e ecossistema.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16, marginTop: 24 }}>
        {Object.entries(CHAIN_META).map(([id, meta]) => {
          const chainId = parseInt(id);
          const active = form.chainId === chainId;
          return (
            <button
              key={id}
              onClick={() => { setForm({ ...form, chainId }); switchChain?.({ chainId }); }}
              style={{
                background: active ? `rgba(${hexToRgb(meta.color)},0.12)` : "var(--bg-card)",
                border: `2px solid ${active ? meta.color : "var(--border)"}`,
                borderRadius: 14, padding: "20px 16px", cursor: "pointer", textAlign: "left",
                transition: "all 0.2s",
              }}
            >
              <div style={{ fontSize: 28, marginBottom: 8 }}>{meta.icon}</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>{meta.name}</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{meta.gasLabel}</div>
              {active && <div style={{ marginTop: 10, fontSize: 11, color: meta.color, fontWeight: 600 }}>✓ Selecionada</div>}
            </button>
          );
        })}
      </div>
      <InfoBox color="blue">
        💡 <strong>Recomendação:</strong> Para maior liquidez e ecossistema DeFi ativo, o <strong>Arbitrum</strong> ou <strong>Base</strong> são as melhores escolhas com taxas ultrabaixas.
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
          style={{ textTransform: "uppercase" }}
        />
        {form.symbol && (
          <div style={{ marginTop: 8, fontSize: 12, color: "var(--text-muted)" }}>
            Aparecerá como: <span style={{ color: "var(--accent-1)", fontWeight: 700 }}>${symbolPreview}</span>
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
          style={{
            width: "100%", background: "var(--bg-surface)", border: "1px solid var(--border)",
            borderRadius: 10, color: "var(--text-primary)", fontSize: 15, padding: "12px 16px",
            outline: "none", fontFamily: "Inter, sans-serif", resize: "vertical",
          }}
        />
        <CharCount current={form.description.length} max={200} />
      </FieldGroup>

      <InfoBox color="purple">
        ⚠️ <strong>Importante:</strong> O nome e símbolo ficam <strong>gravados permanentemente</strong> na blockchain e <strong>não podem ser alterados</strong> após o deploy.
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
        <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6 }}>
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
          <div style={{ color: "var(--red)", fontSize: 12, marginTop: 6 }}>
            ❌ O supply máximo não pode ser menor que o initial.
          </div>
        )}
      </FieldGroup>

      {/* Barra visual de distribuição */}
      <div style={{ margin: "24px 0", background: "var(--bg-surface)", borderRadius: 12, padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, fontSize: 13 }}>
          <span style={{ color: "var(--text-muted)" }}>Supply Inicial</span>
          <span style={{ fontWeight: 600, color: "var(--accent-1)" }}>{pct.toFixed(1)}% do máximo</span>
        </div>
        <div style={{ height: 8, borderRadius: 999, background: "var(--border)", overflow: "hidden" }}>
          <div style={{ width: `${pct}%`, height: "100%", background: "var(--accent-grad)", borderRadius: 999, transition: "width 0.3s" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 11, color: "var(--text-muted)" }}>
          <span>0</span><span>{formatNumber(form.maxSupply)}</span>
        </div>
      </div>

      <FieldGroup label="Casas Decimais" hint="18 é o padrão ERC-20 (igual ao ETH). Use 6 para tokens estáveis como USDC.">
        <div style={{ display: "flex", gap: 10 }}>
          {[6, 8, 18].map((d) => (
            <button
              key={d}
              onClick={() => setForm({ ...form, decimals: d })}
              style={{
                padding: "10px 24px", borderRadius: 10, cursor: "pointer", fontWeight: 600, fontSize: 14,
                background: form.decimals === d ? "var(--accent-grad)" : "var(--bg-surface)",
                color: form.decimals === d ? "white" : "var(--text-muted)",
                border: `1px solid ${form.decimals === d ? "transparent" : "var(--border)"}`,
                transition: "all 0.15s",
              }}
            >
              {d}
            </button>
          ))}
          <input
            type="number"
            value={form.decimals}
            onChange={(e) => setForm({ ...form, decimals: parseInt(e.target.value) || 18 })}
            min={0} max={18}
            style={{ width: 80 }}
            placeholder="18"
          />
        </div>
        <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 8 }}>
          Com {form.decimals} decimais: 1 token = 10<sup>{form.decimals}</sup> unidades mínimas.
        </div>
      </FieldGroup>
    </div>
  );
}

function StepFeatures({ form, setForm }: { form: TokenForm; setForm: (f: TokenForm) => void }) {
  const features = [
    {
      key: "mintable" as const,
      icon: "🪙",
      title: "Mintável (Mintable)",
      desc: "O proprietário pode criar mais tokens após o deploy, respeitando o supply máximo definido.",
      risk: "Médio",
      riskColor: "#f59e0b",
    },
    {
      key: "burnable" as const,
      icon: "🔥",
      title: "Queimável (Burnable)",
      desc: "Qualquer holder pode destruir (queimar) seus próprios tokens, reduzindo o supply circulante permanentemente.",
      risk: "Baixo",
      riskColor: "#10b981",
    },
    {
      key: "taxable" as const,
      icon: "💸",
      title: "Taxa por Transferência",
      desc: "Cobra uma porcentagem automática a cada transferência, enviando para a treasury do protocolo.",
      risk: "Alto",
      riskColor: "#ef4444",
    },
  ];

  return (
    <div>
      <h2 style={styles.stepTitle}>Funcionalidades do Token</h2>
      <p style={styles.stepDesc}>Ative as funcionalidades avançadas do seu token. Cada uma afeta o comportamento econômico e a percepção de confiança.</p>

      <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 24 }}>
        {features.map((f) => (
          <div
            key={f.key}
            onClick={() => setForm({ ...form, [f.key]: !form[f.key] })}
            style={{
              display: "flex", alignItems: "flex-start", gap: 16, padding: "20px",
              background: form[f.key] ? "rgba(124,58,237,0.08)" : "var(--bg-card)",
              border: `2px solid ${form[f.key] ? "rgba(124,58,237,0.4)" : "var(--border)"}`,
              borderRadius: 14, cursor: "pointer", transition: "all 0.15s",
            }}
          >
            <div style={{ fontSize: 30, flexShrink: 0 }}>{f.icon}</div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                <span style={{ fontWeight: 700, fontSize: 16 }}>{f.title}</span>
                <span style={{
                  fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 999,
                  background: `${f.riskColor}20`, color: f.riskColor,
                }}>
                  Risco {f.risk}
                </span>
              </div>
              <p style={{ fontSize: 14, color: "var(--text-muted)", lineHeight: 1.6 }}>{f.desc}</p>

              {f.key === "taxable" && form.taxable && (
                <div style={{ marginTop: 14 }} onClick={(e) => e.stopPropagation()}>
                  <label style={{ fontSize: 13, color: "var(--text-muted)", display: "block", marginBottom: 8 }}>
                    Porcentagem da Taxa (%)
                  </label>
                  <input
                    type="number"
                    value={form.taxPercent}
                    onChange={(e) => setForm({ ...form, taxPercent: e.target.value })}
                    min={0.1} max={25} step={0.1}
                    style={{ width: 120 }}
                    placeholder="2"
                  />
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6 }}>
                    A cada transferência de 1.000 tokens, {parseFloat(form.taxPercent || "0") * 10} tokens vão para a treasury.
                  </div>
                </div>
              )}
            </div>
            <div style={{
              width: 24, height: 24, borderRadius: 6, border: `2px solid ${form[f.key] ? "var(--accent-1)" : "var(--border)"}`,
              background: form[f.key] ? "var(--accent-1)" : "transparent",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0, fontSize: 14, color: "white", transition: "all 0.15s",
            }}>
              {form[f.key] ? "✓" : ""}
            </div>
          </div>
        ))}
      </div>

      <InfoBox color="red">
        ⚠️ Tokens com taxa por transação (taxable) são frequentemente sinalizados como <strong>suspeitos</strong> em scanners como Token Sniffer. Certifique-se de que a utilidade é legítima.
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
}: {
  form: TokenForm;
  feeInEth?: bigint;
  onDeploy: () => void;
  isPending: boolean;
  isConfirming: boolean;
  isConfirmed: boolean;
  txHash?: string;
  error: Error | null;
}) {
  const chainMeta = CHAIN_META[form.chainId];
  const rows = [
    ["Rede",             `${chainMeta?.icon} ${chainMeta?.name}`],
    ["Nome",             form.name || "—"],
    ["Símbolo",         `$${form.symbol || "—"}`],
    ["Descrição",        form.description || "(nenhuma)"],
    ["Supply Inicial",   formatNumber(form.initialSupply)],
    ["Supply Máximo",    formatNumber(form.maxSupply)],
    ["Decimais",         `${form.decimals}`],
    ["Mintável",         form.mintable ? "✅ Sim" : "❌ Não"],
    ["Queimável",        form.burnable ? "✅ Sim" : "❌ Não"],
    ["Taxa Transferência", form.taxable ? `✅ ${form.taxPercent}%` : "❌ Não"],
  ];

  return (
    <div>
      <h2 style={styles.stepTitle}>Revisão Final</h2>
      <p style={styles.stepDesc}>Verifique todos os parâmetros antes de fazer o deploy. <strong>Após confirmado, não é possível alterar.</strong></p>

      <div style={{ background: "var(--bg-surface)", borderRadius: 14, overflow: "hidden", border: "1px solid var(--border)", marginTop: 24 }}>
        {rows.map(([label, value], i) => (
          <div key={label} style={{
            display: "flex", justifyContent: "space-between", padding: "14px 20px",
            borderBottom: i < rows.length - 1 ? "1px solid var(--border)" : "none",
            background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.015)",
          }}>
            <span style={{ fontSize: 14, color: "var(--text-muted)" }}>{label}</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", textAlign: "right", maxWidth: 260, wordBreak: "break-word" }}>{value}</span>
          </div>
        ))}
      </div>

      {!!feeInEth && (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "18px 20px", background: "rgba(124,58,237,0.08)",
          border: "1px solid rgba(124,58,237,0.2)", borderRadius: 14, marginTop: 20,
        }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>Taxa de Criação</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>Fixada em ~$5.00 USD — convertida ao preço atual do ETH via Chainlink</div>
          </div>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 22, fontWeight: 700, color: "var(--accent-1)" }}>
            {parseFloat(formatEther(feeInEth)).toFixed(6)} ETH
          </div>
        </div>
      )}

      {isConfirmed && txHash && (
        <div style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.25)", borderRadius: 12, padding: 16, marginTop: 20 }}>
          <div style={{ color: "var(--green)", fontWeight: 700, marginBottom: 6 }}>🎉 Token criado com sucesso!</div>
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
        <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 12, padding: 16, marginTop: 20, color: "var(--red)", fontSize: 13 }}>
          ❌ {error.message?.split("\n")[0]}
        </div>
      )}

      <button
        className="btn-primary"
        onClick={onDeploy}
        disabled={isPending || isConfirming || isConfirmed}
        style={{ width: "100%", marginTop: 24, fontSize: 17, padding: "16px 0" }}
      >
        {isPending   ? "⏳ Aguardando carteira..." :
         isConfirming ? "⛓️ Confirmando na blockchain..." :
         isConfirmed  ? "✅ Token Lançado!" :
         "🚀 Fazer Deploy do Token"}
      </button>
    </div>
  );
}

// ─── Componentes Auxiliares ───────────────────────────────────────────────────
function FieldGroup({ label, hint, children }: { label: string; hint: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <label style={{ display: "block", fontWeight: 600, fontSize: 15, marginBottom: 6 }}>{label}</label>
      <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 10 }}>{hint}</div>
      {children}
    </div>
  );
}

function CharCount({ current, max }: { current: number; max: number }) {
  const pct = current / max;
  const color = pct > 0.9 ? "var(--red)" : pct > 0.7 ? "#f59e0b" : "var(--text-muted)";
  return <div style={{ textAlign: "right", fontSize: 11, color, marginTop: 4 }}>{current}/{max}</div>;
}

function InfoBox({ children, color }: { children: React.ReactNode; color: "blue" | "purple" | "red" }) {
  const colors = { blue: "37, 99, 235", purple: "124, 58, 237", red: "239, 68, 68" };
  const rgb = colors[color];
  return (
    <div style={{
      background: `rgba(${rgb},0.07)`, border: `1px solid rgba(${rgb},0.2)`,
      borderRadius: 12, padding: 16, marginTop: 24, fontSize: 13, color: "var(--text-muted)", lineHeight: 1.7,
    }}>
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

const styles = {
  stepTitle: { fontFamily: "'Space Grotesk', sans-serif", fontSize: 26, fontWeight: 700, marginBottom: 8 } as React.CSSProperties,
  stepDesc:  { fontSize: 15, color: "var(--text-muted)", lineHeight: 1.65, marginBottom: 8 } as React.CSSProperties,
};

// ─── Página Principal ─────────────────────────────────────────────────────────
export default function FactoryPage() {
  const { isConnected, address } = useAccount();
  const chainId = useChainId();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<TokenForm>({ ...INITIAL_FORM, chainId: chainId || 42161 });
  const [showOnboarding, setShowOnboarding] = useState(false);

  const factoryAddress = (CHAIN_META[form.chainId]?.factoryAddress || "0x0") as `0x${string}`;

  const { data: feeInEth } = useReadContract({
    address: factoryAddress,
    abi: TOKEN_FACTORY_ABI,
    functionName: "getCreationFeeInEth",
    query: { enabled: factoryAddress !== "0x0" },
  });

  const { writeContractAsync, data: txHash, isPending, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash: txHash });

  // Sincroniza chainId da carteira com o form
  useEffect(() => {
    if (chainId && CHAIN_META[chainId]) setForm((f) => ({ ...f, chainId }));
  }, [chainId]);

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
      return ini > 0 && max >= ini;
    }
    return true;
  }

  async function handleDeploy() {
    if (!address || !feeInEth) return;
    const feeWithSlippage = (feeInEth * 105n) / 100n;
    try {
      const hash = await writeContractAsync({
        address: factoryAddress,
        abi: TOKEN_FACTORY_ABI,
        functionName: "createToken",
        args: [
          form.name,
          form.symbol,
          parseUnits(form.initialSupply, form.decimals),
          parseUnits(form.maxSupply, form.decimals),
          form.mintable,
        ],
        value: feeWithSlippage,
      });

      // Salva metadados no Supabase
      await insertGeneratedToken({
        token_address: "pending",
        creator_wallet: address,
        name: form.name,
        symbol: form.symbol,
        initial_supply: parseFloat(form.initialSupply),
        max_supply: parseFloat(form.maxSupply),
        mintable: form.mintable,
        tx_hash: hash,
        chain_id: form.chainId,
      });

      // Registra Auditoria
      await insertAudit({
        user_wallet: address,
        action: "CREATE_TOKEN",
        metadata: {
          name: form.name,
          symbol: form.symbol,
          tx_hash: hash,
          chain_id: form.chainId
        }
      });
    } catch (e) {
      // Erro exposto via writeError
    }
  }

  return (
    <main style={{ minHeight: "100vh", padding: "32px 24px" }}>
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        {/* Top bar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 36 }}>
          <div>
            <Link href="/" style={{ color: "var(--text-muted)", fontSize: 13, textDecoration: "none" }}>← Voltar</Link>
            <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 30, fontWeight: 700, marginTop: 8 }}>
              🏭 <span className="gradient-text">Token Factory</span>
            </h1>
          </div>
          <ConnectButton />
        </div>

        {/* Progress Steps */}
        <div style={{ display: "flex", alignItems: "center", marginBottom: 40, gap: 0 }}>
          {STEPS.map((s, i) => {
            const done = step > s.id;
            const active = step === s.id;
            return (
              <div key={s.id} style={{ display: "flex", alignItems: "center", flex: i < STEPS.length - 1 ? 1 : "none" }}>
                <button
                  onClick={() => done && setStep(s.id)}
                  style={{
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                    background: "none", border: "none", cursor: done ? "pointer" : "default",
                  }}
                >
                  <div style={{
                    width: 44, height: 44, borderRadius: "50%", display: "flex", alignItems: "center",
                    justifyContent: "center", fontSize: done ? 16 : 18,
                    background: active ? "var(--accent-grad)" : done ? "rgba(16,185,129,0.2)" : "var(--bg-card)",
                    border: `2px solid ${active ? "transparent" : done ? "#10b981" : "var(--border)"}`,
                    transition: "all 0.2s",
                  }}>
                    {done ? "✓" : s.icon}
                  </div>
                  <span style={{ fontSize: 11, fontWeight: active ? 700 : 400, color: active ? "var(--text-primary)" : "var(--text-muted)", whiteSpace: "nowrap" }}>
                    {s.label}
                  </span>
                </button>
                {i < STEPS.length - 1 && (
                  <div style={{ flex: 1, height: 2, background: done ? "#10b981" : "var(--border)", margin: "0 8px", marginBottom: 26, transition: "background 0.3s" }} />
                )}
              </div>
            );
          })}
        </div>

        {/* Step Content */}
        <div className="card" style={{ minHeight: 400 }}>
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
            />
          )}

          {/* Navigation Buttons */}
          {step < 5 && (
            <div style={{ display: "flex", justifyContent: step > 1 ? "space-between" : "flex-end", marginTop: 32, paddingTop: 24, borderTop: "1px solid var(--border)" }}>
              {step > 1 && (
                <button className="btn-outline" onClick={() => setStep(step - 1)}>
                  ← Voltar
                </button>
              )}
              {!isConnected ? (
                <ConnectButton />
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
          <div style={{ textAlign: "center", marginTop: 16, fontSize: 13, color: "var(--text-muted)" }}>
            Taxa de deploy na {CHAIN_META[form.chainId]?.name}:{" "}
            <strong style={{ color: "var(--accent-1)" }}>
              {parseFloat(formatEther(feeInEth)).toFixed(6)} ETH
            </strong>{" "}
            (~$5.00 USD)
          </div>
        )}
      </div>
    </main>
  );
}
