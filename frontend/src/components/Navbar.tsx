"use client";
import { useState, useEffect } from "react";
import { Link, usePathname } from "@/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import { useTranslations } from "next-intl";

const Logo = () => (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
    <path d="M10 6L22 6L22 10L18 10L18 22L22 22L22 26L10 26L10 22L14 22L14 10L10 10L10 6Z" fill="url(#logo_grad)" />
    <defs>
      <linearGradient id="logo_grad" x1="10" y1="6" x2="22" y2="26" gradientUnits="userSpaceOnUse">
        <stop stopColor="#7c3aed" />
        <stop offset="1" stopColor="#2563eb" />
      </linearGradient>
    </defs>
  </svg>
);

export function Navbar() {
  const t = useTranslations("Common");
  const pathname = usePathname();
  const { isConnected } = useAccount();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  const NAV_LINKS = [
    { href: "/lending",   label: t("lending"),   icon: "🏦" },
    { href: "/factory",   label: t("factory"),   icon: "🏭" },
    { href: "/staking",   label: t("staking"),   icon: "💎" },
    { href: "/simulator", label: "Simulador", icon: "🧮" },
    { href: "/dashboard", label: "Dashboard", icon: "📊" },
  ];

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
  }

  return (
    <nav style={{
      position: "sticky", top: 0, zIndex: 1000,
      background: scrolled ? "rgba(8,11,20,0.85)" : "transparent",
      backdropFilter: scrolled ? "blur(12px)" : "none",
      borderBottom: scrolled ? "1px solid var(--border)" : "1px solid transparent",
      transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
      padding: "0 24px",
    }}>
      <div className="container" style={{
        display: "flex", alignItems: "center",
        height: 72, gap: 32,
      }}>
        {/* Logo */}
        <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 12 }}>
          <Logo />
          <span style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 24, fontWeight: 800, letterSpacing: -0.8,
            display: "flex", alignItems: "baseline"
          }}>
            <span className="gradient-text">Instead</span>
            <span style={{ color: "var(--text-muted)", fontSize: 10, marginLeft: 6, fontWeight: 500, letterSpacing: 1.5, textTransform: "uppercase" }}>
              DeFi
            </span>
          </span>
        </Link>

        {/* Desktop Links */}
        <div style={{ display: "flex", gap: 4, flex: 1, alignItems: "center" }} className="hide-mobile">
          {NAV_LINKS.map(({ href, label }) => {
            const active = pathname === href;
            return (
              <Link key={href} href={href} style={{
                padding: "6px 14px", borderRadius: 10, fontSize: 14, fontWeight: active ? 600 : 400,
                color: active ? "var(--text-primary)" : "var(--text-muted)",
                background: active ? "rgba(124,58,237,0.12)" : "transparent",
                textDecoration: "none", transition: "all 0.18s",
                border: active ? "1px solid rgba(124,58,237,0.25)" : "1px solid transparent",
              }}>
                {label}
              </Link>
            );
          })}
        </div>

        {/* Right Side */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginLeft: "auto" }} className="hide-mobile">
          {/* Theme Toggle */}
          <button onClick={toggleTheme} style={{
            background: "var(--bg-card)", border: "1px solid var(--border)",
            borderRadius: 10, width: 36, height: 36, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16,
          }}>
            {theme === "dark" ? "☀️" : "🌙"}
          </button>
          <ConnectButton />
        </div>

        {/* Mobile Hamburger */}
        <button
          onClick={() => setOpen(!open)}
          className="show-mobile"
          style={{
            background: "none", border: "none", cursor: "pointer",
            fontSize: 22, color: "var(--text-primary)", marginLeft: "auto",
          }}
        >
          {open ? "✕" : "☰"}
        </button>
      </div>

      {/* Mobile Menu */}
      {open && (
        <div style={{
          position: "absolute", top: 64, left: 0, right: 0,
          background: "var(--bg-surface)", borderBottom: "1px solid var(--border)",
          padding: "16px 24px", display: "flex", flexDirection: "column", gap: 4,
        }}>
          {NAV_LINKS.map(({ href, label, icon }) => (
            <Link key={href} href={href} onClick={() => setOpen(false)} style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "12px 16px", borderRadius: 10, fontSize: 15, fontWeight: 500,
              color: pathname === href ? "var(--text-primary)" : "var(--text-muted)",
              background: pathname === href ? "rgba(124,58,237,0.1)" : "transparent",
              textDecoration: "none",
            }}>
              <span>{icon}</span><span>{label}</span>
            </Link>
          ))}
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--border)", display: "flex", gap: 10 }}>
            <ConnectButton />
            <button onClick={toggleTheme} style={{
              background: "var(--bg-card)", border: "1px solid var(--border)",
              borderRadius: 10, padding: "8px 12px", cursor: "pointer", fontSize: 16,
            }}>
              {theme === "dark" ? "☀️" : "🌙"}
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
