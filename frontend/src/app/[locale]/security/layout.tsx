import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Segurança & Transparência | Instead DeFi',
  description: 'Saiba mais sobre as medidas de segurança, auditorias de smart contracts e transparência on-chain da plataforma Instead.',
  keywords: 'segurança defi, auditoria smart contract, transparência blockchain',
};

export default function SecurityLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
