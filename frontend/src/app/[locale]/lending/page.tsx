"use client";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useInsteadLending } from "@/hooks/useInsteadLending";
import { Link } from "@/navigation";
import { enqueueReconciliation, insertAudit, upsertLendingPosition, supabase } from "@/lib/supabase";
import { useChainId } from "wagmi";
import { AIAssistant } from "@/components/shared/AIAssistant";
import { useTranslations } from "next-intl";
import { HealthGauge } from "@/components/HealthGauge";
import { CHAIN_META } from "@/lib/wagmi";
import { Shield } from "lucide-react";

const USDC_ADDRESS = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831" as `0x${string}`;
const WETH_ADDRESS = "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1" as `0x${string}`;

type Tab = "deposit" | "borrow" | "repay";

export default function LendingPage() {
  const t = useTranslations("Common");
  const { isConnected, address } = useAccount();
  const chainId = useChainId();
  const [tab, setTab] = useState<Tab>("deposit");
  const [amount, setAmount] = useState("");
  const [selectedAsset, setSelectedAsset] = useState(USDC_ADDRESS);
  const [colAsset, setColAsset] = useState(WETH_ADDRESS);
  const [actionError, setActionError] = useState<string | null>(null);

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
      if (tab === "deposit") deposit(selectedAsset, amount);
      else if (tab === "borrow") approveDelegationAndBorrow(selectedAsset, amount);
      else approveAndRepay(selectedAsset, amount);
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
          <ConnectButton />
        </div>

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
            <strong style={{ fontSize: 20, color: "var(--text-primary)" }}>Empréstimos Inteligentes — Em Breve</strong>
            <p style={{ color: "var(--text-muted)", fontSize: 15, lineHeight: 1.65, maxWidth: 500 }}>
              Nosso módulo de crédito descentralizado está em fase final de validação de segurança.
              Seja notificado assim que abrir para o público.
            </p>
            <a
              href="mailto:contato@instead.finance?subject=Interesse%20em%20Empr%C3%A9stimos"
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
              Quero Acesso Antecipado
            </a>
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
                  Conecte sua carteira para acessar o protocolo.
                </p>
                <ConnectButton />
              </div>
            ) : (
              <>
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
                    {tab === "borrow" ? "Ativo para Tomar Emprestado" : "Ativo"}
                  </label>
                  <select value={selectedAsset} onChange={(e) => setSelectedAsset(e.target.value as `0x${string}`)}>
                    <option value={USDC_ADDRESS}>USDC</option>
                    <option value={WETH_ADDRESS}>WETH</option>
                  </select>
                </div>

                {tab === "borrow" && (
                  <div style={{ marginBottom: 20 }}>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
                      Colateral Depositado
                    </label>
                    <select value={colAsset} onChange={(e) => setColAsset(e.target.value as `0x${string}`)}>
                      <option value={WETH_ADDRESS}>WETH</option>
                      <option value={USDC_ADDRESS}>USDC</option>
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
                    ? "Disponível em Breve"
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
            </div>
          )}
        </div>
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
