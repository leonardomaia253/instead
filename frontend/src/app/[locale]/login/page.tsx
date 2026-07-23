"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useAccount, useSignMessage } from "wagmi";
import { Link } from "@/navigation";
import { useToast } from "@/components/Toast";
import { assertSupabaseConfigured, getSupabaseFunctionUrl, setWalletAccessToken, supabase } from "@/lib/supabase";

export default function LoginPage() {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const router = useRouter();
  const toast = useToast();
  const params = useParams<{ locale: string }>();
  const locale = params.locale ?? "pt";

  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"wallet" | "email">("wallet");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleWalletLogin() {
    if (!address) return;
    setLoading(true);

    try {
      const nonceResponse = await fetch(getSupabaseFunctionUrl("siwe-auth"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "nonce", address }),
      });
      const nonceData = await nonceResponse.json();
      if (!nonceResponse.ok) throw new Error(nonceData.error ?? "Could not start wallet login");

      const signature = await signMessageAsync({
        account: address,
        message: nonceData.message,
      });

      const verifyResponse = await fetch(getSupabaseFunctionUrl("siwe-auth"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "verify",
          address,
          nonce: nonceData.nonce,
          message: nonceData.message,
          signature,
        }),
      });
      const sessionData = await verifyResponse.json();
      if (!verifyResponse.ok) throw new Error(sessionData.error ?? "Wallet authentication failed");

      setWalletAccessToken(sessionData.access_token);
      toast.success("Conectado com sucesso.");
      router.push(`/${locale}/dashboard`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao conectar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  async function handleEmailLogin(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);

    try {
      assertSupabaseConfigured();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase
          .from("users")
          .select("is_admin")
          .eq("id", user.id)
          .single();

        if (profile?.is_admin) {
          toast.success("Bem-vindo, administrador.");
          router.push(`/${locale}/admin`);
          return;
        }
      }

      toast.success("Login realizado com sucesso.");
      router.push(`/${locale}/dashboard`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Credenciais inválidas.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-panel">
        <div className="auth-header">
          <Link href="/" style={{ textDecoration: "none" }}>
            <div className="auth-brand">
              <span className="gradient-text">Instead</span>
            </div>
          </Link>
          <h1>Entrar na plataforma</h1>
          <p>Use sua wallet ou email para acessar sua conta.</p>
        </div>

        <div className="auth-toggle" role="tablist" aria-label="Modo de login">
          {(["wallet", "email"] as const).map((item) => (
            <button
              key={item}
              type="button"
              role="tab"
              aria-selected={mode === item}
              onClick={() => setMode(item)}
            >
              {item === "wallet" ? "Wallet" : "E-mail"}
            </button>
          ))}
        </div>

        <div className="card auth-card">
          {mode === "wallet" ? (
            <div className="auth-stack">
              <p>
                Conecte sua wallet para assinar uma mensagem SIWE. Nenhuma transação é enviada.
              </p>

              {!isConnected ? (
                <div className="auth-connect">
                  <ConnectButton />
                </div>
              ) : (
                <>
                  <div className="wallet-preview">
                    {address?.slice(0, 18)}...{address?.slice(-6)}
                  </div>
                  <button className="btn-primary" onClick={handleWalletLogin} disabled={loading}>
                    {loading ? "Aguardando assinatura..." : "Assinar e entrar"}
                  </button>
                </>
              )}
            </div>
          ) : (
            <form onSubmit={handleEmailLogin} className="auth-stack">
              <label>
                E-mail
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="seu@email.com"
                  required
                />
              </label>
              <label>
                Senha
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••"
                  required
                />
              </label>
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? "Entrando..." : "Entrar"}
              </button>
            </form>
          )}
        </div>

        <p className="auth-footer">
          Não tem conta? <Link href="/register">Criar conta</Link>
        </p>
      </section>
    </main>
  );
}
