"use client";

import { WalletConnectButton } from "@/components/WalletConnectButton";
import { useState } from "react";
import { useAccount } from "wagmi";
import { useRouter } from "next/navigation";
import { Link } from "@/navigation";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/Toast";

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

      toast.success("Perfil criado com sucesso.");
      router.push("/dashboard");
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao criar perfil.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="register-shell">
      <div className="register-shell__inner">
        <div className="register-shell__header">
          <span>Identidade da conta</span>
          <h1>Crie seu perfil</h1>
          <p>Associe um nome à carteira para usar as áreas privadas da Instead.</p>
        </div>

        {!isConnected ? (
          <div className="card register-shell__card">
            <h2>Conecte sua carteira</h2>
            <p className="register-shell__description">
              Precisamos da sua carteira para vincular seu perfil à conta.
            </p>
            <div className="register-shell__wallet-action">
              <WalletConnectButton />
            </div>
          </div>
        ) : (
          <div className="card register-shell__card">
            <form onSubmit={handleRegister} className="register-form">
              <label>
                <span>Nome de usuário</span>
                <input 
                  type="text" 
                  value={username} 
                  onChange={(e) => setUsername(e.target.value)} 
                  placeholder="Seu nome de usuário" 
                  required 
                  minLength={3}
                  maxLength={20}
                />
              </label>
              <label>
                <span>Apresentação</span>
                <textarea 
                  value={bio} 
                  onChange={(e) => setBio(e.target.value)} 
                  placeholder="Conte um pouco sobre você..." 
                  className="register-form__bio"
                  maxLength={160}
                />
              </label>
              
              <div className="register-form__wallet">
                <span>Carteira vinculada</span>
                <code>
                  {address}
                </code>
              </div>

              <button type="submit" className="btn-primary register-form__submit" disabled={loading}>
                {loading ? "Criando perfil..." : "Finalizar cadastro"}
              </button>
            </form>
          </div>
        )}

        <p className="register-shell__login">
          Já tem conta? <Link href="/login">Entrar</Link>
        </p>
      </div>
    </main>
  );
}
