"use client";

import React from "react";
import Link from "next/link";
import { Github, MessageSquare, ShieldCheck, Terminal, Twitter } from "lucide-react";

const optionalSocialLinks: Array<{ href: string | undefined; label: string; icon: React.ReactNode }> = [
  { href: process.env.NEXT_PUBLIC_COMMUNITY_X_URL || process.env.NEXT_PUBLIC_COMMUNITY_TWITTER_URL, label: "X/Twitter", icon: <Twitter size={18} /> },
  { href: process.env.NEXT_PUBLIC_GITHUB_URL, label: "GitHub", icon: <Github size={18} /> },
];

const socialLinks = optionalSocialLinks.flatMap((link) => link.href ? [{ ...link, href: link.href }] : []);

export function Footer() {
  return (
    <footer className="proto-footer">
      <div className="container proto-footer__inner">
        <div className="proto-footer__manifesto">
          <span>INSTEAD / PROTOCOL FOOTER</span>
          <h2>Interface cripto não precisa parecer banco antigo.</h2>
          <p>
            Lending, tokenização e operação multichain em uma superfície mais honesta: informação densa, controle visível e menos decoração vazia.
          </p>
        </div>

        <div className="proto-footer__columns">
          <FooterColumn title="Protocol">
            <FooterLink href="/lending">Lending Hub</FooterLink>
            <FooterLink href="/os">Instead OS</FooterLink>
            <FooterLink href="/factory">Token Factory</FooterLink>
            <FooterLink href="/solutions">Planos e serviços</FooterLink>
            <FooterLink href="/staking">Staking Vaults</FooterLink>
            <FooterLink href="/simulator">Risk Simulator</FooterLink>
            <FooterLink href="/dashboard">Command Desk</FooterLink>
          </FooterColumn>

          <FooterColumn title="Intel">
            <FooterLink href="/docs">Protocol Docs</FooterLink>
            <FooterLink href="/security">Security Stack</FooterLink>
            <FooterLink href="/tokens">Token Explorer</FooterLink>
            <FooterLink href="/legal/terms">Terms</FooterLink>
            <FooterLink href="/legal/privacy">Privacy</FooterLink>
          </FooterColumn>

          <div className="proto-footer__status">
            <span>STATUS</span>
            <div><ShieldCheck size={16} /> Arquitetura auditavel</div>
            <div><Terminal size={16} /> Autenticação Segura</div>
            <div><MessageSquare size={16} /> Redes Operacionais</div>
            {socialLinks.length > 0 && (
              <div className="proto-footer__social">
                {socialLinks.map((link) => (
                  <a key={link.label} href={link.href} target="_blank" rel="noopener noreferrer" aria-label={link.label}>{link.icon}</a>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="proto-footer__bottom">
          <span>2026 Instead Finance</span>
          <span>Non-custodial by design</span>
          <span>Built for sovereign operators</span>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="proto-footer__column">
      <h3>{title}</h3>
      <ul>{children}</ul>
    </div>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <Link href={href}>{children}</Link>
    </li>
  );
}
