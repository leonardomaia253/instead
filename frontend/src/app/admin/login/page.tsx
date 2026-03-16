"use client";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

export default function AdminLoginPage() {
  const { address, isConnected } = useAccount();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function checkAdmin() {
      if (isConnected && address) {
        setLoading(true);
        try {
          const { data, error: dbError } = await supabase
            .from("users")
            .select("is_admin")
            .eq("wallet_address", address.toLowerCase())
            .single();

          if (dbError || !data?.is_admin) {
            setError("Access denied. This wallet is not registered as an administrator.");
            setLoading(false);
            return;
          }

          router.push("/admin");
        } catch (err) {
          setError("An unexpected error occurred during admin verification.");
          setLoading(false);
        }
      }
    }

    checkAdmin();
  }, [isConnected, address, router]);

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
          <p style={{ color: "var(--text-muted)" }}>Platform Administration Portal</p>
        </div>

        <div className="card" style={{ padding: "40px 32px" }}>
          <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "24px" }}>Admin Authentication</h2>
          
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
              Please connect your authorized administrator wallet to access the control panel.
            </p>

            <div style={{ display: "flex", justifyContent: "center" }}>
              <ConnectButton />
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
          <Link href="/" style={{ color: "var(--text-muted)", fontSize: "14px", textDecoration: "none" }}>
            ← Back to Main Platform
          </Link>
        </div>
      </div>
    </main>
  );
}
