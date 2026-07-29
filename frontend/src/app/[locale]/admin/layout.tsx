"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { BarChart3, CircleDollarSign, Coins, CreditCard, Settings, TrendingUp, Users } from "lucide-react";
import { useAccount } from "wagmi";
import { supabase } from "@/lib/supabase";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { address, isConnected } = useAccount();
  const router = useRouter();
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [isMobileAdmin, setIsMobileAdmin] = useState(false);
  const locale = pathname.split("/")[1] || "en";
  const adminBase = `/${locale}/admin`;
  const adminLoginPath = `${adminBase}/login`;

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

        setIsAdmin(!error && Boolean(data?.is_admin));
      } catch {
        setIsAdmin(false);
      }
    }

    checkAdmin();
  }, [isConnected, address]);

  useEffect(() => {
    const onResize = () => setIsMobileAdmin(window.innerWidth < 900);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (isAdmin === false && pathname !== adminLoginPath) {
      router.push(adminLoginPath);
    }
  }, [adminLoginPath, isAdmin, pathname, router]);

  if (isAdmin === null) {
    return (
      <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="loading-spinner" />
      </div>
    );
  }

  if (!isAdmin && pathname !== adminLoginPath) return null;

  return (
    <div style={{ display: "flex", flexDirection: isMobileAdmin ? "column" : "row", minHeight: "100vh", background: "var(--bg-app)" }}>
      <aside style={{ ...styles.sidebar, ...(isMobileAdmin ? styles.sidebarMobile : {}) }}>
        <div style={styles.brand}>
          <Link href={`/${locale}`} style={{ textDecoration: "none" }}>
            <div style={styles.brandText}>
              <span className="gradient-text">Instead</span> Admin
            </div>
          </Link>
        </div>

        <nav style={{ ...styles.nav, ...(isMobileAdmin ? styles.navMobile : {}) }}>
          <SidebarLink href={adminBase} icon={<BarChart3 size={18} />} label="Dashboard" active={pathname === adminBase} />
          <SidebarLink href={`${adminBase}/users`} icon={<Users size={18} />} label="Users" active={pathname === `${adminBase}/users`} />
          <SidebarLink href={`${adminBase}/tokens`} icon={<Coins size={18} />} label="Tokens" active={pathname === `${adminBase}/tokens`} />
          <SidebarLink href={`${adminBase}/payments`} icon={<CreditCard size={18} />} label="Payments" active={pathname === `${adminBase}/payments`} />
          <SidebarLink href={`${adminBase}/lending`} icon={<CircleDollarSign size={18} />} label="Lending" active={pathname === `${adminBase}/lending`} />
          <SidebarLink href={`${adminBase}/revenue`} icon={<TrendingUp size={18} />} label="Planos" active={pathname === `${adminBase}/revenue`} />
          <SidebarLink href={`${adminBase}/settings`} icon={<Settings size={18} />} label="Settings" active={pathname === `${adminBase}/settings`} />
        </nav>

        <div style={{ ...styles.accountBox, ...(isMobileAdmin ? styles.accountBoxMobile : {}) }}>
          <div style={styles.accountLabel}>CONNECTED AS</div>
          <div style={styles.address}>{address}</div>
          <button onClick={() => router.push(`/${locale}/login`)} style={styles.switchButton}>
            Switch Account
          </button>
        </div>
      </aside>

      <main style={{ flex: 1, minWidth: 0, overflowY: "auto" }}>{children}</main>
    </div>
  );
}

function SidebarLink({ href, icon, label, active }: { href: string; icon: ReactNode; label: string; active: boolean }) {
  return (
    <Link href={href} style={{ ...styles.link, color: active ? "white" : "var(--text-muted)", background: active ? "var(--accent-grad)" : "transparent" }}>
      <span style={styles.icon}>{icon}</span>
      {label}
    </Link>
  );
}

const styles = {
  sidebar: {
    width: 280,
    background: "var(--bg-surface)",
    borderRight: "1px solid var(--border)",
    display: "flex",
    flexDirection: "column" as const,
    padding: "32px 20px",
  },
  sidebarMobile: {
    width: "100%",
    minWidth: 0,
    borderRight: 0,
    borderBottom: "1px solid var(--border)",
    padding: "18px 14px",
  },
  brand: { marginBottom: 40, paddingLeft: 12 },
  brandText: { fontFamily: "'Space Grotesk', sans-serif", fontSize: 24, fontWeight: 800 },
  nav: { flex: 1, display: "flex", flexDirection: "column" as const, gap: 8 },
  navMobile: {
    flex: "0 0 auto",
    flexDirection: "row" as const,
    gap: 8,
    overflowX: "auto" as const,
    paddingBottom: 8,
  },
  link: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "12px 16px",
    borderRadius: 8,
    textDecoration: "none",
    fontWeight: 600,
    transition: "all 0.2s",
  },
  icon: { display: "inline-flex", width: 20 },
  accountBox: {
    marginTop: "auto",
    padding: 16,
    background: "rgba(255,255,255,0.03)",
    borderRadius: 8,
    border: "1px solid var(--border)",
  },
  accountBoxMobile: {
    marginTop: 12,
  },
  accountLabel: { fontSize: 12, color: "var(--text-muted)", marginBottom: 4 },
  address: { fontSize: 13, fontWeight: 600, fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis" },
  switchButton: {
    marginTop: 12,
    width: "100%",
    padding: 8,
    borderRadius: 8,
    background: "transparent",
    border: "1px solid var(--border)",
    color: "var(--text-secondary)",
    fontSize: 13,
    cursor: "pointer",
  },
};
