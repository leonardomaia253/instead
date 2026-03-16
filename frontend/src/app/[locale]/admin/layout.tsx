"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAccount } from "wagmi";
import Link from "next/link";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { address, isConnected } = useAccount();
  const router = useRouter();
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    async function checkAdmin() {
      if (!isConnected || !address) {
        setIsAdmin(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("users")
          .select("is_admin")
          .eq("wallet_address", address.toLowerCase())
          .single();

        if (error || !data?.is_admin) {
          setIsAdmin(false);
          return;
        }

        setIsAdmin(true);
      } catch (err) {
        setIsAdmin(false);
      }
    }

    checkAdmin();
  }, [isConnected, address]);

  useEffect(() => {
    if (isAdmin === false && pathname !== "/admin/login") {
      router.push("/admin/login");
    }
  }, [isAdmin, router, pathname]);

  if (isAdmin === null) {
    return (
      <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="loading-spinner" />
      </div>
    );
  }

  // If not admin and not on login page, we'll be redirected anyway, but let's return null to avoid flicker
  if (!isAdmin && pathname !== "/admin/login") {
    return null;
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg-app)" }}>
      {/* Sidebar */}
      <aside style={{
        width: "280px",
        background: "var(--bg-surface)",
        borderRight: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        padding: "32px 20px"
      }}>
        <div style={{ marginBottom: "40px", paddingLeft: "12px" }}>
          <Link href="/" style={{ textDecoration: "none" }}>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 24, fontWeight: 800 }}>
              <span className="gradient-text">Instead</span> Admin
            </div>
          </Link>
        </div>

        <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: "8px" }}>
          <SidebarLink href="/admin" icon="📊" label="Dashboard" active={pathname === "/admin"} />
          <SidebarLink href="/admin/users" icon="👥" label="Users" active={pathname === "/admin/users"} />
          <SidebarLink href="/admin/tokens" icon="🪙" label="Tokens" active={pathname === "/admin/tokens"} />
          <SidebarLink href="/admin/lending" icon="📈" label="Lending" active={pathname === "/admin/lending"} />
          <SidebarLink href="/admin/settings" icon="⚙️" label="Settings" active={pathname === "/admin/settings"} />
        </nav>

        <div style={{ marginTop: "auto", padding: "16px", background: "rgba(255,255,255,0.03)", borderRadius: "12px", border: "1px solid var(--border)" }}>
          <div style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px" }}>CONNECTED AS</div>
          <div style={{ fontSize: "13px", fontWeight: 600, fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis" }}>
            {address}
          </div>
          <button 
            onClick={() => router.push("/login")}
            style={{ 
              marginTop: "12px", 
              width: "100%", 
              padding: "8px", 
              borderRadius: "8px", 
              background: "transparent", 
              border: "1px solid var(--border)",
              color: "var(--text-secondary)",
              fontSize: "13px",
              cursor: "pointer"
            }}
          >
            Switch Account
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, overflowY: "auto" }}>
        {children}
      </main>
    </div>
  );
}

function SidebarLink({ href, icon, label, active }: { href: string, icon: string, label: string, active: boolean }) {
  return (
    <Link href={href} style={{
      display: "flex",
      alignItems: "center",
      gap: "12px",
      padding: "12px 16px",
      borderRadius: "12px",
      textDecoration: "none",
      color: active ? "white" : "var(--text-muted)",
      background: active ? "var(--accent-grad)" : "transparent",
      fontWeight: 600,
      transition: "all 0.2s"
    }}>
      <span>{icon}</span>
      {label}
    </Link>
  );
}
