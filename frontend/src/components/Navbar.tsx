"use client";

import { WalletConnectButton } from "@/components/WalletConnectButton";

import { useEffect, useState } from "react";
import { Link, usePathname } from "@/navigation";
import { Activity, Gauge, Menu, Moon, Sun, Zap, X } from "lucide-react";
import { useSettings } from "@/hooks/useSettings";

const Logo = () => (
  <svg width="38" height="38" viewBox="0 0 38 38" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <rect x="1" y="1" width="36" height="36" fill="#050604" stroke="#dcff45" strokeWidth="2" />
    <path d="M10 8H28V13H22V25H28V30H10V25H16V13H10V8Z" fill="#dcff45" />
    <path d="M6 6L12 6L6 12V6Z" fill="#55f0c0" />
    <path d="M32 32H26L32 26V32Z" fill="#55f0c0" />
  </svg>
);

import { useLocale } from "next-intl";

export function Navbar() {
  const pathname = usePathname();
  const locale = useLocale();
  const targetLocale = locale === "pt" ? "en" : "pt";
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const { disable3D, toggle3D } = useSettings();

  const navLinks = [
    { href: "/lending", label: locale === "en" ? "Lending" : "Lending" },
    { href: "/solutions", label: locale === "en" ? "Plans" : "Planos" },
    { href: "/factory", label: locale === "en" ? "Factory" : "Fábrica" },
    { href: "/tokens", label: locale === "en" ? "Explore" : "Explorar" },
    { href: "/staking", label: locale === "en" ? "Staking" : "Staking" },
    { href: "/simulator", label: locale === "en" ? "Risk" : "Risco" },
    { href: "/dashboard", label: locale === "en" ? "Dashboard" : "Painel" },
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
    <nav className={`proto-nav ${scrolled ? "proto-nav--scrolled" : ""}`}>
      <div className="container proto-nav__inner">
        <Link href="/" className="proto-brand" aria-label="Instead home">
          <Logo />
          <span>
            <strong>Instead</strong>
            <em>Liquidity OS</em>
          </span>
        </Link>

        <div className="proto-nav__links hide-mobile">
          {navLinks.map(({ href, label }) => (
            <Link key={href} href={href} className={pathname === href || pathname.startsWith(`${href}/`) ? "active" : ""}>
              {label}
            </Link>
          ))}
        </div>

        <div className="proto-nav__actions hide-mobile">
          <Link
            href={pathname}
            locale={targetLocale}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              fontSize: 12,
              fontWeight: 700,
              color: "var(--accent-1)",
              textDecoration: "none",
              padding: "6px 10px",
              border: "1px solid var(--border)",
              borderRadius: 6,
              background: "rgba(255,255,255,0.03)",
            }}
            title={`Switch to ${targetLocale === "en" ? "English" : "Português"}`}
          >
            🌐 {targetLocale.toUpperCase()}
          </Link>
          <button onClick={toggle3D} title={disable3D ? "Enable globe" : "Performance mode"} aria-label="Toggle 3D">
            {disable3D ? <Activity size={16} /> : <Gauge size={16} />}
          </button>
          <button onClick={toggleTheme} aria-label="Toggle theme">
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <WalletConnectButton />
        </div>

        <button className="show-mobile proto-menu-button" onClick={() => setOpen((value) => !value)} aria-label="Alternar menu">
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {open && (
        <div className="proto-mobile-menu">
          {navLinks.map(({ href, label }) => (
            <Link key={href} href={href} onClick={() => setOpen(false)} className={pathname === href || pathname.startsWith(`${href}/`) ? "active" : ""}>
              {label}
            </Link>
          ))}
          <div className="proto-mobile-menu__actions">
            <Link
              href={pathname}
              locale={targetLocale}
              onClick={() => setOpen(false)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                fontSize: 13,
                fontWeight: 700,
                color: "var(--accent-1)",
                textDecoration: "none",
                padding: "8px 14px",
                border: "1px solid var(--border)",
                borderRadius: 8,
                background: "rgba(255,255,255,0.03)",
              }}
            >
              🌐 {targetLocale.toUpperCase()}
            </Link>
            <button onClick={toggle3D}><Zap size={16} /> 3D</button>
            <button onClick={toggleTheme}>{theme === "dark" ? <Sun size={16} /> : <Moon size={16} />} Tema</button>
            <WalletConnectButton />
          </div>
        </div>
      )}
    </nav>
  );
}
