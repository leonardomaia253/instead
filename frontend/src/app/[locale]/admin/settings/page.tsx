"use client";
import { AdminPage, AdminSection, AdminStatus } from "@/components/ui/Admin";

const settings = [
  ["Production lending", process.env.NEXT_PUBLIC_ENABLE_PRODUCTION_LENDING === "true" ? "Enabled" : "Disabled"],
  ["Lending adapter", process.env.NEXT_PUBLIC_LENDING_POOL_ADDRESS || "Not configured"],
  ["Supabase", process.env.NEXT_PUBLIC_SUPABASE_URL ? "Configured" : "Missing"],
  ["WalletConnect", process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ? "Configured" : "Missing"],
];

export default function AdminSettingsPage() {
  return (
    <AdminPage title="Configuração" description="Estado público das integrações consumidas pelo frontend." width="standard">
      <AdminSection title="Integrações e feature flags">
        {settings.map(([label, value]) => (
          <div key={label} className="admin-setting-row">
            <span>{label}</span>
            <AdminStatus tone={value === "Enabled" || value === "Configured" ? "positive" : value === "Missing" ? "critical" : "neutral"}>{value}</AdminStatus>
          </div>
        ))}
      </AdminSection>
    </AdminPage>
  );
}
