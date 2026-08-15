"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Activity, BarChart3, CircleDollarSign, Coins, CreditCard, Handshake, MessageCircle, Settings, TrendingUp, Users } from "lucide-react";
import { useAccount } from "wagmi";
import { supabase } from "@/lib/supabase";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { address, isConnected } = useAccount();
  const router = useRouter();
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
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
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <Link href={`/${locale}`} style={{ textDecoration: "none" }}>
            <div className="admin-brand__text">
              Instead <span>Operations</span>
            </div>
          </Link>
        </div>

        {isAdmin && <nav className="admin-nav">
          <SidebarLink href={adminBase} icon={<BarChart3 size={18} />} label="Dashboard" active={pathname === adminBase} />
          <SidebarLink href={`${adminBase}/users`} icon={<Users size={18} />} label="Users" active={pathname === `${adminBase}/users`} />
          <SidebarLink href={`${adminBase}/tokens`} icon={<Coins size={18} />} label="Tokens" active={pathname === `${adminBase}/tokens`} />
          <SidebarLink href={`${adminBase}/payments`} icon={<CreditCard size={18} />} label="Payments" active={pathname === `${adminBase}/payments`} />
          <SidebarLink href={`${adminBase}/lending`} icon={<CircleDollarSign size={18} />} label="Lending" active={pathname === `${adminBase}/lending`} />
          <SidebarLink href={`${adminBase}/revenue`} icon={<TrendingUp size={18} />} label="Planos" active={pathname === `${adminBase}/revenue`} />
          <SidebarLink href={`${adminBase}/affiliates`} icon={<Handshake size={18} />} label="Afiliados" active={pathname === `${adminBase}/affiliates`} />
          <SidebarLink href={`${adminBase}/community`} icon={<MessageCircle size={18} />} label="Comunidade" active={pathname === `${adminBase}/community`} />
          <SidebarLink href={`${adminBase}/operations`} icon={<Activity size={18} />} label="Operacao" active={pathname === `${adminBase}/operations`} />
          <SidebarLink href={`${adminBase}/settings`} icon={<Settings size={18} />} label="Settings" active={pathname === `${adminBase}/settings`} />
        </nav>}

        {isAdmin && <div className="admin-account">
          <div className="admin-account__label">Conta operacional</div>
          <div className="admin-account__address">{address}</div>
          <button onClick={() => router.push(`/${locale}/login`)}>
            Trocar conta
          </button>
        </div>}
      </aside>

      <main className="admin-main">{children}</main>
    </div>
  );
}

function SidebarLink({ href, icon, label, active }: { href: string; icon: ReactNode; label: string; active: boolean }) {
  return (
    <Link href={href} className={`admin-nav__link ${active ? "is-active" : ""}`}>
      <span>{icon}</span>
      {label}
    </Link>
  );
}
