"use client";
import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/Toast";
import { ConnectButton } from "@rainbow-me/rainbowkit";

export default function RegisterPage() {
  const { address, isConnected } = useAccount();
  const router = useRouter();
  const toast = useToast();

  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!address) return;
    setLoading(true);

    try {
      const walletLower = address.toLowerCase();
      
      const { error } = await supabase.from("users").upsert({
        wallet_address: walletLower,
        username,
        bio,
      }, { onConflict: 'wallet_address' });

      if (error) throw error;

      toast.success("Perfil criado com sucesso! 🚀");
      router.push("/dashboard");
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao criar perfil.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      padding: "24px", position: "relative", overflow: "hidden",
    }}>
      <div style={{
        position: "absolute", top: "30%", left: "50%", transform: "translate(-50%,-50%)",
        width: 600, height: 400, pointerEvents: "none",
        background: "radial-gradient(ellipse, rgba(124,58,237,0.1) 0%, transparent 70%)",
      }} />

      <div style={{ width: "100%", maxWidth: 480, position: "relative" }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }} className="gradient-text">
            Crie seu Perfil
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: 15 }}>
            Personalize sua experiência no Instead DeFi
          </p>
        </div>

        {!isConnected ? (
          <div className="card" style={{ textAlign: "center", padding: 40 }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>🦊</div>
            <h2 style={{ fontSize: 18, marginBottom: 12 }}>Conecte sua wallet primeiro</h2>
            <p style={{ color: "var(--text-muted)", marginBottom: 24, fontSize: 14 }}>
              Precisamos da sua wallet para vincular seu perfil na rede.
            </p>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <ConnectButton />
            </div>
          </div>
        ) : (
          <div className="card" style={{ padding: 32 }}>
            <form onSubmit={handleRegister} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div>
                <label style={{ display: "block", fontSize: 13, color: "var(--text-muted)", marginBottom: 8, fontWeight: 600 }}>USERNAME</label>
                <input 
                  type="text" 
                  value={username} 
                  onChange={(e) => setUsername(e.target.value)} 
                  placeholder="Seu nome de usuário" 
                  required 
                  minLength={3}
                  maxLength={20}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 13, color: "var(--text-muted)", marginBottom: 8, fontWeight: 600 }}>BIO</label>
                <textarea 
                  value={bio} 
                  onChange={(e) => setBio(e.target.value)} 
                  placeholder="Conte um pouco sobre você..." 
                  style={{ minHeight: 100, resize: 'none' }}
                  maxLength={160}
                />
              </div>
              
              <div style={{
                background: "rgba(255,255,255,0.03)", borderRadius: 12, padding: 16, border: "1px solid var(--border)"
              }}>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>WALLET VINCULADA</div>
                <div style={{ fontSize: 13, fontWeight: 500, fontFamily: "monospace", color: "var(--accent-1)" }}>
                  {address}
                </div>
              </div>

              <button type="submit" className="btn-primary" disabled={loading} style={{ width: "100%", height: 48 }}>
                {loading ? "⏳ Criando Perfil..." : "Finalizar Cadastro 🚀"}
              </button>
            </form>
          </div>
        )}

        <p style={{ textAlign: "center", marginTop: 24, fontSize: 14, color: "var(--text-muted)" }}>
          Já tem conta? <Link href="/login" style={{ color: "var(--accent-1)", fontWeight: 600, textDecoration: "none" }}>Fazer Login</Link>
        </p>
      </div>
    </main>
  );
}
