"use client";

import React from "react";
import Link from "next/link";
import { Github, MessageSquare, ShieldCheck, Terminal, Twitter } from "lucide-react";

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
            <FooterLink href="/factory">Token Factory</FooterLink>
            <FooterLink href="/solutions">Revenue Solutions</FooterLink>
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
            <div><ShieldCheck size={16} /> Protocolo Auditado</div>
            <div><Terminal size={16} /> Autenticação Segura</div>
            <div><MessageSquare size={16} /> Redes Operacionais</div>
            <div className="proto-footer__social">
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" aria-label="Twitter"><Twitter size={18} /></a>
              <a href="https://github.com" target="_blank" rel="noopener noreferrer" aria-label="GitHub"><Github size={18} /></a>
            </div>
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
