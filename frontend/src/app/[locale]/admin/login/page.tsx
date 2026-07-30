"use client";

import { useAccount } from "wagmi";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useSignMessage } from "wagmi";
import { getSupabaseFunctionUrl, setWalletAccessToken } from "@/lib/supabase";
import Link from "next/link";
import { WalletHelpCard } from "@/components/ElderFriendly";

export default function AdminLoginPage() {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const locale = pathname.split("/")[1] || "en";
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const attemptedAddress = useRef<string | null>(null);
  const nextPath = searchParams.get("next") ?? `/${locale}/admin`;

  useEffect(() => {
    async function authenticateAdmin() {
      if (!isConnected || !address || attemptedAddress.current === address) return;

      attemptedAddress.current = address;
      setLoading(true);
      setError(null);

      try {
        const nonceResponse = await fetch(getSupabaseFunctionUrl("siwe-auth"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "nonce", address }),
        });
        const nonceData = await nonceResponse.json();
        if (!nonceResponse.ok) throw new Error(nonceData.error ?? "Could not start admin authentication.");

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
        if (!verifyResponse.ok) throw new Error(sessionData.error ?? "Admin authentication failed.");
        if (!sessionData.user?.is_admin) {
          throw new Error("Access denied. This wallet is not registered as an administrator.");
        }

        await setWalletAccessToken(sessionData.access_token);
        router.push(nextPath.startsWith(`/${locale}/admin`) ? nextPath : `/${locale}/admin`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An unexpected error occurred during admin verification.");
        attemptedAddress.current = null;
      } finally {
        setLoading(false);
      }
    }

    authenticateAdmin();
  }, [address, isConnected, locale, nextPath, router, signMessageAsync]);

  return (
    <main style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      padding: "24px", background: "radial-gradient(circle at top right, #1a1a2e, #0f0f1a)",
    }}>
      <div style={{ width: "100%", maxWidth: 420, textAlign: "center" }}>
        <div style={{ marginBottom: "40px" }}>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 36, fontWeight: 800, marginBottom: 8 }}>
            <span className="gradient-text">Instead</span> Admin
          </div>
          <p style={{ color: "var(--text-muted)" }}>Painel restrito para operadores autorizados</p>
        </div>

        <div className="card" style={{ padding: "40px 32px" }}>
          <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "24px" }}>Autenticacao de administrador</h2>
          
          {error && (
            <div style={{ 
              background: "rgba(239, 68, 68, 0.1)", 
              border: "1px solid rgba(239, 68, 68, 0.2)", 
              color: "#f87171", 
              padding: "12px", 
              borderRadius: "8px", 
              fontSize: "14px", 
              marginBottom: "24px" 
            }}>
              {error}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            <p style={{ color: "var(--text-muted)", fontSize: "14px" }}>
              Esta area nao e para usuarios finais. Conecte apenas uma carteira cadastrada como administradora para acessar operacoes internas.
            </p>

            <div style={{ display: "flex", justifyContent: "center" }}>
              <WalletHelpCard compact />
            </div>

            {loading && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", color: "var(--accent-1)" }}>
                <div className="loading-spinner" style={{ width: "20px", height: "20px" }} />
                <span>Verifying credentials...</span>
              </div>
            )}
          </div>
        </div>

        <div style={{ marginTop: "32px" }}>
          <Link href={`/${locale}`} style={{ color: "var(--text-muted)", fontSize: "14px", textDecoration: "none" }}>
            ← Back to Main Platform
          </Link>
        </div>
      </div>
    </main>
  );
}
