"use client";

const settings = [
  ["Production lending", process.env.NEXT_PUBLIC_ENABLE_PRODUCTION_LENDING === "true" ? "Enabled" : "Disabled"],
  ["Lending adapter", process.env.NEXT_PUBLIC_LENDING_POOL_ADDRESS || "Not configured"],
  ["Supabase", process.env.NEXT_PUBLIC_SUPABASE_URL ? "Configured" : "Missing"],
  ["WalletConnect", process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ? "Configured" : "Missing"],
];

export default function AdminSettingsPage() {
  return (
    <main style={{ padding: 32 }}>
      <h1 style={{ margin: 0, fontSize: 32 }}>Settings</h1>
      <p style={{ color: "var(--text-muted)", marginTop: 8 }}>Estado publico de configuracao usado pelo frontend.</p>
      <div className="card" style={{ marginTop: 24, display: "grid", gap: 12 }}>
        {settings.map(([label, value]) => (
          <div key={label} style={{ display: "flex", justifyContent: "space-between", gap: 16, padding: "14px 0", borderBottom: "1px solid var(--border)" }}>
            <span style={{ color: "var(--text-muted)" }}>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
    </main>
  );
}
