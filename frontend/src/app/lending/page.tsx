"use client";
import { useState } from "react";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useInsteadLending } from "@/hooks/useInsteadLending";
import Link from "next/link";

// Tokens de exemplo
const USDC_ADDRESS = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831" as `0x${string}`;
const WETH_ADDRESS = "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1" as `0x${string}`;

type Tab = "deposit" | "borrow" | "repay";

export default function LendingPage() {
  const { isConnected } = useAccount();
  const [tab, setTab] = useState<Tab>("deposit");
  const [amount, setAmount] = useState("");
  const [selectedAsset, setSelectedAsset] = useState(USDC_ADDRESS);
  const [colAsset, setColAsset] = useState(WETH_ADDRESS);
  const { deposit, depositCollateral, borrow, repay, isPending, isConfirmed, error } =
    useInsteadLending(selectedAsset);

  function handleAction() {
    if (!amount) return;
    if (tab === "deposit") deposit(selectedAsset, amount);
    else if (tab === "borrow") borrow(selectedAsset, amount);
    else repay(selectedAsset, amount);
  }

  return (
    <main style={{ minHeight: "100vh", padding: "40px 24px" }}>
      {/* Header */}
      <div style={{ maxWidth: 780, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
          <div>
            <Link href="/" style={{ color: "var(--text-muted)", fontSize: 13, textDecoration: "none" }}>← Voltar</Link>
            <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 34, fontWeight: 700, marginTop: 8 }}>
              🏦 <span className="gradient-text">Crypto Lending</span>
            </h1>
            <p style={{ color: "var(--text-muted)", marginTop: 8 }}>
              Deposite colateral e tome empréstimos com LTV de até 70%. Juros calculados dinamicamente.
            </p>
          </div>
          <ConnectButton />
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 8, background: "var(--bg-surface)", padding: 6, borderRadius: 14, marginBottom: 28, width: "fit-content" }}>
          {(["deposit", "borrow", "repay"] as Tab[]).map((t) => (
            <button key={t} onClick={() => setTab(t)} style={{
              background: tab === t ? "var(--accent-grad)" : "transparent",
              color: tab === t ? "white" : "var(--text-muted)",
              border: "none", borderRadius: 10, padding: "10px 24px",
              fontWeight: 600, cursor: "pointer", textTransform: "capitalize", transition: "all 0.15s",
            }}>{t === "deposit" ? "Depositar" : t === "borrow" ? "Tomar Empréstimo" : "Repagar"}</button>
          ))}
        </div>

        {/* Main Card */}
        <div className="card" style={{ maxWidth: 540 }}>
          {!isConnected ? (
            <div style={{ textAlign: "center", padding: "32px 0" }}>
              <p style={{ color: "var(--text-muted)", marginBottom: 24, fontSize: 16 }}>
                Conecte sua carteira para interagir com o protocolo.
              </p>
              <ConnectButton />
            </div>
          ) : (
            <>
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-muted)", marginBottom: 8 }}>
                  {tab === "borrow" ? "Ativo para Tomar Emprestado" : "Ativo"}
                </label>
                <select value={selectedAsset} onChange={(e) => setSelectedAsset(e.target.value as `0x${string}`)}>
                  <option value={USDC_ADDRESS}>USDC</option>
                  <option value={WETH_ADDRESS}>WETH</option>
                </select>
              </div>

              {tab === "borrow" && (
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-muted)", marginBottom: 8 }}>
                    Colateral Depositado
                  </label>
                  <select value={colAsset} onChange={(e) => setColAsset(e.target.value as `0x${string}`)}>
                    <option value={WETH_ADDRESS}>WETH</option>
                    <option value={USDC_ADDRESS}>USDC</option>
                  </select>
                </div>
              )}

              <div style={{ marginBottom: 24 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-muted)", marginBottom: 8 }}>
                  Quantidade
                </label>
                <input
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  min={0}
                />
              </div>

              {/* Info box */}
              {tab === "borrow" && (
                <div style={{
                  background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.2)",
                  borderRadius: 12, padding: 16, marginBottom: 24, fontSize: 13,
                  color: "var(--text-muted)", lineHeight: 1.7,
                }}>
                  ⚠️ O empréstimo máximo é <strong style={{ color: "var(--text-primary)" }}>70% do valor do colateral</strong>. Caso o Health Factor caia abaixo de 80%, sua posição será liquidada.
                </div>
              )}

              {isConfirmed && (
                <div style={{
                  background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)",
                  borderRadius: 12, padding: 14, marginBottom: 18, fontSize: 14,
                  color: "var(--green)",
                }}>
                  ✅ Transação confirmada com sucesso!
                </div>
              )}

              {error && (
                <div style={{
                  background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
                  borderRadius: 12, padding: 14, marginBottom: 18, fontSize: 13,
                  color: "var(--red)",
                }}>
                  ❌ {error.message?.split("\n")[0]}
                </div>
              )}

              <button
                className="btn-primary"
                style={{ width: "100%" }}
                onClick={handleAction}
                disabled={isPending || !amount}
              >
                {isPending ? "Aguardando carteira..." : tab === "deposit"
                  ? "Depositar"
                  : tab === "borrow"
                  ? "Tomar Empréstimo"
                  : "Repagar"}
              </button>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
