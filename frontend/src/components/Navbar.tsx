"use client";

import { WalletConnectButton } from "@/components/WalletConnectButton";
import { BrandMark } from "@/components/BrandMark";

import { useEffect, useState } from "react";
import { Link, usePathname } from "@/navigation";
import { Activity, ChevronDown, Gauge, Menu, Moon, Sun, Zap, X } from "lucide-react";
import { useSettings } from "@/hooks/useSettings";

import { useLocale } from "next-intl";

export function Navbar() {
  const pathname = usePathname();
  const locale = useLocale();
  const targetLocale = locale === "pt" ? "en" : "pt";
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const { disable3D, toggle3D } = useSettings();

  const primaryLinks = [
    { href: "/lending", label: locale === "en" ? "Credit" : "Crédito" },
    { href: "/factory", label: locale === "en" ? "Issuance" : "Emissão" },
    { href: "/dashboard", label: locale === "en" ? "Portfolio" : "Patrimônio" },
    { href: "/solutions", label: locale === "en" ? "Solutions" : "Soluções" },
  ];
  const secondaryLinks = [
    { href: "/tokens", label: locale === "en" ? "Assets" : "Ativos" },
    { href: "/staking", label: "Staking" },
    { href: "/simulator", label: locale === "en" ? "Risk simulator" : "Simulador de risco" },
    { href: "/community", label: locale === "en" ? "Community" : "Comunidade" },
    { href: "/os", label: "Instead OS" },
  ];
  const navLinks = [...primaryLinks, ...secondaryLinks];

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
          <BrandMark decorative />
          <span>
            <strong>Instead</strong>
            <em>Liquidity OS</em>
          </span>
        </Link>

        <div className="proto-nav__links hide-mobile">
          {primaryLinks.map(({ href, label }) => (
            <Link key={href} href={href} className={pathname === href || pathname.startsWith(`${href}/`) ? "active" : ""}>
              {label}
            </Link>
          ))}
          <div className="proto-nav__more">
            <button type="button">
              {locale === "en" ? "More" : "Mais"} <ChevronDown size={14} />
            </button>
            <div className="proto-nav__more-menu">
              {secondaryLinks.map(({ href, label }) => (
                <Link key={href} href={href} className={pathname === href || pathname.startsWith(`${href}/`) ? "active" : ""}>
                  {label}
                </Link>
              ))}
            </div>
          </div>
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
            {targetLocale.toUpperCase()}
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
              {targetLocale.toUpperCase()}
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
