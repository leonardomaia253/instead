"use client";

import React from "react";
import { Link } from "@/navigation";
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
          <span>INSTEAD / LIQUIDITY INFRASTRUCTURE</span>
          <h2>Capital on-chain com controle verificável.</h2>
          <p>
            Crédito, garantias e execução multichain em uma única camada operacional. Cada posição mantém risco, custódia e histórico visíveis.
          </p>
        </div>

        <div className="proto-footer__columns">
          <FooterColumn title="Produtos">
            <FooterLink href="/lending">Crédito com garantia</FooterLink>
            <FooterLink href="/os">Camada operacional</FooterLink>
            <FooterLink href="/factory">Emissão de ativos</FooterLink>
            <FooterLink href="/solutions">Planos e serviços</FooterLink>
            <FooterLink href="/staking">Staking</FooterLink>
            <FooterLink href="/simulator">Simulador de risco</FooterLink>
            <FooterLink href="/dashboard">Visão patrimonial</FooterLink>
          </FooterColumn>

          <FooterColumn title="Informações">
            <FooterLink href="/docs">Documentação</FooterLink>
            <FooterLink href="/security">Segurança</FooterLink>
            <FooterLink href="/tokens">Registro de ativos</FooterLink>
            <FooterLink href="/legal/terms">Termos</FooterLink>
            <FooterLink href="/legal/privacy">Privacidade</FooterLink>
          </FooterColumn>

          <div className="proto-footer__status">
            <span>STATUS</span>
            <div><ShieldCheck size={16} /> Arquitetura auditável</div>
            <div><Terminal size={16} /> Autenticação segura</div>
            <div><MessageSquare size={16} /> Operação multichain</div>
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
          <span>Sem custódia por princípio</span>
          <span>Construída para operadores independentes</span>
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
