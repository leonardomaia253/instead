"use client";

import { wagmiConfig } from "@/lib/wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import { WagmiProvider } from "wagmi";
import { useState, useEffect } from "react";
import { ToastProvider } from "@/components/Toast";
import "@rainbow-me/rainbowkit/styles.css";

function OnboardingModal({ onDismiss }: { onDismiss: () => void }) {
  const steps = [
    { icon: "🦊", title: "Conecte sua Carteira", desc: "Use MetaMask, Rainbow ou WalletConnect para se identificar na plataforma." },
    { icon: "🌐", title: "Escolha a Rede", desc: "Instead suporta Arbitrum, Polygon, BSC, Base, Optimism e mais." },
    { icon: "🏦", title: "Lending", desc: "Deposite cripto como colateral e tome empréstimos com até 70% LTV." },
    { icon: "🏭", title: "Token Factory", desc: "Crie seu próprio token ERC-20 em minutos, sem código, pagando ~$5." },
  ];
  const [step, setStep] = useState(0);
  const current = steps[step];

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 10000,
      background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div style={{
        background: "var(--bg-card)", border: "1px solid var(--border)",
        borderRadius: 20, padding: "36px 32px", maxWidth: 420, width: "90%",
        textAlign: "center",
      }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>{current.icon}</div>
        <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>
          Passo {step + 1} de {steps.length}
        </div>
        <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 22, fontWeight: 700, marginBottom: 12 }}>
          {current.title}
        </h2>
        <p style={{ color: "var(--text-muted)", fontSize: 15, lineHeight: 1.65, marginBottom: 28 }}>
          {current.desc}
        </p>

        {/* Dots */}
        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 24 }}>
          {steps.map((_, i) => (
            <div key={i} style={{
              width: i === step ? 24 : 8, height: 8, borderRadius: 999,
              background: i === step ? "var(--accent-1)" : "var(--border)",
              transition: "all 0.3s",
            }} />
          ))}
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          {step < steps.length - 1 ? (
            <>
              <button className="btn-outline" onClick={onDismiss} style={{ flex: 1 }}>Pular</button>
              <button className="btn-primary" onClick={() => setStep(step + 1)} style={{ flex: 1 }}>Próximo →</button>
            </>
          ) : (
            <button className="btn-primary" onClick={onDismiss} style={{ width: "100%" }}>
              🚀 Começar a Usar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem("instead_onboarding_dismissed");
    if (!dismissed) setShowOnboarding(true);
  }, []);

  function dismissOnboarding() {
    localStorage.setItem("instead_onboarding_dismissed", "1");
    setShowOnboarding(false);
  }

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={darkTheme({
            accentColor: "#7c3aed",
            accentColorForeground: "white",
            borderRadius: "large",
          })}
        >
          {showOnboarding && <OnboardingModal onDismiss={dismissOnboarding} />}
          {children}
          <ToastProvider />
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
