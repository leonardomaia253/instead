"use client";

import { KeyboardShortcuts } from "@/components/KeyboardShortcuts";
import { Observability } from "@/components/Observability";
import { ToastProvider } from "@/components/Toast";
import { wagmiConfig } from "@/lib/wagmi";
import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Banknote, Coins, Factory, Wallet } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { WagmiProvider } from "wagmi";
import "@rainbow-me/rainbowkit/styles.css";

const onboardingSteps = [
  {
    icon: Wallet,
    title: "Conecte sua Carteira",
    desc: "Use MetaMask, Rainbow ou WalletConnect para se identificar na plataforma.",
  },
  {
    icon: Coins,
    title: "Escolha a Rede",
    desc: "Instead suporta Arbitrum, Polygon, BSC, Base, Optimism e mais.",
  },
  {
    icon: Banknote,
    title: "Lending",
    desc: "Deposite cripto como colateral e tome emprestimos com ate 70% LTV.",
  },
  {
    icon: Factory,
    title: "Token Factory",
    desc: "Crie seu proprio token ERC-20 em minutos, sem codigo, pagando cerca de US$5.",
  },
];

function OnboardingModal({ onDismiss }: { onDismiss: () => void }) {
  const [step, setStep] = useState(0);
  const current = onboardingSteps[step];
  const Icon = current.icon;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        background: "rgba(0,0,0,0.8)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: 20,
          padding: "clamp(22px, 6vw, 36px) clamp(18px, 5vw, 32px)",
          maxWidth: 420,
          width: "100%",
          maxHeight: "calc(100dvh - 32px)",
          overflowY: "auto",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            margin: "0 auto 16px",
            display: "grid",
            placeItems: "center",
            borderRadius: 16,
            color: "var(--accent-1)",
            background: "rgba(196,255,43,0.08)",
            border: "1px solid rgba(196,255,43,0.24)",
          }}
        >
          <Icon size={30} />
        </div>
        <div
          style={{
            fontSize: 12,
            color: "var(--text-muted)",
            marginBottom: 8,
            textTransform: "uppercase",
            letterSpacing: 1,
          }}
        >
          Passo {step + 1} de {onboardingSteps.length}
        </div>
        <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 22, fontWeight: 700, marginBottom: 12 }}>
          {current.title}
        </h2>
        <p style={{ color: "var(--text-muted)", fontSize: 15, lineHeight: 1.65, marginBottom: 28 }}>
          {current.desc}
        </p>

        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 24 }}>
          {onboardingSteps.map((_, index) => (
            <div
              key={index}
              style={{
                width: index === step ? 24 : 8,
                height: 8,
                borderRadius: 999,
                background: index === step ? "var(--accent-1)" : "var(--border)",
                transition: "all 0.3s",
              }}
            />
          ))}
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          {step < onboardingSteps.length - 1 ? (
            <>
              <button className="btn-outline" onClick={onDismiss} style={{ flex: 1 }}>
                Pular
              </button>
              <button className="btn-primary" onClick={() => setStep(step + 1)} style={{ flex: 1 }}>
                Proximo
              </button>
            </>
          ) : (
            <button className="btn-primary" onClick={onDismiss} style={{ width: "100%" }}>
              Comecar a Usar
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
  const pathname = usePathname();

  useEffect(() => {
    if (!["/pt", "/en"].includes(pathname)) return;
    try {
      const dismissed = localStorage.getItem("instead_onboarding_dismissed");
      if (!dismissed) setShowOnboarding(true);
    } catch {
      setShowOnboarding(false);
    }
  }, [pathname]);

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const referralCode = params.get("ref")?.trim().toLowerCase();
      if (!referralCode || !/^[a-z0-9][a-z0-9_-]{2,31}$/.test(referralCode)) return;
      localStorage.setItem("instead_referral_code", referralCode);
      fetch("/api/affiliates/click", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ referralCode, landingPath: window.location.pathname }),
      }).catch(() => undefined);
    } catch {
      // Referral tracking is best-effort and must never block the app.
    }
  }, [pathname]);

  function dismissOnboarding() {
    try {
      localStorage.setItem("instead_onboarding_dismissed", "1");
    } catch {
      // Storage can fail in private or restricted browser contexts.
    }
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
          <Observability />
          <KeyboardShortcuts />
          {children}
          <ToastProvider />
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
