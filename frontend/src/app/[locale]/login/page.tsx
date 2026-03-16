"use client";
import { useState } from "react";
import { useAccount, useSignMessage } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/Toast";

const SIWE_MESSAGE = (address: string, nonce: string) =>
  `instead.finance wants you to sign in with your Ethereum account:\n${address}\n\nSign in to Instead DeFi\n\nNonce: ${nonce}\nIssued At: ${new Date().toISOString()}`;

export default function LoginPage() {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const router = useRouter();
  const toast = useToast();

  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"wallet" | "email">("wallet");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleWalletLogin() {
    if (!address) return;
    setLoading(true);
    try {
      const nonce = Math.random().toString(36).slice(2, 12);
      const message = SIWE_MESSAGE(address, nonce);
      const signature = await signMessageAsync({ message });

      // Chama a edge function SIWE
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/siwe-auth`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message, signature, address }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Auth failed");

      toast.success("Conectado com sucesso! 🎉");
      router.push("/dashboard");
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao conectar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("users")
          .select("is_admin")
          .eq("id", user.id)
          .single();
        
        if (profile?.is_admin) {
          toast.success("Bem-vindo, Administrador! 🎉");
          router.push("/admin");
          return;
        }
      }
      
      toast.success("Login realizado com sucesso! 🎉");
      router.push("/dashboard");
    } catch (e: any) {
      toast.error(e.message ?? "Credenciais inválidas.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      padding: "24px", position: "relative", overflow: "hidden",
    }}>
      {/* BG Glow */}
      <div style={{
        position: "absolute", top: "30%", left: "50%", transform: "translate(-50%,-50%)",
        width: 600, height: 400, pointerEvents: "none",
        background: "radial-gradient(ellipse, rgba(124,58,237,0.12) 0%, transparent 70%)",
      }} />

      <div style={{ width: "100%", maxWidth: 420, position: "relative" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <Link href="/" style={{ textDecoration: "none" }}>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 28, fontWeight: 800, marginBottom: 8 }}>
              <span className="gradient-text">Instead</span>
            </div>
          </Link>
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Entrar na plataforma</h1>
          <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
            Use sua wallet ou email para acessar
          </p>
        </div>

        {/* Mode Toggle */}
        <div style={{
          display: "flex", background: "var(--bg-surface)", borderRadius: 12,
          padding: 4, marginBottom: 24, gap: 4,
        }}>
          {(["wallet", "email"] as const).map((m) => (
            <button key={m} onClick={() => setMode(m)} style={{
              flex: 1, padding: "10px 0", borderRadius: 9, border: "none",
              fontWeight: 600, fontSize: 14, cursor: "pointer",
              background: mode === m ? "var(--accent-grad)" : "transparent",
              color: mode === m ? "white" : "var(--text-muted)",
              transition: "all 0.15s",
            }}>
              {m === "wallet" ? "🦊 Wallet" : "📧 E-mail"}
            </button>
          ))}
        </div>

        <div className="card" style={{ padding: 28 }}>
          {mode === "wallet" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <p style={{ color: "var(--text-muted)", fontSize: 14, lineHeight: 1.65, textAlign: "center" }}>
                Conecte sua wallet Ethereum para assinar uma mensagem de autenticação segura (SIWE).
                <strong style={{ color: "var(--text-primary)" }}> Nenhuma transação é enviada.</strong>
              </p>

              {!isConnected ? (
                <div style={{ display: "flex", justifyContent: "center" }}>
                  <ConnectButton />
                </div>
              ) : (
                <>
                  <div style={{
                    background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.2)",
                    borderRadius: 10, padding: "12px 16px", fontSize: 13, color: "var(--text-muted)",
                    fontFamily: "monospace",
                  }}>
                    {address?.slice(0, 18)}...{address?.slice(-6)}
                  </div>
                  <button
                    className="btn-primary"
                    onClick={handleWalletLogin}
                    disabled={loading}
                    style={{ width: "100%" }}
                  >
                    {loading ? "⏳ Aguardando assinatura..." : "✍️ Assinar e Entrar"}
                  </button>
                </>
              )}

              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
                <span style={{ color: "var(--text-muted)", fontSize: 12 }}>Redes suportadas</span>
                <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
              </div>
              <div style={{ display: "flex", justifyContent: "center", gap: 12, fontSize: 20 }}>
                {["🔵", "🟣", "🟡", "🔷", "🔴", "⟠", "🔺"].map((icon, i) => (
                  <span key={i} title="Rede suportada" style={{ cursor: "default" }}>{icon}</span>
                ))}
              </div>
            </div>
          ) : (
            <form onSubmit={handleEmailLogin} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 13, color: "var(--text-muted)", marginBottom: 8, fontWeight: 500 }}>E-mail</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" required />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 13, color: "var(--text-muted)", marginBottom: 8, fontWeight: 500 }}>Senha</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <Link href="/forgot-password" style={{ fontSize: 13, color: "var(--accent-1)", textDecoration: "none" }}>
                  Esqueceu a senha?
                </Link>
              </div>
              <button type="submit" className="btn-primary" disabled={loading} style={{ width: "100%" }}>
                {loading ? "⏳ Entrando..." : "Entrar"}
              </button>
            </form>
          )}
        </div>

        <p style={{ textAlign: "center", marginTop: 20, fontSize: 14, color: "var(--text-muted)" }}>
          Não tem conta?{" "}
          <Link href="/register" style={{ color: "var(--accent-1)", fontWeight: 600, textDecoration: "none" }}>
            Criar conta
          </Link>
        </p>
      </div>
    </main>
  );
}
