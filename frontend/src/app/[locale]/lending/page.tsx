"use client";

import { WalletConnectButton } from "@/components/WalletConnectButton";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAccount } from "wagmi";
import { useInsteadLending } from "@/hooks/useInsteadLending";
import { Link } from "@/navigation";
import { enqueueReconciliation, insertAudit, upsertLendingPosition, supabase } from "@/lib/supabase";
import { useChainId } from "wagmi";
import { AIAssistant } from "@/components/shared/AIAssistant";
import { useTranslations } from "next-intl";
import { HealthGauge } from "@/components/HealthGauge";
import { CHAIN_META } from "@/lib/wagmi";
import { Shield } from "lucide-react";
import { formatRevenuePrice, LENDING_PREMIUM_PRODUCTS, liquidationRecommendation, liquidationRiskLabel } from "@/lib/lendingPremium";
import { PlainLanguageGlossary, RiskWarning, SafetyChecklist, SimpleModeNotice, WalletHelpCard } from "@/components/ElderFriendly";

const LENDING_ASSETS = {
  USDC: {
    address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as `0x${string}`,
    symbol: "USDC",
    decimals: 6,
  },
  WETH: {
    address: "0x4200000000000000000000000000000000000006" as `0x${string}`,
    symbol: "WETH",
    decimals: 18,
  },
} as const;
const USDC_ADDRESS = LENDING_ASSETS.USDC.address;
const WETH_ADDRESS = LENDING_ASSETS.WETH.address;
const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL;

type Tab = "deposit" | "borrow" | "repay";

