"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAccount } from "wagmi";
import { useTranslations } from "next-intl";

export default function AdminDashboard() {
  const t = useTranslations("Common");
  const { address } = useAccount();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalTokens: 0,
    totalLiquidationAlerts: 0,
    activeLendingPositions: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const [
          { count: usersCount },
          { count: tokensCount },
          { count: alertsCount },
          { count: positionsCount }
        ] = await Promise.all([
          supabase.from("users").select("*", { count: "exact", head: true }),
          supabase.from("generated_tokens").select("*", { count: "exact", head: true }),
          supabase.from("liquidation_alerts").select("*", { count: "exact", head: true }),
          supabase.from("lending_positions").select("*", { count: "exact", head: true })
        ]);

        setStats({
          totalUsers: usersCount || 0,
          totalTokens: tokensCount || 0,
          totalLiquidationAlerts: alertsCount || 0,
          activeLendingPositions: positionsCount || 0
        });
      } catch (error) {
        console.error("Error loading admin stats:", error);
      } finally {
        setLoading(false);
      }
    }

    loadStats();
  }, []);

  return (
    <div style={{ padding: "24px" }}>
      <header style={{ marginBottom: "32px" }}>
        <h1 style={{ fontSize: "28px", fontWeight: 700, margin: 0 }}>Admin Dashboard</h1>
        <p style={{ color: "var(--text-muted)", marginTop: "8px" }}>
          Welcome back, Admin. Here's an overview of the Instead platform.
        </p>
      </header>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
        gap: "24px",
        marginBottom: "40px"
      }}>
        <StatCard title="Total Users" value={stats.totalUsers} icon="👥" gradient="linear-gradient(135deg, #6366f1 0%, #a855f7 100%)" />
        <StatCard title="Tokens Created" value={stats.totalTokens} icon="🪙" gradient="linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)" />
        <StatCard title="Liquidation Alerts" value={stats.totalLiquidationAlerts} icon="⚠️" gradient="linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)" />
        <StatCard title="Lending Positions" value={stats.activeLendingPositions} icon="📈" gradient="linear-gradient(135deg, #10b981 0%, #3b82f6 100%)" />
      </div>

      <div className="card" style={{ padding: "24px" }}>
        <h2 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "16px" }}>Recent Activity</h2>
        <div style={{ color: "var(--text-muted)", fontSize: "14px", textAlign: "center", padding: "40px 0" }}>
          Platform audit logs and activity feed will be displayed here in a future update.
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, gradient }: { title: string, value: number, icon: string, gradient: string }) {
  return (
    <div className="card" style={{ padding: "24px", display: "flex", alignItems: "center", gap: "20px" }}>
      <div style={{
        width: "56px",
        height: "56px",
        borderRadius: "16px",
        background: gradient,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "24px",
        color: "white",
        boxShadow: "0 8px 16px -4px rgba(0,0,0,0.2)"
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: "14px", color: "var(--text-muted)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          {title}
        </div>
        <div style={{ fontSize: "28px", fontWeight: 700, marginTop: "4px" }}>
          {value.toLocaleString()}
        </div>
      </div>
    </div>
  );
}
