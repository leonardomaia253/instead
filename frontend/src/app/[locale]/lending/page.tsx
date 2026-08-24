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
import { PageHeader, PanelHeader } from "@/components/ui/Institutional";

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
    <main className="product-page lending-page">
      <div className="product-page__container">

        {/* Header */}
        <PageHeader eyebrow="Crédito on-chain" title="Crédito com garantia" description="Deposite uma garantia, acompanhe o fator de saúde e revise o risco antes de confirmar qualquer operação." backHref="/" action={<WalletConnectButton />} />
        <div className="product-guidance">
        <SimpleModeNotice title="Crédito com garantia, explicado">
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
        </div>

        {!isLendingEnabled && (
          <div className="availability-notice">
            <strong>Novas operações estão temporariamente indisponíveis</strong>
            <p>
              No momento, você ainda não pode depositar garantias ou solicitar crédito. Fale com nosso atendimento para tirar dúvidas ou saber quando o acesso estará disponível.
            </p>
            {SUPPORT_EMAIL ? (
              <a
                href={`mailto:${SUPPORT_EMAIL}?subject=Interesse%20em%20Emprestimos`}
                className="btn-primary"
              >
                Falar com especialista
              </a>
            ) : null}
          </div>
        )}

        <div className="lending-workspace">

          {/* Left Column: Action Form */}
          <div className="card lending-operation">

            {/* Tabs */}
            <div className="operation-tabs">
              {(["deposit", "borrow", "repay"] as Tab[]).map((tBtn) => (
                <button key={tBtn} onClick={() => setTab(tBtn)} data-active={tab === tBtn}>
                  {tBtn === "deposit" ? "Depositar" : tBtn === "borrow" ? "Tomar" : "Repagar"}
                </button>
              ))}
            </div>

            {!isConnected ? (
              <div className="operation-connect">
                <p>
                  Conecte sua carteira para ver valores reais e simular com seus ativos. Nenhuma operação acontece sem uma confirmação separada.
                </p>
                <WalletHelpCard compact />
              </div>
            ) : (
              <>
                <div className="operation-field">
                  <label>
                    {tab === "borrow" ? "Ativo para Tomar Emprestado" : "Ativo"}
                  </label>
                  <select value={selectedAsset} onChange={(e) => setSelectedAsset(e.target.value as `0x${string}`)}>
                    {Object.values(LENDING_ASSETS).map((asset) => (
                      <option key={asset.symbol} value={asset.address}>{asset.symbol}</option>
                    ))}
                  </select>
                </div>

                {tab === "borrow" && (
                  <div className="operation-field">
                    <label>
                      Colateral Depositado
                    </label>
                    <select value={colAsset} onChange={(e) => setColAsset(e.target.value as `0x${string}`)}>
                      {Object.values(LENDING_ASSETS).map((asset) => (
                        <option key={asset.symbol} value={asset.address}>{asset.symbol}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="operation-field">
                  <div className="operation-field__header">
                    <label>
                      Quantidade
                    </label>
                    <div className="amount-presets">
                      {[25, 50, 75, 100].map((pct) => (
                        <button
                          key={pct}
                          onClick={() => applyPreset(pct)}
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
                    className="operation-amount"
                  />
                </div>

                {isConfirmed && (
                  <div className="operation-feedback" data-tone="success">
                    Transação confirmada com sucesso.
                  </div>
                )}

                {(error || actionError) && (
                  <div className="operation-feedback" data-tone="error">
                    Não foi possível concluir a operação. Verifique sua conexão e tente novamente.
                  </div>
                )}

                <button
                  className="btn-primary operation-submit"
                  onClick={handleAction}
                  disabled={isPending || !amount || !isLendingEnabled}
                >
                  {!isLendingEnabled
                    ? "Temporariamente indisponível"
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
            <div className="position-stack">
              <div className="card health-card">
                <div>
                  <h3>
                    Fator de Saúde
                  </h3>
                  <p>
                    Mantenha seu fator acima de 1.2 para evitar liquidação automática.
                  </p>
                </div>
                <HealthGauge healthFactor={liveHF} size={130} />
              </div>

              <div className="card position-card">
                <h3>
                  <Shield size={18} /> Sua Posição On-Chain
                </h3>
                <div className="position-data">
                  <div>
                    <span>Colateral depositado</span><strong>{liveCollateral.toFixed(4)} WETH</strong>
                  </div>
                  <div>
                    <span>Dívida ativa</span><strong>{liveBorrow.toFixed(4)} USDC</strong>
                  </div>
                  <div>
                    <span>LTV atual</span>
                    <strong style={{ color: liveHF < 1.5 ? "var(--red)" : "var(--green)" }}>
                      {liveBorrow > 0 ? ((liveBorrow / (liveCollateral || 1)) * 100).toFixed(1) : "0.0"}%
                    </strong>
                  </div>
                  <div>
                    <span>Limite de liquidação</span><strong>80%</strong>
                  </div>
                </div>
              </div>

              <div className="card protection-card">
                <div>
                  <h3>
                    Lending Pro Stack — Proteção da posição
                  </h3>
                  <p>
                    Risco atual: <strong style={{ color: liveHF < 1.35 ? "var(--red)" : "var(--accent-1)" }}>{riskLabel}</strong>. {recommendation}
                  </p>
                </div>
                <div className="protection-card__controls">
                  <input
                    type="email"
                    placeholder="email para recibo e alertas"
                    value={premiumEmail}
                    onChange={(event) => setPremiumEmail(event.target.value)}
                  />
                  <select value={premiumProvider} onChange={(event) => setPremiumProvider(event.target.value as "stripe" | "pagarme")}>
                    <option value="stripe">Stripe</option>
                    <option value="pagarme">Pagar.me</option>
                  </select>
                </div>
                {premiumStatus && <div className="operation-status">{premiumStatus}</div>}
              </div>
            </div>
          )}
        </div>

        <section className="lending-services">
          <div>
            <PanelHeader title="Serviços de proteção e acompanhamento" description="Recursos complementares para alertas, simulações, redução de risco e gestão multichain." />
            <p className="lending-services__intro">
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
          <div className="service-grid">
            {LENDING_PREMIUM_PRODUCTS.map((product) => (
              <article key={product.sourceCode} className="card service-card">
                <div className="service-card__header">
                  <strong>{product.label}</strong><span>{formatRevenuePrice(product)}</span>
                </div>
                <p>{product.notes}</p>
                <div className="service-card__actions">
                  {product.amountUsdCents && product.vertical !== "token_factory" ? (
                    <button
                      onClick={() => createPremiumCheckout(product.sourceCode, product.vertical === "services" ? "services" : "lending")}
                      className="btn-primary"
                    >
                      Contratar
                    </button>
                  ) : null}
                  {product.vertical === "lending" && product.sourceCode !== "lending_pro_subscription" ? (
                    <button
                      onClick={() => createAutomationIntent(product.sourceCode)}
                      className="btn-outline"
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