function collectPagarmeCustomer(defaultEmail: string) {
  const name = window.prompt("Nome completo ou razao social para o checkout Pagar.me")?.trim();
  if (!name) return null;
  const email = window.prompt("E-mail do pagador", defaultEmail)?.trim();
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
      documentType: document.length === 14 ? "CNPJ" as const : "CPF" as const,
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

export default function LendingPage() {
  const t = useTranslations("Common");
  const { isConnected, address } = useAccount();
  const chainId = useChainId();
  const [tab, setTab] = useState<Tab>("deposit");
  const [amount, setAmount] = useState("");
  const [selectedAsset, setSelectedAsset] = useState(USDC_ADDRESS);
  const [colAsset, setColAsset] = useState(WETH_ADDRESS);
  const [actionError, setActionError] = useState<string | null>(null);
  const [premiumEmail, setPremiumEmail] = useState("");
  const [premiumProvider, setPremiumProvider] = useState<"stripe" | "pagarme">("stripe");
  const [premiumStatus, setPremiumStatus] = useState<string | null>(null);

  const {
    deposit, depositCollateral, approveDelegationAndBorrow, approveAndRepay,
    isPending, isConfirmed, txHash, error,
    collateralBalance, borrowBalance, borrowAllowance, variableDebtTokenAddress,
    isLendingEnabled,
  } = useInsteadLending(selectedAsset);

  const searchParams = useSearchParams();
  const [telegramIntentId, setTelegramIntentId] = useState<string | null>(null);
  const lastAuditedHash = useRef<string | null>(null);

  useEffect(() => {
    const intentId = searchParams.get("intent");
    const source = searchParams.get("source");
    if (!intentId || source !== "telegram") return;
    Promise.resolve(
      supabase
        .from("telegram_bot_intents")
        .select("*")
        .eq("id", intentId)
        .eq("status", "draft")
        .single()
    ).then(({ data }) => {
      if (!data) return;
      setTelegramIntentId(intentId);
      if (data.payload?.asset) setSelectedAsset(data.payload.asset as `0x${string}`);
      if (data.payload?.amount) setAmount(String(data.payload.amount));
      if (data.payload?.tab && ["deposit", "borrow", "repay"].includes(data.payload.tab)) {
        setTab(data.payload.tab as Tab);
      }
    }).catch(console.error);
  }, [searchParams]);

  useEffect(() => {
    if (isConfirmed && txHash && address && lastAuditedHash.current !== txHash) {
      lastAuditedHash.current = txHash;
      const operationId = `${address.toLowerCase()}:${tab.toUpperCase()}:${txHash.toLowerCase()}`;

      insertAudit({
        user_wallet: address,
        action: tab.toUpperCase(),
        operation_id: operationId,
        tx_hash: txHash,
        chain_id: chainId,
        status: "confirmed",
        metadata: { asset: selectedAsset, amount, tx_hash: txHash, chain_id: chainId },
      }).catch(console.error);

      enqueueReconciliation({
        operation_id: operationId,
        user_wallet: address,
        vertical: "lending",
        action: tab.toUpperCase(),
        tx_hash: txHash,
        chain_id: chainId,
        expected_state: {
          asset: selectedAsset,
          collateral_asset: colAsset,
          amount,
          collateral_balance: collateralBalance.toString(),
          borrow_balance: borrowBalance.toString(),
        },
      }).catch(console.error);

      if (telegramIntentId) {
        Promise.resolve(
          supabase
            .from("telegram_bot_intents")
            .update({ status: "confirmed", wallet_address: address.toLowerCase() })
            .eq("id", telegramIntentId)
            .eq("status", "draft")
        ).then(() => setTelegramIntentId(null)).catch(console.error);
      }

      upsertLendingPosition({
        wallet_address: address,
        collateral_asset: colAsset,
        borrow_asset: selectedAsset,
        collateral_amount: Number(collateralBalance) / 1e18,
        borrowed_amount: Number(borrowBalance) / 1e18,
        health_factor: Number(borrowBalance) > 0 ? (Number(collateralBalance) / Number(borrowBalance) * 0.8) : 999,
        chain_id: chainId,
        last_tx_hash: txHash,
        operation_status: "confirmed",
      }).catch(console.error);
    }
  }, [isConfirmed, txHash, address, tab, selectedAsset, amount, colAsset, chainId, collateralBalance, borrowBalance, telegramIntentId]);

  function handleAction() {
    if (!amount) return;
    setActionError(null);
    try {
      const asset = Object.values(LENDING_ASSETS).find((item) => item.address.toLowerCase() === selectedAsset.toLowerCase());
      const decimals = asset?.decimals ?? 18;
      if (tab === "deposit") deposit(selectedAsset, amount, decimals);
      else if (tab === "borrow") approveDelegationAndBorrow(selectedAsset, amount, decimals);
      else approveAndRepay(selectedAsset, amount, decimals);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Operação não concluída. Tente novamente.");
    }
  }

  const applyPreset = (percent: number) => {
    let baseBalance = 0n;
    if (tab === "deposit") {
      baseBalance = 10000000000000000000n;
    } else if (tab === "borrow") {
      baseBalance = (collateralBalance * 70n) / 100n;
    } else {
      baseBalance = borrowBalance;
    }
    const calculated = (baseBalance * BigInt(percent)) / 100n;
    setAmount((Number(calculated) / 1e18).toFixed(4));
  };

  const liveCollateral = Number(collateralBalance) / 1e18;
  const liveBorrow = Number(borrowBalance) / 1e18;
  const liveHF = liveBorrow > 0 ? (liveCollateral / liveBorrow) * 0.8 : 999;
  const riskLabel = liquidationRiskLabel(liveHF);
  const recommendation = liquidationRecommendation(liveHF);

  async function createPremiumCheckout(productCode: string, vertical: "lending" | "services") {
    if (!address) {
      setPremiumStatus("Conecte sua carteira antes de contratar.");
      return;
    }
    const pagarmeCustomer = premiumProvider === "pagarme" ? collectPagarmeCustomer(premiumEmail) : null;
    if (premiumProvider === "pagarme" && !pagarmeCustomer) return;
    setPremiumStatus("Criando checkout seguro...");
    const response = await fetch("/api/payments/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider: premiumProvider,
        vertical,
        productCode,
        walletAddress: address,
        email: pagarmeCustomer?.email || premiumEmail || undefined,
        customer: pagarmeCustomer?.customer,
        metadata: {
          referral_code: typeof window !== "undefined" ? localStorage.getItem("instead_referral_code") : null,
          chain_id: chainId,
          health_factor: liveHF,
          risk_label: riskLabel,
          recommendation,
        },
      }),
    });
    const body = await response.json();
    if (response.status === 401) {
      setPremiumStatus("Entre com sua wallet para assinar a sessão antes de contratar.");
      return;
    }
    if (response.status === 403 && body.code === "kyc_required") {
      const kycResponse = await fetch("/api/compliance/verification/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: address,
          email: pagarmeCustomer?.email || premiumEmail || undefined,
          kind: "kyc",
          consent: true,
          metadata: { trigger: "lending_checkout", product_code: productCode, vertical },
        }),
      });
      const kycBody = await kycResponse.json();
      if (kycResponse.ok && kycBody.verification?.url) {
        setPremiumStatus("Verificacao KYC necessaria. Abrindo sessao segura da Didit...");
        window.location.href = kycBody.verification.url;
        return;
      }
    }
    if (!response.ok || !body.url) {
      setPremiumStatus("Não foi possível criar checkout agora.");
      return;
    }
    window.location.href = body.url;
  }

  async function createAutomationIntent(productCode: string) {
    if (!address) {
      setPremiumStatus("Conecte sua carteira antes de criar uma intenção.");
      return;
    }
    setPremiumStatus("Registrando intenção operacional...");
    const response = await fetch("/api/lending/automation-intents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        walletAddress: address,
        sourceCode: productCode,
        chainId,
        riskThreshold: liveHF < 999 ? Math.max(1.15, Number((liveHF - 0.2).toFixed(2))) : 1.4,
        payload: {
          collateral_asset: colAsset,
          borrow_asset: selectedAsset,
          collateral_amount: liveCollateral,
          borrowed_amount: liveBorrow,
        },
        recommendation,
      }),
    });
    const body = await response.json();
    if (response.status === 401) {
      setPremiumStatus("Entre com sua wallet para assinar a sessão antes de criar a intenção.");
      return;
    }
    setPremiumStatus(response.ok ? `Intenção criada: ${body.intent.id}` : "Não foi possível registrar a intenção.");
  }

  return (
    <main style={{ minHeight: "100vh", padding: "40px clamp(16px, 5vw, 24px)" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 40, gap: 16, flexWrap: "wrap" }}>
          <div>
            <Link href="/" style={{ color: "var(--text-muted)", fontSize: 13, textDecoration: "none" }}>← Voltar</Link>
            <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 34, fontWeight: 700, marginTop: 8 }}>
              🏦 <span className="gradient-text">Crédito Descentralizado</span>
            </h1>
            <p style={{ color: "var(--text-muted)", marginTop: 8 }}>
              Acesse liquidez institucional com seus ativos digitais como garantia, sem abrir mão da custódia.
            </p>
          </div>
          <WalletConnectButton />
        </div>
        <SimpleModeNotice title="Credito com garantia, explicado">
          Voce deposita um ativo como garantia e pode tomar outro emprestado. Se o valor da garantia cair demais, a posicao pode ser liquidada automaticamente.
        </SimpleModeNotice>
        <RiskWarning>
          Lending nao e indicado para iniciantes sem simulacao. Antes de tomar emprestado, confira o fator de saude, o limite de liquidacao e quanto voce pode perder.
        </RiskWarning>
        <PlainLanguageGlossary
          items={[
            { term: "Garantia", meaning: "O ativo que voce deixa bloqueado para poder pegar credito." },
            { term: "Liquidacao", meaning: "Venda automatica da garantia quando a posicao fica arriscada demais." },
            { term: "Fator de saude", meaning: "Indicador de seguranca. Quanto maior, mais distante da liquidacao." },
          ]}
        />

        {/* Lending desabilitado — card institucional limpo, sem expor lógica interna */}
        {!isLendingEnabled && (
          <div style={{
            background: "linear-gradient(135deg, rgba(220,255,69,0.05), rgba(85,240,192,0.05))",
            border: "1px solid rgba(220,255,69,0.18)",
            padding: "48px 32px",
            marginBottom: 32,
            display: "grid",
            gap: 14,
            textAlign: "center",
            justifyItems: "center",
          }}>
            <div style={{ fontSize: 40 }}>🔒</div>
            <strong style={{ fontSize: 20, color: "var(--text-primary)" }}>Lending on-chain desativado neste ambiente</strong>
            <p style={{ color: "var(--text-muted)", fontSize: 15, lineHeight: 1.65, maxWidth: 500 }}>
              Configure contratos, rotas e gates de producao antes de liberar operacoes com capital real.
            </p>
            {SUPPORT_EMAIL ? (
              <a
                href={`mailto:${SUPPORT_EMAIL}?subject=Interesse%20em%20Emprestimos`}
                style={{
                  marginTop: 8,
                  padding: "13px 32px",
                  background: "var(--accent-grad)",
                  color: "#000",
                  fontWeight: 700,
                  fontSize: 14,
                  textDecoration: "none",
                }}
              >
                Falar com especialista
              </a>
            ) : null}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))", gap: 24, alignItems: "start" }}>

          {/* Left Column: Action Form */}
          <div className="card" style={{ padding: "clamp(20px, 5vw, 32px)" }}>

            {/* Tabs */}
            <div style={{ display: "flex", gap: 4, background: "var(--bg-surface)", padding: 4, borderRadius: 12, marginBottom: 28 }}>
              {(["deposit", "borrow", "repay"] as Tab[]).map((tBtn) => (
                <button key={tBtn} onClick={() => setTab(tBtn)} style={{
                  flex: 1,
                  background: tab === tBtn ? "var(--accent-grad)" : "transparent",
                  color: tab === tBtn ? "white" : "var(--text-muted)",
                  border: "none", borderRadius: 10, padding: "10px 12px",
                  fontWeight: 600, cursor: "pointer", textTransform: "capitalize", transition: "all 0.15s",
                  fontSize: 13,
                }}>
                  {tBtn === "deposit" ? "Depositar" : tBtn === "borrow" ? "Tomar" : "Repagar"}
                </button>
              ))}
            </div>

            {!isConnected ? (
              <div style={{ textAlign: "center", padding: "32px 0" }}>
                <p style={{ color: "var(--text-muted)", marginBottom: 24, fontSize: 15 }}>
                  Conecte sua carteira para ver valores reais e simular com seus ativos. Nenhuma operação acontece sem uma confirmação separada.
                </p>
                <WalletHelpCard compact />
              </div>
            ) : (
              <>
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
                    {tab === "borrow" ? "Ativo para Tomar Emprestado" : "Ativo"}
                  </label>
                  <select value={selectedAsset} onChange={(e) => setSelectedAsset(e.target.value as `0x${string}`)}>
                    {Object.values(LENDING_ASSETS).map((asset) => (
                      <option key={asset.symbol} value={asset.address}>{asset.symbol}</option>
                    ))}
                  </select>
                </div>

                {tab === "borrow" && (
                  <div style={{ marginBottom: 20 }}>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
                      Colateral Depositado
                    </label>
                    <select value={colAsset} onChange={(e) => setColAsset(e.target.value as `0x${string}`)}>
                      {Object.values(LENDING_ASSETS).map((asset) => (
                        <option key={asset.symbol} value={asset.address}>{asset.symbol}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div style={{ marginBottom: 24 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, gap: 10, flexWrap: "wrap" }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.5 }}>
                      Quantidade
                    </label>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {[25, 50, 75, 100].map((pct) => (
                        <button
                          key={pct}
                          onClick={() => applyPreset(pct)}
                          style={{
                            background: "rgba(255,255,255,0.03)",
                            border: "1px solid var(--border)",
                            borderRadius: 6,
                            padding: "2px 8px",
                            fontSize: 11,
                            fontWeight: 600,
                            color: "var(--text-muted)",
                            cursor: "pointer",
                            transition: "all 0.15s",
                          }}
                        >
                          {pct === 100 ? "MAX" : `${pct}%`}
                        </button>
                      ))}
                    </div>
                  </div>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    min={0}
                    style={{ fontSize: 16, padding: "14px 16px" }}
                  />
                </div>

                {isConfirmed && (
                  <div style={{
                    background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)",
                    borderRadius: 12, padding: 14, marginBottom: 18, fontSize: 14,
                    color: "var(--green)",
                  }}>
                    ✅ Transação confirmada com sucesso!
                  </div>
                )}

                {(error || actionError) && (
                  <div style={{
                    background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
                    borderRadius: 12, padding: 14, marginBottom: 18, fontSize: 13,
                    color: "var(--red)",
                  }}>
                    Não foi possível concluir a operação. Verifique sua conexão e tente novamente.
                  </div>
                )}

                <button
                  className="btn-primary"
                  style={{ width: "100%", padding: "14px 0", fontSize: 16 }}
                  onClick={handleAction}
                  disabled={isPending || !amount || !isLendingEnabled}
                >
                  {!isLendingEnabled
                    ? "Indisponivel neste ambiente"
                    : isPending
                    ? "Aguardando confirmação…"
                    : tab === "deposit"
                    ? "Depositar"
                    : tab === "borrow"
                    ? "Tomar Empréstimo"
                    : "Repagar"}
                </button>
              </>
            )}
          </div>

          {/* Right Column: Live Position Monitor */}
          {isConnected && (
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              <div className="card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "clamp(20px, 5vw, 32px)", gap: 16, flexWrap: "wrap" }}>
                <div>
                  <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
                    Fator de Saúde
                  </h3>
                  <p style={{ color: "var(--text-muted)", fontSize: 13, maxWidth: 200, lineHeight: 1.5 }}>
                    Mantenha seu fator acima de 1.2 para evitar liquidação automática.
                  </p>
                </div>
                <HealthGauge healthFactor={liveHF} size={130} />
              </div>

              <div className="card" style={{ padding: "clamp(20px, 5vw, 28px)" }}>
                <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 16, fontWeight: 700, marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
                  <Shield size={18} /> Sua Posição On-Chain
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, gap: 12, flexWrap: "wrap" }}>
                    <span style={{ color: "var(--text-muted)" }}>Colateral Depositado:</span>
                    <span style={{ fontWeight: 600, color: "white" }}>{liveCollateral.toFixed(4)} WETH</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, gap: 12, flexWrap: "wrap" }}>
                    <span style={{ color: "var(--text-muted)" }}>Dívida Ativa:</span>
                    <span style={{ fontWeight: 600, color: "white" }}>{liveBorrow.toFixed(4)} USDC</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, borderTop: "1px solid var(--border)", paddingTop: 16, gap: 12, flexWrap: "wrap" }}>
                    <span style={{ color: "var(--text-muted)" }}>LTV Atual:</span>
                    <span style={{ fontWeight: 600, color: liveHF < 1.5 ? "var(--red)" : "var(--green)" }}>
                      {liveBorrow > 0 ? ((liveBorrow / (liveCollateral || 1)) * 100).toFixed(1) : "0.0"}%
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, gap: 12, flexWrap: "wrap" }}>
                    <span style={{ color: "var(--text-muted)" }}>Limite de Liquidação:</span>
                    <span style={{ fontWeight: 600, color: "white" }}>80%</span>
                  </div>
                </div>
              </div>

              <div className="card" style={{ padding: "clamp(20px, 5vw, 28px)", display: "grid", gap: 18 }}>
                <div>
                  <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 16, fontWeight: 700, marginBottom: 8 }}>
                    Protection Layer
                  </h3>
                  <p style={{ color: "var(--text-muted)", fontSize: 13, lineHeight: 1.55 }}>
                    Risco atual: <strong style={{ color: liveHF < 1.35 ? "var(--red)" : "var(--accent-1)" }}>{riskLabel}</strong>. {recommendation}
                  </p>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 180px), 1fr))", gap: 10 }}>
                  <input
                    type="email"
                    placeholder="email para recibo e alertas"
                    value={premiumEmail}
                    onChange={(event) => setPremiumEmail(event.target.value)}
                    style={{ fontSize: 13, padding: "10px 12px" }}
                  />
                  <select value={premiumProvider} onChange={(event) => setPremiumProvider(event.target.value as "stripe" | "pagarme")}>
                    <option value="stripe">Stripe</option>
                    <option value="pagarme">Pagar.me</option>
                  </select>
                </div>
                {premiumStatus && <div style={{ color: "var(--text-muted)", fontSize: 13 }}>{premiumStatus}</div>}
              </div>
            </div>
          )}
        </div>

        <section style={{ marginTop: 28, display: "grid", gap: 16 }}>
          <div>
            <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 24, marginBottom: 8 }}>Lending Pro Stack</h2>
            <p style={{ color: "var(--text-muted)", maxWidth: 780, lineHeight: 1.6 }}>
              Recursos extras da Instead para alertas, simulações, redução de risco, estratégias guiadas, rebalanceamento, painel multichain e proteção recorrente.
            </p>
            <SafetyChecklist
              items={[
                "Alertas e automações são apoio operacional; não movimentam fundos sem autorização.",
                "Serviços assistidos são melhores para usuários com pouca experiência.",
                "Use simulação antes de criar intenção ou contratar proteção.",
              ]}
            />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 240px), 1fr))", gap: 14 }}>
            {LENDING_PREMIUM_PRODUCTS.map((product) => (
              <article key={product.sourceCode} className="card" style={{ padding: 18, display: "grid", gap: 12 }}>
                <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) max-content", gap: 12, alignItems: "start" }}>
                  <strong style={{ minWidth: 0 }}>{product.label}</strong>
                  <span style={{ color: "var(--accent-1)", fontWeight: 800, whiteSpace: "nowrap" }}>{formatRevenuePrice(product)}</span>
                </div>
                <p style={{ color: "var(--text-muted)", fontSize: 13, lineHeight: 1.45 }}>{product.notes}</p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: "auto" }}>
                  {product.amountUsdCents && product.vertical !== "token_factory" ? (
                    <button
                      onClick={() => createPremiumCheckout(product.sourceCode, product.vertical === "services" ? "services" : "lending")}
                      style={{ padding: "9px 12px", background: "var(--accent-grad)", color: "#000", border: 0, fontWeight: 800, cursor: "pointer" }}
                    >
                      Contratar
                    </button>
                  ) : null}
                  {product.vertical === "lending" && product.sourceCode !== "lending_pro_subscription" ? (
                    <button
                      onClick={() => createAutomationIntent(product.sourceCode)}
                      style={{ padding: "9px 12px", background: "transparent", color: "var(--text-primary)", border: "1px solid var(--border)", fontWeight: 700, cursor: "pointer" }}
                    >
                      Criar intenção
                    </button>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>

      <AIAssistant
        type="lending"
        contextData={{
          collateral: colAsset === WETH_ADDRESS ? "WETH" : "USDC",
          collateralAmount: liveCollateral,
          borrow: selectedAsset === USDC_ADDRESS ? "USDC" : "WETH",
          borrowAmount: parseFloat(amount || "0"),
          healthFactor: liveHF,
        }}
      />
    </main>
  );
}
